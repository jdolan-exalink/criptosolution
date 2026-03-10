import requests
from app.core.config import settings

class MarketDataService:
    @staticmethod
    def get_base_url():
        if settings.MODE == "production":
            return "https://api.binance.com"
        return "https://testnet.binance.vision"
        
    @staticmethod
    def get_klines(symbol: str, interval: str, limit: int = 1000):
        url = f"{MarketDataService.get_base_url()}/api/v3/klines"
        params = {
            "symbol": symbol,
            "interval": interval,
            "limit": limit
        }
        # Agregar manejo de retry y rate_limit real (Weight headers de binance)
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        # columns: [open_time, open, high, low, close, volume, close_time, quote_asset_volume, number_of_trades, taker_buy_base_asset_volume, taker_buy_quote_asset_volume, ignore]
        return response.json()
