from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from libs.common.config import settings
from libs.common.database import engine, Base, get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from libs.common.models import BotState, HMMDecision, Position, EquityTick, TradeLog, BotSession
from pydantic import BaseModel
import logging
import httpx
import ccxt.async_support as ccxt
from jose import jwt
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME)

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/v1/auth")
async def login(req: LoginRequest):
    if req.username == "admin" and req.password == "admin":  # Dummy check for now
        token_data = {"sub": req.username, "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)}
        token = jwt.encode(token_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Migrations: run each in its own transaction so one failure doesn't block the others
    migrations = [
        "ALTER TABLE positions ADD COLUMN IF NOT EXISTS leverage INTEGER DEFAULT 1",
        "ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS leverage INTEGER DEFAULT 1",
        "ALTER TABLE bot_sessions ADD COLUMN IF NOT EXISTS session_type VARCHAR DEFAULT 'normal'",
    ]
    for migration_sql in migrations:
        try:
            async with engine.begin() as mconn:
                await mconn.execute(text(migration_sql))
            logger.info(f"Migration OK: {migration_sql}")
        except Exception as me:
            logger.warning(f"Migration skipped ({migration_sql}): {me}")
    logger.info("API Started")

class BotConfig(BaseModel):
    BINANCE_ENV: str
    BINANCE_MARKET_TYPE: str
    BINANCE_TESTNET_API_KEY: str
    BINANCE_TESTNET_API_SECRET: str
    BINANCE_TESTNET_FUTURES_API_KEY: str = ""
    BINANCE_TESTNET_FUTURES_API_SECRET: str = ""
    BINANCE_PROD_API_KEY: str
    BINANCE_PROD_API_SECRET: str
    HMM_API_URL: str
    TRADE_LEVERAGE: int = 1
    TRADE_ALLOCATION_PCT: float = 0.01
    HMM_REFRESH_RATE_SEC: int = 60
    MAX_CONCURRENT_TRADES: int = 20
    MAX_MARGIN_EXPOSURE_PCT: float = 0.80
    PORTFOLIO_TAKE_PROFIT_PCT: float = 0.02

class BotStartRequest(BaseModel):
    duration_hours: int
    symbols: list[str]
    leverage: int = 1

class TestHMMRequest(BaseModel):
    url: str

class TestBinanceRequest(BaseModel):
    api_key: str
    api_secret: str
    env: str
    market_type: str
    # Optional fields (not required for testing)
    duration_hours: int = 0
    symbols: list[str] = []

@app.get("/api/v1/status")
async def get_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BotState).limit(1))
    state = result.scalar_one_or_none()
    
    # Check HMM Status
    hmm_status = "OFFLINE"
    try:
        health_url = settings.HMM_API_URL.replace("/api/v1", "/openapi.json")
        async with httpx.AsyncClient() as client:
            res = await client.get(health_url, timeout=2.0)
            if res.status_code == 200:
                hmm_status = "ONLINE"
    except Exception:
        pass

    # Get balance from database or fetch real-time from Binance
    initial_query = select(EquityTick).order_by(EquityTick.timestamp.asc()).limit(1)
    if state and state.start_time:
        initial_query = select(EquityTick).where(EquityTick.timestamp >= state.start_time).order_by(EquityTick.timestamp.asc()).limit(1)

    initial_cap = await db.execute(initial_query)
    curr_cap = await db.execute(select(EquityTick).order_by(EquityTick.timestamp.desc()).limit(1))

    initial = initial_cap.scalar_one_or_none()
    current = curr_cap.scalar_one_or_none()

    # If no equity data in DB, fetch real balance from Binance (FAST - USDT only)
    if not initial or not current:
        try:
            import ccxt.async_support as ccxt
            options = {'defaultType': 'spot'}
            exchange = ccxt.binance({
                'apiKey': settings.BINANCE_TESTNET_API_KEY,
                'secret': settings.BINANCE_TESTNET_API_SECRET,
                'enableRateLimit': True,
                'options': options,
                'timeout': 5000,  # 5 second timeout
            })
            if settings.BINANCE_ENV == 'testnet':
                exchange.set_sandbox_mode(True)

            balance = await exchange.fetch_balance()
            await exchange.close()

            # Get USDT balance directly (fast and reliable)
            usdt_balance = balance.get('USDT', {})
            total_balance = usdt_balance.get('total', 0.0)
            available_balance = usdt_balance.get('free', 0.0)
            
            initial_balance = total_balance
            current_balance = total_balance
            equity_updated_at = datetime.utcnow().isoformat()
            logger.info(f"Real-time Binance USDT balance: total={total_balance:.2f}, available={available_balance:.2f}")

        except Exception as e:
            logger.error(f"Failed to fetch Binance balance: {e}")
            initial_balance = 0.0
            current_balance = 0.0
            available_balance = 0.0
            equity_updated_at = None
    else:
        initial_balance = initial.total_balance if initial else 0.0
        current_balance = current.total_balance if current else 0.0
        available_balance = current.available_balance if current else 0.0
        equity_updated_at = current.timestamp.isoformat() if current and current.timestamp else None

    profit_pct = ((current_balance - initial_balance) / initial_balance * 100) if initial_balance > 0 else 0.0

    # Fetch latest strategies per active symbol
    symbol_strategies = {}
    last_signal = {"symbol": "NONE", "regime": "UNKNOWN", "strategy": "AWAITING"}
    if state and state.active_symbols:
        # Get absolute latest signal overall
        last_sig_res = await db.execute(select(HMMDecision).order_by(HMMDecision.timestamp.desc()).limit(1))
        overall_decision = last_sig_res.scalar_one_or_none()
        if overall_decision:
            last_signal = {
                "symbol": overall_decision.symbol, 
                "regime": overall_decision.regime, 
                "strategy": overall_decision.strategy
            }

        for sym in state.active_symbols.split(","):
            dec_res = await db.execute(select(HMMDecision).where(HMMDecision.symbol == sym).order_by(HMMDecision.timestamp.desc()).limit(1))
            decision = dec_res.scalar_one_or_none()
            if decision:
                symbol_strategies[sym] = decision.strategy

    if not state:
        return {
            "status": "NO_STATE_INITIALIZED",
            "is_running": False,
            "hmm_status": hmm_status,
            "initial_capital": initial_balance,
            "current_capital": current_balance,
            "available_balance": available_balance,
            "equity_updated_at": equity_updated_at,
            "profit_pct": profit_pct,
            "strategies": symbol_strategies,
            "last_signal": last_signal
        }
    return {
        "is_running": state.is_running,
        "active_symbols": state.active_symbols,
        "market_type": settings.BINANCE_MARKET_TYPE,  # Use current config instead of stale state
        "environment": settings.BINANCE_ENV,
        "run_duration_hours": state.run_duration_hours,
        "start_time": state.start_time.isoformat() if state.start_time else None,
        "hmm_status": hmm_status,
        "initial_capital": initial_balance,
        "current_capital": current_balance,
        "available_balance": available_balance,
        "equity_updated_at": equity_updated_at,
        "profit_pct": profit_pct,
        "strategies": symbol_strategies,
        "last_signal": last_signal,
        "leverage": state.leverage if state.leverage else settings.TRADE_LEVERAGE,
        "trade_allocation_pct": settings.TRADE_ALLOCATION_PCT,
        "close_positions_on_stop": state.close_positions_on_stop if state else False,
    }

@app.post("/api/v1/bot/start")
async def start_bot(req: BotStartRequest, db: AsyncSession = Depends(get_db)):
    try:
        import traceback

        # Persist leverage to settings and .env so the trader picks it up
        clamped_leverage = max(1, min(req.leverage, 125))
        settings.TRADE_LEVERAGE = clamped_leverage
        try:
            with open(".env", "r") as f:
                lines = f.readlines()
            new_lines = []
            found = False
            for line in lines:
                if line.startswith("TRADE_LEVERAGE="):
                    new_lines.append(f"TRADE_LEVERAGE={clamped_leverage}\n")
                    found = True
                else:
                    new_lines.append(line)
            if not found:
                new_lines.append(f"TRADE_LEVERAGE={clamped_leverage}\n")
            with open(".env", "w") as f:
                f.writelines(new_lines)
        except Exception as env_err:
            logger.warning(f"Could not update .env with leverage: {env_err}")

        result = await db.execute(select(BotState).limit(1))
        state = result.scalar_one_or_none()
        if not state:
            state = BotState()
            db.add(state)

        now = datetime.utcnow()
        state.is_running = True
        state.start_time = now
        state.run_duration_hours = req.duration_hours
        state.active_symbols = ",".join(req.symbols)
        state.leverage = clamped_leverage

        curr_cap = await db.execute(select(EquityTick).order_by(EquityTick.timestamp.desc()).limit(1))
        current = curr_cap.scalar_one_or_none()
        initial_cap = current.total_balance if current else 0.0

        session = BotSession(
            start_time=now,
            duration_hours=req.duration_hours,
            initial_capital=initial_cap,
            session_type='normal',
        )
        db.add(session)

        await db.commit()
        logger.info(f"Bot started with leverage={clamped_leverage}x, symbols={req.symbols}")
        return {"status": "started", "leverage": clamped_leverage}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "trace": traceback.format_exc()}

class BotStopRequest(BaseModel):
    close_positions: bool = False

@app.post("/api/v1/bot/stop")
async def stop_bot(req: BotStopRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BotState).limit(1))
    state = result.scalar_one_or_none()
    if state:
        state.is_running = False
        state.close_positions_on_stop = req.close_positions
        
        session_res = await db.execute(select(BotSession).order_by(BotSession.start_time.desc()).limit(1))
        current_session = session_res.scalar_one_or_none()
        if current_session and not current_session.end_time:
            now = datetime.utcnow()
            current_session.end_time = now
            curr_cap = await db.execute(select(EquityTick).order_by(EquityTick.timestamp.desc()).limit(1))
            current = curr_cap.scalar_one_or_none()
            final_cap = current.total_balance if current else 0.0
            current_session.final_capital = final_cap
            if current_session.initial_capital and current_session.initial_capital > 0:
                current_session.profit_pct = ((final_cap - current_session.initial_capital) / current_session.initial_capital) * 100
            else:
                current_session.profit_pct = 0.0
                
        await db.commit()
    return {"status": "stopped"}

@app.get("/api/v1/sessions")
async def get_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BotSession).order_by(BotSession.start_time.desc()).limit(50))
    sessions = result.scalars().all()

    enriched = []
    for s in sessions:
        # Collect close trades within this session's time window
        trade_q = select(TradeLog).where(TradeLog.timestamp >= s.start_time)
        if s.end_time:
            trade_q = trade_q.where(TradeLog.timestamp <= s.end_time)
        trade_res = await db.execute(trade_q)
        session_trades = trade_res.scalars().all()

        close_trades = [t for t in session_trades if t.realized_pnl is not None and t.action and "CLOSE" in t.action]
        win_trades   = [t for t in close_trades if t.realized_pnl > 0]
        realized_pnl = sum(t.realized_pnl for t in close_trades)

        enriched.append({
            "id":                s.id,
            "session_type":      getattr(s, 'session_type', 'normal') or 'normal',
            "start_time":        s.start_time.isoformat() if s.start_time else None,
            "end_time":          s.end_time.isoformat()   if s.end_time   else None,
            "duration_hours":    s.duration_hours,
            "initial_capital":   s.initial_capital,
            "final_capital":     s.final_capital,
            "profit_pct":        round(s.profit_pct, 4) if s.profit_pct is not None else None,
            "trade_count":       len(close_trades),
            "win_count":         len(win_trades),
            "win_rate":          round(len(win_trades) / len(close_trades) * 100, 1) if close_trades else 0.0,
            "realized_pnl_usdt": round(realized_pnl, 4),
        })

    return enriched

@app.get("/api/v1/positions")
async def get_positions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Position))
    positions = result.scalars().all()
    return [{"symbol": p.symbol, "amount": p.amount, "unrealized_pnl": p.unrealized_pnl, "entry_price": p.entry_price, "leverage": p.leverage or 1, "take_profit": p.take_profit, "stop_loss": p.stop_loss} for p in positions]

@app.delete("/api/v1/positions/clear")
async def clear_positions(db: AsyncSession = Depends(get_db)):
    """Force-clear all DB positions (use when exchange positions don't match DB, e.g. testnet reset)."""
    result = await db.execute(select(Position))
    positions = result.scalars().all()
    count = len(positions)
    for p in positions:
        await db.delete(p)
    await db.commit()
    return {"cleared": count}

@app.get("/api/v1/trades")
async def get_trades(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TradeLog).order_by(TradeLog.timestamp.desc()))
    trades = result.scalars().all()
    return [{"symbol": t.symbol, "action": t.action, "amount": t.amount, "price": t.price, "realized_pnl": t.realized_pnl, "timestamp": t.timestamp.isoformat() if t.timestamp else None} for t in trades]

@app.get("/api/v1/equity")
async def get_equity(db: AsyncSession = Depends(get_db)):
    session_res = await db.execute(select(BotSession).order_by(BotSession.start_time.desc()).limit(1))
    current_session = session_res.scalar_one_or_none()
    
    query = select(EquityTick).order_by(EquityTick.timestamp.desc()).limit(100)
    
    if current_session:
        query = select(EquityTick).where(EquityTick.timestamp >= current_session.start_time)
        if current_session.end_time:
            query = query.where(EquityTick.timestamp <= current_session.end_time)
        query = query.order_by(EquityTick.timestamp.desc()).limit(200)

    result = await db.execute(query)
    ticks = result.scalars().all()
    # Return ascending for the chart
    return [{"timestamp": t.timestamp, "total_balance": t.total_balance} for t in sorted(ticks, key=lambda x: x.timestamp)]

@app.get("/api/v1/config")
async def get_config():
    return {
        "BINANCE_ENV": settings.BINANCE_ENV,
        "BINANCE_MARKET_TYPE": settings.BINANCE_MARKET_TYPE,
        "BINANCE_TESTNET_API_KEY": settings.BINANCE_TESTNET_API_KEY or "",
        "BINANCE_TESTNET_API_SECRET": settings.BINANCE_TESTNET_API_SECRET or "",
        "BINANCE_TESTNET_FUTURES_API_KEY": settings.BINANCE_TESTNET_FUTURES_API_KEY or "",
        "BINANCE_TESTNET_FUTURES_API_SECRET": settings.BINANCE_TESTNET_FUTURES_API_SECRET or "",
        "BINANCE_PROD_API_KEY": settings.BINANCE_PROD_API_KEY or "",
        "BINANCE_PROD_API_SECRET": settings.BINANCE_PROD_API_SECRET or "",
        "HMM_API_URL": settings.HMM_API_URL,
        "TRADE_LEVERAGE": settings.TRADE_LEVERAGE,
        "TRADE_ALLOCATION_PCT": settings.TRADE_ALLOCATION_PCT,
        "HMM_REFRESH_RATE_SEC": settings.HMM_REFRESH_RATE_SEC,
        "MAX_CONCURRENT_TRADES": settings.MAX_CONCURRENT_TRADES,
        "MAX_MARGIN_EXPOSURE_PCT": settings.MAX_MARGIN_EXPOSURE_PCT,
        "PORTFOLIO_TAKE_PROFIT_PCT": settings.PORTFOLIO_TAKE_PROFIT_PCT
    }

@app.post("/api/v1/config")
async def update_config(config: BotConfig):
    import os
    
    env_vars = config.dict()
    
    # Write to .env file (mounted volume)
    env_file_path = "/app/.env"
    try:
        with open(env_file_path, "w") as f:
            for k, v in env_vars.items():
                f.write(f"{k}={v}\n")
        logger.info(f"Config saved to {env_file_path}")
    except Exception as e:
        logger.error(f"Failed to save .env: {e}")
        # Fallback to current directory
        try:
            with open(".env", "w") as f:
                for k, v in env_vars.items():
                    f.write(f"{k}={v}\n")
            logger.info("Config saved to .env (fallback)")
        except Exception as e2:
            logger.error(f"Fallback also failed: {e2}")

    # Update runtime settings
    settings.BINANCE_ENV = config.BINANCE_ENV
    settings.BINANCE_MARKET_TYPE = config.BINANCE_MARKET_TYPE
    settings.BINANCE_TESTNET_API_KEY = config.BINANCE_TESTNET_API_KEY
    settings.BINANCE_TESTNET_API_SECRET = config.BINANCE_TESTNET_API_SECRET
    settings.BINANCE_TESTNET_FUTURES_API_KEY = config.BINANCE_TESTNET_FUTURES_API_KEY or None
    settings.BINANCE_TESTNET_FUTURES_API_SECRET = config.BINANCE_TESTNET_FUTURES_API_SECRET or None
    settings.BINANCE_PROD_API_KEY = config.BINANCE_PROD_API_KEY
    settings.BINANCE_PROD_API_SECRET = config.BINANCE_PROD_API_SECRET
    settings.HMM_API_URL = config.HMM_API_URL
    settings.TRADE_LEVERAGE = config.TRADE_LEVERAGE
    settings.TRADE_ALLOCATION_PCT = config.TRADE_ALLOCATION_PCT
    settings.HMM_REFRESH_RATE_SEC = config.HMM_REFRESH_RATE_SEC
    settings.MAX_CONCURRENT_TRADES = config.MAX_CONCURRENT_TRADES
    settings.MAX_MARGIN_EXPOSURE_PCT = config.MAX_MARGIN_EXPOSURE_PCT
    settings.PORTFOLIO_TAKE_PROFIT_PCT = config.PORTFOLIO_TAKE_PROFIT_PCT
    
    logger.info(f"Config updated: BINANCE_ENV={config.BINANCE_ENV}, BINANCE_MARKET_TYPE={config.BINANCE_MARKET_TYPE}")
    
    return {"status": "updated", "message": "Config saved. Restart trader service for changes to take full effect."}

@app.get("/api/v1/symbols")
async def get_symbols():
    # Top 20 symbols
    top_20 = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT", "ADA/USDT", "DOGE/USDT", "AVAX/USDT", "TRX/USDT", "DOT/USDT", "LINK/USDT", "POL/USDT", "BCH/USDT", "LTC/USDT", "SHIB/USDT", "NEAR/USDT", "UNI/USDT", "APT/USDT", "ATOM/USDT", "XLM/USDT"]
    return top_20

@app.post("/api/v1/test/hmm")
async def test_hmm_connection(req: TestHMMRequest):
    try:
        # Assuming HMM Analyzer has a health or root endpoint, we try to hit it
        async with httpx.AsyncClient() as client:
            res = await client.get(req.url, timeout=5.0)
            return {"success": True, "status_code": res.status_code}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/v1/test/binance")
async def test_binance_connection(req: TestBinanceRequest):
    try:
        options = {'defaultType': req.market_type}
        exchange = ccxt.binance({
            'apiKey': req.api_key,
            'secret': req.api_secret,
            'enableRateLimit': True,
            'options': options
        })
        if req.env == "testnet":
            exchange.set_sandbox_mode(True)
            
        # Try fetching balance to validate keys
        balance = await exchange.fetch_balance()
        await exchange.close()
        return {"success": True, "message": "Connected successfully"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- MANDATORY DATA INTERFACES (Spec Section 12) ---

@app.get("/api/v1/market/candles")
async def get_market_candles(symbol: str, timeframe: str = "1h", limit: int = 100):
    try:
        exchange = ccxt.binance()
        ohlcv = await exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
        await exchange.close()
        return ohlcv
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/market/orderbook")
async def get_market_orderbook(symbol: str, limit: int = 20):
    try:
        exchange = ccxt.binance()
        ob = await exchange.fetch_order_book(symbol, limit)
        await exchange.close()
        return ob
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/market/volume")
async def get_market_volume(symbol: str):
    try:
        exchange = ccxt.binance()
        ticker = await exchange.fetch_ticker(symbol)
        await exchange.close()
        return {"symbol": symbol, "quoteVolume": ticker.get("quoteVolume")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/hmm/regime")
async def get_hmm_regime(symbol: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HMMDecision).where(HMMDecision.symbol == symbol).order_by(HMMDecision.timestamp.desc()).limit(1))
    decision = result.scalar_one_or_none()
    if not decision: return {"error": "No regime data"}
    raw = decision.raw_data or {}
    probs = raw.get("state", {}).get("probabilities", [])
    if isinstance(probs, dict):
        probs = list(probs.values())
    
    # Pad to at least 5 elements with 0.0
    probs = (probs + [0.0]*5)[:5]
    return {
        "S0": probs[0], "S1": probs[1], 
        "S2": probs[2], "S3": probs[3], "S4": probs[4],
        "dominant_state": decision.regime
    }

@app.get("/api/v1/decision/current")
async def get_decision_current(symbol: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HMMDecision).where(HMMDecision.symbol == symbol).order_by(HMMDecision.timestamp.desc()).limit(1))
    decision = result.scalar_one_or_none()
    if not decision: return {"error": "No decision found"}
    return {
        "regime": decision.regime,
        "selected_strategy": decision.strategy,
        "confidence": decision.confidence,
        "position_size": decision.raw_data.get("risk_hint", {}).get("suggested_position_risk", 0.01) if decision.raw_data else 0.0
    }

class TradeOpRequest(BaseModel):
    symbol: str
    amount: float
    side: str

@app.post("/api/v1/trade/open")
async def trade_open(req: TradeOpRequest):
    return {"status": "Trade open signal logged", "details": req.dict()}

@app.post("/api/v1/trade/close")
async def trade_close(req: TradeOpRequest):
    return {"status": "Trade close signal logged", "details": req.dict()}

@app.get("/api/v1/trade/status")
async def trade_status(symbol: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Position).where(Position.symbol == symbol).limit(1))
    pos = result.scalar_one_or_none()
    if pos: return {"symbol": pos.symbol, "amount": pos.amount, "unrealized_pnl": pos.unrealized_pnl}
    return {"message": "No active position"}

@app.get("/api/v1/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Scope stats to the current session's start_time
    state_res = await db.execute(select(BotState).limit(1))
    state = state_res.scalar_one_or_none()
    session_start = state.start_time if state and state.start_time else None

    # Filter trades by session start time
    trades_query = select(TradeLog)
    if session_start:
        trades_query = trades_query.where(TradeLog.timestamp >= session_start)
    trades_res = await db.execute(trades_query)
    trades = trades_res.scalars().all()

    close_trades = [t for t in trades if t.realized_pnl is not None and t.action and "CLOSE" in t.action]
    total_trades = len(close_trades)
    winning = [t for t in close_trades if t.realized_pnl > 0]
    losing = [t for t in close_trades if t.realized_pnl < 0]
    total_pnl = sum(t.realized_pnl for t in close_trades)
    win_rate = (len(winning) / total_trades * 100) if total_trades > 0 else 0.0
    best_trade = max((t.realized_pnl for t in close_trades), default=0.0)
    worst_trade = min((t.realized_pnl for t in close_trades), default=0.0)

    # Max drawdown from equity ticks (session-scoped)
    eq_query = select(EquityTick).order_by(EquityTick.timestamp.asc())
    if session_start:
        eq_query = select(EquityTick).where(EquityTick.timestamp >= session_start).order_by(EquityTick.timestamp.asc())
    eq_res = await db.execute(eq_query)
    ticks = eq_res.scalars().all()
    max_dd = 0.0
    if ticks:
        peak = ticks[0].total_balance
        for tick in ticks:
            if tick.total_balance > peak:
                peak = tick.total_balance
            dd = (peak - tick.total_balance) / peak if peak > 0 else 0.0
            if dd > max_dd:
                max_dd = dd

    return {
        "total_trades": total_trades,
        "winning_trades": len(winning),
        "losing_trades": len(losing),
        "win_rate": round(win_rate, 1),
        "total_realized_pnl": round(total_pnl, 4),
        "best_trade": round(best_trade, 4),
        "worst_trade": round(worst_trade, 4),
        "max_drawdown_pct": round(max_dd * 100, 2),
        "leverage": state.leverage if state and state.leverage else settings.TRADE_LEVERAGE,
        "trade_allocation_pct": settings.TRADE_ALLOCATION_PCT,
    }


@app.get("/api/v1/balance/details")
async def get_balance_details():
    """Fetch a breakdown of all non-zero assets across futures and spot wallets,
    enriched with real-time USDT conversion prices."""
    import re
    from libs.binance_connector.client import BinanceClient

    env = settings.BINANCE_ENV.lower()
    # Use market-type-specific key selection for the two clients
    futures_api_key, futures_api_secret = settings.get_api_keys('futures')
    spot_api_key, spot_api_secret = settings.get_api_keys('spot')

    if not futures_api_key and not spot_api_key:
        return {"futures": [], "spot": [], "futures_total_usdt": 0, "spot_total_usdt": 0, "error": "API keys not configured"}

    def _valid_asset(name: str) -> bool:
        return bool(re.match(r'^[A-Z0-9]{1,12}$', name or ''))

    STABLECOINS = {'USDT', 'USDC', 'BUSD', 'TUSD', 'DAI', 'FDUSD', 'USDP', 'PYUSD'}

    # --- Fetch real-time prices from PUBLIC production Binance API (no auth) ---
    price_map: dict[str, float] = {}
    try:
        async with httpx.AsyncClient(timeout=5.0) as hc:
            r = await hc.get('https://api.binance.com/api/v3/ticker/price')
            if r.status_code == 200:
                for item in r.json():
                    sym = item['symbol']
                    if sym.endswith('USDT'):
                        base = sym[:-4]
                        price_map[base] = float(item['price'])
    except Exception as e:
        logger.warning(f"balance/details: price fetch error: {e}")

    def _usdt_value(asset: str, amount: float) -> float:
        if asset in STABLECOINS:
            return round(amount, 4)
        return round(amount * price_map.get(asset, 0.0), 4)

    # --- Futures balance ---
    futures_assets = []
    futures_total = 0.0
    try:
        fc = BinanceClient(futures_api_key, futures_api_secret, env, 'futures')
        balance = await fc.get_balance()
        info = balance.get('info', {})
        if 'assets' in info:
            for a in info['assets']:
                if not _valid_asset(a.get('asset', '')):
                    continue
                wb   = float(a.get('walletBalance', 0))
                upnl = float(a.get('unrealizedProfit', 0))
                avail = float(a.get('availableBalance', wb))
                if wb != 0 or upnl != 0:
                    uv = _usdt_value(a['asset'], wb)
                    futures_assets.append({
                        'asset': a['asset'],
                        'wallet_balance': round(wb, 6),
                        'available': round(avail, 6),
                        'unrealized_pnl': round(upnl, 6),
                        'usdt_value': uv,
                    })
                    futures_total += uv + round(upnl, 4)
        elif 'totalWalletBalance' in info:
            wb = float(info['totalWalletBalance'])
            if wb != 0:
                uv = _usdt_value('USDT', wb)
                futures_assets.append({
                    'asset': 'USDT',
                    'wallet_balance': round(wb, 6),
                    'available': round(float(info.get('availableBalance', wb)), 6),
                    'unrealized_pnl': round(float(info.get('totalUnrealizedProfit', 0)), 6),
                    'usdt_value': uv,
                })
                futures_total += uv
        await fc.close()
    except Exception as e:
        logger.warning(f"balance/details futures error: {e}")

    # --- Spot balance ---
    spot_assets = []
    spot_total = 0.0
    try:
        sc = BinanceClient(spot_api_key, spot_api_secret, env, 'spot')
        balance = await sc.get_balance()
        info = balance.get('info', {})
        if 'balances' in info:
            for b in info['balances']:
                if not _valid_asset(b.get('asset', '')):
                    continue
                free   = float(b.get('free', 0))
                locked = float(b.get('locked', 0))
                total  = free + locked
                if total > 1e-8:
                    uv = _usdt_value(b['asset'], total)
                    spot_assets.append({
                        'asset': b['asset'],
                        'wallet_balance': round(total, 6),
                        'available': round(free, 6),
                        'unrealized_pnl': 0.0,
                        'usdt_value': uv,
                    })
                    spot_total += uv
        elif 'USDT' in balance:
            total = float(balance['USDT'].get('total', 0))
            if total > 0:
                uv = _usdt_value('USDT', total)
                spot_assets.append({
                    'asset': 'USDT',
                    'wallet_balance': round(total, 6),
                    'available': round(float(balance['USDT'].get('free', 0)), 6),
                    'unrealized_pnl': 0.0,
                    'usdt_value': uv,
                })
                spot_total += uv
        await sc.close()
    except Exception as e:
        logger.warning(f"balance/details spot error: {e}")

    # Sort by USDT value descending
    futures_assets.sort(key=lambda x: x['usdt_value'], reverse=True)
    spot_assets.sort(key=lambda x: x['usdt_value'], reverse=True)

    return {
        "futures": futures_assets,
        "spot": spot_assets,
        "futures_total_usdt": round(futures_total, 2),
        "spot_total_usdt": round(spot_total, 2),
        "grand_total_usdt": round(futures_total + spot_total, 2),
    }


class TransferRequest(BaseModel):
    asset: str
    amount: float
    direction: str  # 'SPOT_TO_FUTURES' or 'FUTURES_TO_SPOT'

@app.post("/api/v1/balance/transfer")
async def transfer_balance(req: TransferRequest):
    """Transfer an asset between spot and futures wallets."""
    env = settings.BINANCE_ENV.lower()
    # Universal Transfer uses the spot SAPI endpoint; use spot keys
    api_key, api_secret = settings.get_api_keys('spot')

    if not api_key or not api_secret:
        return {"success": False, "error": "API keys not configured"}

    client = None
    try:
        from libs.binance_connector.client import BinanceClient
        # Universal Transfer uses the spot SAPI endpoint
        client = BinanceClient(api_key, api_secret, env, 'spot')
        from_account = 'spot' if req.direction == 'SPOT_TO_FUTURES' else 'future'
        to_account = 'future' if req.direction == 'SPOT_TO_FUTURES' else 'spot'
        result = await client.exchange.transfer(req.asset, req.amount, from_account, to_account)
        await client.close()
        return {"success": True, "result": str(result)}
    except Exception as e:
        logger.error(f"Transfer failed: {e}")
        if client:
            try:
                await client.close()
            except Exception:
                pass
        return {"success": False, "error": str(e)}


@app.get("/api/v1/executions")
async def get_executions(db: AsyncSession = Depends(get_db), limit: int = 50):
    result = await db.execute(select(HMMDecision).order_by(HMMDecision.timestamp.desc()).limit(limit))
    executions = result.scalars().all()
    return [{
        "symbol": e.symbol,
        "regime": e.regime,
        "strategy": e.strategy,
        "confidence": e.confidence,
        "calculation_time": getattr(e, "calculation_time", 0.0),
        "timestamp": e.timestamp.isoformat() if e.timestamp else None
    } for e in executions]
