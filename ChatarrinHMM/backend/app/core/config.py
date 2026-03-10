from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Analizador HMM"
    VERSION: str = "v1"
    
    # Binance Config
    MODE: str = "testnet" # "production"
    BINANCE_API_KEY: str | None = None
    BINANCE_API_SECRET: str | None = None
    
    # Feature Engineering
    WARMUP_PERIOD: int = 14
    
    # HMM
    DEFAULT_STATES: int = 5
    
    # Security
    SECRET_KEY: str = "super_secret_dev_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    API_KEY_BOT: str = "changeme_bot_key"

    # Database
    DATABASE_URL: str = "sqlite:///./hmm_test.db"

    # Redis/Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
