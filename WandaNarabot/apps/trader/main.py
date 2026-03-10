import asyncio
import logging
import time
from datetime import datetime, date
from sqlalchemy import select, func
from libs.common.config import settings
from libs.common.database import AsyncSessionLocal, engine, Base
from libs.binance_connector.client import BinanceClient
from libs.hmm_client.client import HMMClient
from libs.strategy_runtime.engine import StrategyEngine
from libs.common.models import BotState, Position, HMMDecision, Order, EquityTick, TradeLog, BotSession

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TraderBot:
    def __init__(self):
        # Pick the correct key pair for the configured market type
        api_key, api_secret = settings.get_api_keys(settings.BINANCE_MARKET_TYPE)

        self.binance = BinanceClient(
            api_key=api_key or "dummy",
            api_secret=api_secret or "dummy",
            env=settings.BINANCE_ENV,
            market_type=settings.BINANCE_MARKET_TYPE
        )
        self.hmm = HMMClient()
        self.engine = StrategyEngine(market_type=settings.BINANCE_MARKET_TYPE)
        # Tracks which UTC date we last saved a daily snapshot for (indefinite mode)
        self._last_daily_snapshot_date: date | None = None

    async def _save_daily_snapshot(self, snap_date: date) -> None:
        """Persist a daily performance record for the given UTC date."""
        day_start = datetime(snap_date.year, snap_date.month, snap_date.day, 0, 0, 0)
        day_end   = datetime(snap_date.year, snap_date.month, snap_date.day, 23, 59, 59)

        async with AsyncSessionLocal() as sess:
            # Avoid duplicate snapshots for the same day
            dup = await sess.execute(
                select(BotSession).where(
                    BotSession.start_time >= day_start,
                    BotSession.start_time <= day_end,
                    BotSession.session_type == 'daily',
                )
            )
            if dup.scalar_one_or_none():
                return

            first_res = await sess.execute(
                select(EquityTick)
                .where(EquityTick.timestamp >= day_start, EquityTick.timestamp <= day_end)
                .order_by(EquityTick.timestamp.asc()).limit(1)
            )
            last_res = await sess.execute(
                select(EquityTick)
                .where(EquityTick.timestamp >= day_start, EquityTick.timestamp <= day_end)
                .order_by(EquityTick.timestamp.desc()).limit(1)
            )
            first_tick = first_res.scalar_one_or_none()
            last_tick  = last_res.scalar_one_or_none()

            if not first_tick or not last_tick:
                logger.info(f"No equity data for {snap_date} — skipping daily snapshot.")
                return

            initial    = first_tick.total_balance
            final      = last_tick.total_balance
            profit_pct = round(((final - initial) / initial * 100) if initial > 0 else 0.0, 4)

            snap = BotSession(
                start_time=day_start,
                end_time=day_end,
                duration_hours=24,
                initial_capital=initial,
                final_capital=final,
                profit_pct=profit_pct,
                session_type='daily',
            )
            sess.add(snap)
            await sess.commit()
            logger.info(f"Daily snapshot saved: {snap_date} | {initial:.2f} → {final:.2f} ({profit_pct:+.2f}%)")

    async def get_active_symbols(self):
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(BotState).limit(1))
            state = result.scalar_one_or_none()
            if state and state.is_running and state.active_symbols:
                return state.active_symbols.split(",")
        return []

    async def run(self):
        logger.info(f"Starting Trader Bot in {settings.BINANCE_ENV} / {settings.BINANCE_MARKET_TYPE}")
        # Initialize DB models
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
        try:
            await self.binance.exchange.load_time_difference()
            logger.info("Syncing local time offset with Binance...")
        except Exception as e:
            logger.warning(f"Could not sync time with Binance: {e}")
            
        while True:
            try:
                # ── STEP 1: Handle close_positions_on_stop ──────────────────────
                async with AsyncSessionLocal() as session:
                    state_res = await session.execute(select(BotState).limit(1))
                    st = state_res.scalar_one_or_none()

                    if st and not st.is_running and st.close_positions_on_stop:
                        logger.info("Bot stopped with close_positions_on_stop=True. Closing all active positions.")
                        pos_list_res = await session.execute(select(Position))
                        active_positions = pos_list_res.scalars().all()
                        closed_count = 0

                        for pos in active_positions:
                            try:
                                logger.info(f"Closing position for {pos.symbol} (Amount: {pos.amount})")
                                side = "sell" if pos.amount > 0 else "buy"
                                await self.binance.create_market_order(pos.symbol, side, abs(pos.amount))

                                ticker = await self.binance.fetch_ticker(pos.symbol)
                                price = ticker.get("last")
                                realized_pnl = 0.0
                                if price:
                                    realized_pnl = (price - pos.entry_price) * abs(pos.amount) if pos.amount > 0 else (pos.entry_price - price) * abs(pos.amount)

                                trade_log = TradeLog(symbol=pos.symbol, action=f"CLOSE_{'LONG' if pos.amount > 0 else 'SHORT'}", amount=abs(pos.amount), price=price, realized_pnl=realized_pnl)
                                session.add(trade_log)
                                await session.delete(pos)
                                closed_count += 1
                                logger.info(f"Closed {pos.symbol} — realized PnL: {realized_pnl:.4f}")
                            except Exception as e:
                                err_str = str(e).lower()
                                logger.error(f"Failed to close position for {pos.symbol}: {e}")
                                stale_indicators = [
                                    "insufficient balance", "no position", "does not exist",
                                    "position does not exist", "reduceonly", "order would immediately trigger",
                                ]
                                if any(indicator in err_str for indicator in stale_indicators):
                                    logger.warning(f"Stale position detected for {pos.symbol} — removing from DB.")
                                    await session.delete(pos)
                                    closed_count += 1

                        remaining_res = await session.execute(select(func.count()).select_from(Position))
                        remaining_count = remaining_res.scalar() or 0
                        if remaining_count == 0:
                            st.close_positions_on_stop = False
                            logger.info(f"All {closed_count} position(s) closed. Flag reset.")
                        else:
                            logger.warning(f"{remaining_count} position(s) still open — will retry next cycle.")
                        await session.commit()

                # ── STEP 2: Decide if we need to continue (active symbols or open positions) ──
                symbols = await self.get_active_symbols()

                # Count DB positions to decide if we need to keep monitoring even when stopped
                async with AsyncSessionLocal() as count_sess:
                    count_res = await count_sess.execute(select(func.count()).select_from(Position))
                    db_position_count = count_res.scalar() or 0

                if not symbols and db_position_count == 0:
                    # Bot is stopped and no open positions — just sleep
                    await asyncio.sleep(5)
                    continue

                # ── STEP 3: Fetch balance (needed for equity tracking) ──────────
                balance = await self.binance.get_balance()
                total_usdt = 0.0
                available_usdt = 0.0
                try:
                    info = balance.get('info', {})
                    STABLECOINS = {'USDT', 'USDC', 'BUSD', 'TUSD', 'DAI', 'FDUSD', 'USDP'}

                    # Priority 1: Binance USDT-M Futures top-level totals (most reliable for futures)
                    if 'totalWalletBalance' in info:
                        total_usdt = float(info['totalWalletBalance'])
                        available_usdt = float(info.get('availableBalance', total_usdt))
                        logger.info(f"Balance [futures/totalWalletBalance]: total={total_usdt:.4f}, available={available_usdt:.4f}")

                    # Priority 2: Futures assets array (sum all assets in USDT equivalent)
                    elif 'assets' in info:
                        for a in info['assets']:
                            wb = float(a.get('walletBalance', 0))
                            if wb != 0:
                                total_usdt += wb  # futures assets are already in USDT equivalent
                        usdt_asset = next((a for a in info['assets'] if a['asset'] == 'USDT'), None)
                        available_usdt = float(usdt_asset.get('availableBalance', total_usdt)) if usdt_asset else total_usdt
                        logger.info(f"Balance [futures/assets]: total={total_usdt:.4f}, available={available_usdt:.4f}")

                    # Priority 3: Spot balances array — sum ALL assets converted to USDT
                    elif 'balances' in info:
                        # Collect non-zero non-stablecoin assets to fetch prices for
                        assets_to_price = []
                        usdt_total = 0.0
                        usdt_free = 0.0
                        spot_balances = {}
                        for b in info['balances']:
                            free_b = float(b.get('free', 0.0))
                            locked_b = float(b.get('locked', 0.0))
                            amt = free_b + locked_b
                            if amt <= 1e-9:
                                continue
                            asset = b['asset']
                            spot_balances[asset] = {'amount': amt, 'free': free_b}
                            if asset in STABLECOINS:
                                usdt_total += amt
                                usdt_free += free_b
                            else:
                                assets_to_price.append(asset)

                        # Fetch prices for non-stablecoin assets
                        if assets_to_price:
                            try:
                                symbols_to_fetch = [f"{a}/USDT" for a in assets_to_price]
                                tickers = await self.binance.exchange.fetch_tickers(symbols_to_fetch)
                                for a in assets_to_price:
                                    sym = f"{a}/USDT"
                                    t = tickers.get(sym)
                                    if t and t.get('last'):
                                        usdt_total += spot_balances[a]['amount'] * float(t['last'])
                            except Exception as price_err:
                                logger.warning(f"Could not fetch prices for spot assets: {price_err}")
                                # Fallback: at minimum count stablecoin value
                                pass

                        total_usdt = usdt_total
                        available_usdt = usdt_free
                        logger.info(f"Balance [spot/balances]: total_usdt={total_usdt:.4f}, stable_free={available_usdt:.4f}, assets={list(spot_balances.keys())}")

                    # Fallback: ccxt normalized keys
                    if total_usdt == 0:
                        if 'USDT' in balance:
                            total_usdt = float(balance['USDT'].get('total', 0.0))
                            available_usdt = float(balance['USDT'].get('free', 0.0))
                        elif 'total' in balance:
                            total_usdt = float(balance['total'].get('USDT', 0.0))
                            available_usdt = float(balance.get('free', {}).get('USDT', 0.0))
                        logger.info(f"Balance [ccxt fallback]: total={total_usdt:.4f}, available={available_usdt:.4f}")

                    if total_usdt == 0:
                        logger.warning(f"Balance parsed as 0. info keys={list(info.keys())} balance keys={list(balance.keys())}")
                except Exception as e:
                    logger.error(f"Error parsing balance: {e}")

                async with AsyncSessionLocal() as session:
                    state_res = await session.execute(select(BotState).limit(1))
                    st = state_res.scalar_one_or_none()
                    active_leverage = (st.leverage if st and st.leverage else None) or settings.TRADE_LEVERAGE

                    # Auto-stop when session duration has elapsed
                    if st and st.is_running and st.run_duration_hours and st.run_duration_hours > 0 and st.start_time:
                        start_naive = st.start_time.replace(tzinfo=None) if st.start_time.tzinfo else st.start_time
                        elapsed_hours = (datetime.utcnow() - start_naive).total_seconds() / 3600
                        if elapsed_hours >= st.run_duration_hours:
                            logger.info(f"Session duration ({st.run_duration_hours}h) elapsed. Auto-stopping and closing all positions.")
                            st.is_running = False
                            st.close_positions_on_stop = True
                            await session.commit()
                            continue

                    # ── STEP 4: Compute unrealized PnL FIRST ─────────────────────
                    pos_list_res = await session.execute(select(Position))
                    active_positions = pos_list_res.scalars().all()
                    active_position_symbols = [p.symbol for p in active_positions]

                    total_exposure_usdt = 0.0
                    total_unrealized_pnl = 0.0

                    if active_position_symbols:
                        try:
                            # Convert to ccxt format (e.g. BTC/USDT → BTC/USDT:USDT for futures)
                            ccxt_syms = [self.binance._to_ccxt_symbol(s) for s in active_position_symbols]
                            tickers = await self.binance.exchange.fetch_tickers(ccxt_syms)
                            for p in active_positions:
                                total_exposure_usdt += abs(p.amount * p.entry_price)
                                sym_ticker = tickers.get(self.binance._to_ccxt_symbol(p.symbol))
                                if sym_ticker and sym_ticker.get('last'):
                                    current_price = sym_ticker['last']
                                    if p.amount > 0:
                                        p.unrealized_pnl = (current_price - p.entry_price) * abs(p.amount)
                                    else:
                                        p.unrealized_pnl = (p.entry_price - current_price) * abs(p.amount)
                                    total_unrealized_pnl += p.unrealized_pnl

                                    # Emergency SL: close position if SL breached (even when bot stopped)
                                    if p.stop_loss:
                                        sl_hit = (p.amount > 0 and current_price <= p.stop_loss) or \
                                                 (p.amount < 0 and current_price >= p.stop_loss)
                                        if sl_hit:
                                            logger.warning(f"SL emergency: {p.symbol} price={current_price} breached SL={p.stop_loss}. Closing.")
                                            try:
                                                close_side = "sell" if p.amount > 0 else "buy"
                                                await self.binance.create_market_order(p.symbol, close_side, abs(p.amount))
                                                realized = p.unrealized_pnl
                                                tl = TradeLog(symbol=p.symbol, action=f"CLOSE_{'LONG' if p.amount > 0 else 'SHORT'}_SL",
                                                              amount=abs(p.amount), price=current_price, realized_pnl=realized)
                                                session.add(tl)
                                                await session.delete(p)
                                                active_position_symbols.remove(p.symbol)
                                                logger.info(f"SL emergency close done for {p.symbol} PnL={realized:.4f}")
                                            except Exception as sl_err:
                                                logger.error(f"SL emergency close failed for {p.symbol}: {sl_err}")
                        except Exception as e:
                            logger.error(f"Error updating unrealized PnL: {e}")

                    # ── STEP 5: True equity = wallet + unrealized ─────────────────
                    true_equity = total_usdt + total_unrealized_pnl

                    # Save equity tick (always — even when bot is stopped, if positions exist)
                    eq_tick = EquityTick(
                        total_balance=true_equity,
                        available_balance=available_usdt,
                        unrealized_pnl=total_unrealized_pnl
                    )
                    session.add(eq_tick)

                    # ── STEP 6: Drawdown check using TRUE equity (FIXED) ──────────
                    # Only check when bot is actively running
                    if st and st.is_running:
                        max_eq_query = select(func.max(EquityTick.total_balance))
                        if st.start_time:
                            max_eq_query = max_eq_query.where(EquityTick.timestamp >= st.start_time)
                        max_eq_res = await session.execute(max_eq_query)
                        max_equity = max_eq_res.scalar() or true_equity

                        # ── Emergency drawdown stop ───────────────────────────────
                        if max_equity > 0:
                            drawdown = (max_equity - true_equity) / max_equity
                            if drawdown > 0.10:
                                logger.warning(f"EMERGENCY STOP — Drawdown {drawdown*100:.2f}% > 10%. Closing all positions.")
                                st.is_running = False
                                st.close_positions_on_stop = True
                                await session.commit()
                                continue

                        # ── Portfolio take profit (realized/wallet gains only) ────
                        # We compare WALLET balance (total_usdt, no unrealized) so
                        # that high-leverage unrealized swings never trigger a premature TP.
                        init_tick_q = select(EquityTick).order_by(EquityTick.timestamp.asc()).limit(1)
                        if st.start_time:
                            init_tick_q = select(EquityTick).where(
                                EquityTick.timestamp >= st.start_time
                            ).order_by(EquityTick.timestamp.asc()).limit(1)
                        init_tick_res = await session.execute(init_tick_q)
                        init_tick = init_tick_res.scalar_one_or_none()
                        if init_tick:
                            # Wallet at session start = first tick's balance minus its unrealized PnL
                            session_start_wallet = init_tick.total_balance - (init_tick.unrealized_pnl or 0.0)
                            if session_start_wallet > 0:
                                wallet_gain_pct = (total_usdt - session_start_wallet) / session_start_wallet
                                tp_threshold = settings.PORTFOLIO_TAKE_PROFIT_PCT
                                if tp_threshold > 0 and wallet_gain_pct >= tp_threshold:
                                    logger.info(
                                        f"PORTFOLIO TAKE PROFIT — Wallet gain {wallet_gain_pct*100:.2f}% "
                                        f">= {tp_threshold*100:.0f}%. Closing all positions."
                                    )
                                    st.is_running = False
                                    st.close_positions_on_stop = True
                                    await session.commit()
                                    continue

                    await session.commit()

                # ── STEP 6b: Daily snapshot for indefinite sessions ───────────
                # When duration_hours == 0 (run forever), save a daily record
                # each time the UTC date rolls over to a new day.
                if st and st.is_running and (st.run_duration_hours or 0) == 0:
                    today_utc = datetime.utcnow().date()
                    if self._last_daily_snapshot_date is None:
                        self._last_daily_snapshot_date = today_utc
                    elif today_utc > self._last_daily_snapshot_date:
                        await self._save_daily_snapshot(self._last_daily_snapshot_date)
                        self._last_daily_snapshot_date = today_utc

                # ── STEP 7: Skip trading loop if bot is stopped ───────────────
                if not symbols:
                    await asyncio.sleep(5)
                    continue

                for symbol in symbols:
                    calc_start = time.time()
                    rec = await self.hmm.get_recommendation(symbol)
                    current_state = rec.get('state', {})
                    recommendation_data = rec.get('recommendation', {})
                    
                    regime = current_state.get('label', 'UNKNOWN')
                    confidence = current_state.get('confidence', 0.0)
                    strategy = recommendation_data.get('strategy', f"Trade_{regime}")
                    logger.info(f"Symbol {symbol} processed. Regime: {regime}, Strategy: {strategy}")
                        
                    # Fetch current position from DB to evaluate
                    async with AsyncSessionLocal() as read_session:
                        pos_res = await read_session.execute(select(Position).where(Position.symbol == symbol).limit(1))
                        current_position = pos_res.scalar_one_or_none()
                        if current_position:
                            read_session.expunge(current_position)


                    df = await self.binance.fetch_ohlcv_df(symbol, "15m", 200)

                    action = self.engine.evaluate(rec, current_position, df)
                    logger.info(f"Engine decided action: {action['action']} for {symbol}. Reason: {action.get('reason')}")

                    # Max concurrent trades & Max Margin Exposure (margin-based, not notional)
                    if action['action'] in ["OPEN_LONG", "OPEN_SHORT"]:
                        margin_used = total_exposure_usdt / active_leverage if active_leverage > 0 else total_exposure_usdt
                        if symbol not in active_position_symbols and len(active_position_symbols) >= settings.MAX_CONCURRENT_TRADES:
                            logger.info(f"Max concurrent trades ({settings.MAX_CONCURRENT_TRADES}) reached. Skipping {symbol}.")
                            action['action'] = "HOLD"
                        elif total_usdt > 0 and (margin_used / total_usdt) > settings.MAX_MARGIN_EXPOSURE_PCT:
                            logger.info(f"Max margin exposure ({settings.MAX_MARGIN_EXPOSURE_PCT*100:.0f}%) reached. Skipping {symbol}.")
                            action['action'] = "HOLD"

                    # Multi-Timeframe Confirmation
                    if action['action'] in ["OPEN_LONG", "OPEN_SHORT", "REVERSE_TO_LONG", "REVERSE_TO_SHORT"]:
                        tfs = ["4h", "1h", "15m"]
                        biases = set()
                        for tf in tfs:
                            tf_rec = await self.hmm.get_recommendation(symbol, timeframe=tf)
                            biases.add(tf_rec.get('recommendation', {}).get('action_bias', 'HOLD'))
                            
                        required_bias = "LONG" if "LONG" in action['action'] else "SHORT"
                        if len(biases) > 1 or required_bias not in biases:
                            logger.info(f"Symbol {symbol} skipping OPEN/REVERSE. MTF {tfs} mismatch/not {required_bias}: {biases}")
                            if action['action'].startswith("REVERSE_TO_"):
                                # Fallback to closing the old position without reversing
                                action['action'] = action['action'].replace("REVERSE_TO_", "CLOSE_")
                            else:
                                action['action'] = "HOLD"

                    # Execute actions Based on Engine
                    try:
                        ticker = await self.binance.fetch_ticker(symbol)
                        price = ticker.get('last')
                            
                        # Check TP / SL hits first
                        if current_position and price:
                            is_long = current_position.amount > 0
                            is_short = current_position.amount < 0
                            hit_tp = (is_long and current_position.take_profit and price >= current_position.take_profit) or \
                                     (is_short and current_position.take_profit and price <= current_position.take_profit)
                            hit_sl = (is_long and current_position.stop_loss and price <= current_position.stop_loss) or \
                                     (is_short and current_position.stop_loss and price >= current_position.stop_loss)
                                         
                            if hit_tp or hit_sl:
                                logger.warning(f"{'TP' if hit_tp else 'SL'} Hit for {symbol} at {price}. Closing position.")
                                action['action'] = "CLOSE_LONG" if is_long else "CLOSE_SHORT"
                                    
                        if action['action'] in ["OPEN_LONG", "OPEN_SHORT", "CLOSE_LONG", "CLOSE_SHORT", "REVERSE_TO_LONG", "REVERSE_TO_SHORT"]:
                            if price and total_usdt > 0:
                                risk = settings.TRADE_ALLOCATION_PCT
                                target_amount = ((total_usdt * risk) * active_leverage) / price
                                    
                                trade_amount = round(target_amount, 3) 
                                    
                                side = "buy" if "LONG" in action['action'] else "sell"
                                if action['action'] in ["CLOSE_LONG", "CLOSE_SHORT"]:
                                    side = "sell" if action['action'] == "CLOSE_LONG" else "buy"
                                    trade_amount = abs(current_position.amount) if current_position else 0.0

                                if trade_amount > 0:
                                    logger.info(f"Attempting {side} {trade_amount} {symbol} based on Action {action['action']} with {active_leverage}x leverage")
                                    if settings.BINANCE_MARKET_TYPE == 'futures' and action['action'] in ["OPEN_LONG", "OPEN_SHORT", "REVERSE_TO_LONG", "REVERSE_TO_SHORT"]:
                                        try:
                                            ccxt_sym = self.binance._to_ccxt_symbol(symbol)
                                            await self.binance.exchange.set_leverage(active_leverage, ccxt_sym)
                                        except Exception as leverage_err:
                                            logger.warning(f"Could not set leverage for {symbol}: {leverage_err}")
                                                
                                    await self.binance.create_market_order(symbol, side, trade_amount)
                                        
                                    realized_pnl = 0.0
                                    if current_position:
                                        if action['action'] in ["CLOSE_LONG", "REVERSE_TO_SHORT"] and current_position.amount > 0:
                                            realized_pnl = (price - current_position.entry_price) * abs(current_position.amount)
                                        elif action['action'] in ["CLOSE_SHORT", "REVERSE_TO_LONG"] and current_position.amount < 0:
                                            realized_pnl = (current_position.entry_price - price) * abs(current_position.amount)

                                    # Update Local DB Position
                                    async with AsyncSessionLocal() as trade_session:
                                        if not current_position: # new position
                                            current_position = Position(symbol=symbol, amount=0.0, entry_price=price, unrealized_pnl=0.0, leverage=active_leverage)
                                            trade_session.add(current_position)
                                        else:
                                            # Fetch fresh to attach to this session
                                            fresh_pos = await trade_session.execute(select(Position).where(Position.id == current_position.id))
                                            current_position = fresh_pos.scalar_one()
                                                
                                        if side == "buy": current_position.amount += trade_amount
                                        else: current_position.amount -= trade_amount
                                                
                                        # Set TP/SL if provided by action
                                        if action.get("tp"): current_position.take_profit = float(action["tp"])
                                        if action.get("sl"): current_position.stop_loss = float(action["sl"])
                                                
                                        # Cleanup close positions
                                        if abs(current_position.amount) < 0.001:
                                            await trade_session.delete(current_position)
                                            if symbol in active_position_symbols:
                                                active_position_symbols.remove(symbol)
                                        elif action['action'] in ["OPEN_LONG", "OPEN_SHORT"]:
                                            # Track newly opened positions in the in-memory list
                                            # so the concurrent limit works within the same cycle
                                            if symbol not in active_position_symbols:
                                                active_position_symbols.append(symbol)

                                        trade_log = TradeLog(symbol=symbol, action=action['action'], amount=trade_amount, price=price, realized_pnl=realized_pnl)
                                        trade_session.add(trade_log)
                                        await trade_session.commit()
                                            
                    except Exception as e:
                        logger.error(f"Error executing trade for {symbol}: {e}")

                    # Store HMM Decision
                    async with AsyncSessionLocal() as hmm_session:
                        decision = HMMDecision(
                            symbol=symbol,
                            regime=regime,
                            strategy=strategy,
                            confidence=confidence,
                            raw_data=rec,
                            calculation_time=round(time.time() - calc_start, 3)
                        )
                        hmm_session.add(decision)
                        await hmm_session.commit()
                        
                # End of symbol loop
                
                refresh_rate = settings.HMM_REFRESH_RATE_SEC if hasattr(settings, 'HMM_REFRESH_RATE_SEC') else 60
                await asyncio.sleep(refresh_rate)
            except Exception as e:
                logger.error(f"Error in trader loop: {e}")
                await asyncio.sleep(10)

async def main():
    bot = TraderBot()
    await bot.run()

if __name__ == "__main__":
    asyncio.run(main())
