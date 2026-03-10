from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    """Healthcheck obligatorio."""
    return {"status": "ok", "version": "1.0", "detail": "HMM Analyzer up and running"}

@router.get("/history")
async def get_history(symbol: str, timeframe: str, limit: int = 100):
    """Devuelve historial de estados y recomendaciones para un gráfico en Frontend."""
    return {"history": []}
