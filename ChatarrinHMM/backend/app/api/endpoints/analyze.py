from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid

router = APIRouter()

class AnalyzeRequest(BaseModel):
    symbols: List[str] = Field(..., example=["BTCUSDT", "ETHUSDT"])
    timeframe: str = Field(..., example="1h")
    states: int = Field(5, ge=3, le=7)
    window_days: int = Field(60, ge=7)
    force_retrain: bool = Field(False)

class AnalyzeResponse(BaseModel):
    job_id: str
    status: str

@router.post("/", response_model=AnalyzeResponse)
async def trigger_analysis(request: AnalyzeRequest):
    """
    Dispara un análisis bajo demanda que incluye descarga de market data, 
    entrenamiento de HMM (si corresponde) e inferencia actual.
    El resultado pasará a estar disponible en GET /api/v1/recommendation.
    """
    # Aquí iría la lógica para enviar a Celery
    fake_job_id = f"anl_{uuid.uuid4().hex[:6]}"
    return AnalyzeResponse(job_id=fake_job_id, status="started")

@router.post("/batch")
async def trigger_batch_analysis():
    """Para requests rápidos desde UI o testing (síncrono o precalculado)"""
    pass
