"""Configuration settings using Pydantic."""
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Data directories
    DATA_DIR: str = "backend_data"
    RAW_DIR: str = "backend_data/raw"
    PROCESSED_DIR: str = "backend_data/processed"
    
    # Trading parameters
    TRADING_DAYS_PER_YEAR: int = 252
    MIN_OBS: int = 60
    MAX_FFILL_GAP: int = 2  # trading days
    
    # Backtest defaults
    DEFAULT_BACKTEST_LOOKBACK: int = 250
    DEFAULT_BACKTEST_DAYS: int = 250
    DEFAULT_MC_SIMS: int = 10000
    DEFAULT_BENCHMARK: str = "SPY"
    DEFAULT_SEED: int = 42
    
    # Cache
    CACHE_TTL_SECONDS: int = 3600
    
    # Google Sheets / opt-in integration (all optional)
    GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON: str | None = None
    GOOGLE_SHEETS_SPREADSHEET_ID: str | None = None
    GOOGLE_SHEETS_WORKSHEET_TITLE: str = "OptIns"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure directories exist
        Path(self.RAW_DIR).mkdir(parents=True, exist_ok=True)
        Path(self.PROCESSED_DIR).mkdir(parents=True, exist_ok=True)


settings = Settings()

