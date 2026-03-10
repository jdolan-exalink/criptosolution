import ccxt.async_support as ccxt
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class BinanceClient:
    def __init__(self, api_key: str, api_secret: str, env: str = "testnet", market_type: str = "futures"):
        self.api_key = api_key
        self.api_secret = api_secret
        self.env = env
        self.market_type = market_type

        if self.market_type == 'futures':
            # Use binanceusdm — the dedicated USD-M Futures exchange class.
            # This routes all requests to fapi endpoints by default.
            self.exchange = ccxt.binanceusdm({
                'apiKey': self.api_key,
                'secret': self.api_secret,
                'enableRateLimit': True,
                'options': {
                    'adjustForTimeDifference': True,
                },
            })

            if self.env == 'testnet':
                # Binance Futures Demo Trading:
                #   - API keys are obtained from https://testnet.binancefuture.com (now demo.binance.com)
                #   - enable_demo_trading(True) reroutes all fapi calls to demo-fapi.binance.com
                #   - No set_sandbox_mode needed — it is deprecated for futures in ccxt v4
                self.exchange.enable_demo_trading(True)
                logger.info("Binance Client initialized in DEMO mode [futures] → demo-fapi.binance.com")
            else:
                logger.info("Binance Client initialized in PRODUCTION mode [futures] → fapi.binance.com")

        else:
            # Spot: use the standard binance exchange class
            self.exchange = ccxt.binance({
                'apiKey': self.api_key,
                'secret': self.api_secret,
                'enableRateLimit': True,
                'options': {
                    'defaultType': 'spot',
                    'adjustForTimeDifference': True,
                },
            })

            if self.env == 'testnet':
                # Spot Testnet: sandbox mode correctly maps to testnet.binance.vision
                self.exchange.set_sandbox_mode(True)
                self.exchange.urls['api']['public']  = self.exchange.urls['test']['public']
                self.exchange.urls['api']['private'] = self.exchange.urls['test']['private']
                logger.info("Binance Client initialized in TESTNET mode [spot] → testnet.binance.vision")
            else:
                logger.info("Binance Client initialized in PRODUCTION mode [spot] → api.binance.com")

    def _to_ccxt_symbol(self, symbol: str) -> str:
        """Convert a unified BASE/QUOTE symbol to the correct ccxt format.

        ccxt.binanceusdm requires 'BASE/QUOTE:SETTLE' format for perpetual futures.
        Examples:
            'BTC/USDT'  → 'BTC/USDT:USDT'  (futures)
            'ETH/USDT'  → 'ETH/USDT:USDT'  (futures)
            'BTC/USDT'  → 'BTC/USDT'        (spot — unchanged)
        """
        if self.market_type == 'futures' and '/' in symbol and ':' not in symbol:
            quote = symbol.split('/')[1]  # e.g. 'USDT'
            return f"{symbol}:{quote}"
        return symbol

    def _from_ccxt_symbol(self, symbol: str) -> str:
        """Strip the settlement suffix so internal code always sees 'BASE/QUOTE'.

        'BTC/USDT:USDT' → 'BTC/USDT'
        """
        return symbol.split(':')[0] if ':' in symbol else symbol

    async def get_balance(self):
        try:
            balance = await self.exchange.fetch_balance()
            return balance
        except Exception as e:
            logger.error(f"Error fetching balance: {e}")
            raise

    async def create_market_order(self, symbol: str, side: str, amount: float):
        ccxt_symbol = self._to_ccxt_symbol(symbol)
        try:
            logger.info(f"Creating MARKET {side} order for {amount} {ccxt_symbol} ({self.market_type})")
            order = await self.exchange.create_market_order(ccxt_symbol, side, amount)
            return order
        except Exception as e:
            logger.error(f"Error creating order: {e}")
            raise

    async def create_limit_order(self, symbol: str, side: str, amount: float, price: float):
        ccxt_symbol = self._to_ccxt_symbol(symbol)
        try:
            logger.info(f"Creating LIMIT {side} order for {amount} {ccxt_symbol} @ {price} ({self.market_type})")
            order = await self.exchange.create_limit_order(ccxt_symbol, side, amount, price)
            return order
        except Exception as e:
            logger.error(f"Error creating order: {e}")
            raise

    async def fetch_ticker(self, symbol: str):
        ccxt_symbol = self._to_ccxt_symbol(symbol)
        ticker = await self.exchange.fetch_ticker(ccxt_symbol)
        return ticker

    async def fetch_ohlcv_df(self, symbol: str, timeframe: str = '15m', limit: int = 200):
        ccxt_symbol = self._to_ccxt_symbol(symbol)
        try:
            import pandas as pd
            ohlcv = await self.exchange.fetch_ohlcv(ccxt_symbol, timeframe=timeframe, limit=limit)
            df = pd.DataFrame(ohlcv, columns=['Timestamp', 'Open', 'High', 'Low', 'Close', 'Volume'])
            df['Timestamp'] = pd.to_datetime(df['Timestamp'], unit='ms')
            return df
        except Exception as e:
            logger.error(f"Error fetching OHLCV for {symbol}: {e}")
            return None

    async def get_positions(self, symbols: Optional[List[str]] = None):
        if self.market_type != "futures":
            return []  # Positions only exist in futures

        try:
            # Convert symbols to ccxt format if provided
            ccxt_symbols = [self._to_ccxt_symbol(s) for s in symbols] if symbols else None
            positions = await self.exchange.fetch_positions(ccxt_symbols)
            # Normalise the 'symbol' field back to BASE/QUOTE for internal consistency
            for pos in positions:
                if 'symbol' in pos:
                    pos['symbol'] = self._from_ccxt_symbol(pos['symbol'])
            return positions
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            raise

    async def close(self):
        if self.exchange:
            await self.exchange.close()
