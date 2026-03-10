import httpx
import logging
from typing import Dict, Any, Optional
from libs.common.config import settings

logger = logging.getLogger(__name__)

class HMMClient:
    def __init__(self, base_url: str = settings.HMM_API_URL, api_key: Optional[str] = settings.HMM_API_KEY):
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {}
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"
            
    async def get_recommendation(self, symbol: str, timeframe: str = "1d") -> Dict[str, Any]:
        """
        Consults the external HMM Analyzer for the given symbol to get standard regime & strategy.
        """
        url = f"{self.base_url}/recommendation/" # Assuming trailing slash with redirect fix
        clean_symbol = symbol.replace("/", "")
        params = {"symbol": clean_symbol, "timeframe": timeframe}
        
        async with httpx.AsyncClient(follow_redirects=True) as client:
            try:
                response = await client.get(url, params=params, headers=self.headers, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                logger.info(f"HMM Recommendation for {symbol}: {data}")
                return data
            except httpx.HTTPError as e:
                logger.error(f"HTTP Error querying HMM Analyzer: {e}")
                # return a fallback or re-raise
                return {"symbol": symbol, "regime": "UNKNOWN", "strategy": "HOLD", "error": str(e)}
