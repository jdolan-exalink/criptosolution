from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App
    APP_NAME: str = "WandaNarabot"
    ENV: str = "dev"
    
    # DB
    DATABASE_URL: str = "sqlite+aiosqlite:///d:/DEVs/WandaNarabot/DB/wandanarabot.db"
    
    # Binance Keys — Spot Testnet (testnet.binance.vision)
    BINANCE_TESTNET_API_KEY: Optional[str] = "ZIBJjdGa3EfbP9ig3T81n8YhQzawMUdlVDNLDaIC1hORJ6yvZnAMR2yaAWezseoe"
    BINANCE_TESTNET_API_SECRET: Optional[str] = "gkUqAWsMBXsGAhONT0NmBVmzkAXTwCYdR1dmgNvmCi2JfFTKmXIZlhNR95uOae3H"
    # Binance Keys — Futures Demo Trading (demo.binance.com / demo-fapi.binance.com)
    # Get these from: https://testnet.binancefuture.com → API Key section
    BINANCE_TESTNET_FUTURES_API_KEY: Optional[str] = None
    BINANCE_TESTNET_FUTURES_API_SECRET: Optional[str] = None
    BINANCE_PROD_API_KEY: Optional[str] = None
    BINANCE_PROD_API_SECRET: Optional[str] = None
    
    BINANCE_ENV: str = "testnet" # 'testnet' or 'prod'
    BINANCE_MARKET_TYPE: str = "futures" # 'spot' or 'futures'
    
    # HMM Analyzer
    HMM_API_URL: str = "http://host.docker.internal:9998/api/v1"
    HMM_API_KEY: Optional[str] = None
    
    # Trading Configuration
    TRADE_LEVERAGE: int = 1
    TRADE_ALLOCATION_PCT: float = 0.01
    HMM_REFRESH_RATE_SEC: int = 60
    # Risk limits
    MAX_CONCURRENT_TRADES: int = 20          # max open positions at once
    MAX_MARGIN_EXPOSURE_PCT: float = 0.80    # max % of wallet used as margin across all positions
    PORTFOLIO_TAKE_PROFIT_PCT: float = 0.02  # close all when session gain reaches this % (0 = disabled)
    
    # Telegram
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID: Optional[str] = None
    
    # JWT
    SECRET_KEY: str = "supersecretkey_change_me_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    def get_api_keys(self, market_type: str) -> tuple[Optional[str], Optional[str]]:
        """Return (api_key, api_secret) for the configured env and given market_type.

        - prod:    always uses BINANCE_PROD_API_KEY / _SECRET
        - testnet + futures: prefers BINANCE_TESTNET_FUTURES_API_KEY if set,
                             falls back to BINANCE_TESTNET_API_KEY
        - testnet + spot:    uses BINANCE_TESTNET_API_KEY / _SECRET
        """
        env = self.BINANCE_ENV.lower()
        if env != 'testnet':
            return self.BINANCE_PROD_API_KEY, self.BINANCE_PROD_API_SECRET

        if market_type == 'futures' and self.BINANCE_TESTNET_FUTURES_API_KEY:
            return self.BINANCE_TESTNET_FUTURES_API_KEY, self.BINANCE_TESTNET_FUTURES_API_SECRET

        return self.BINANCE_TESTNET_API_KEY, self.BINANCE_TESTNET_API_SECRET

settings = Settings()
