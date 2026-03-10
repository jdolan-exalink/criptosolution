from fastapi import APIRouter, HTTPException, Depends, Security
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# Dependencia de seguridad mínima por API KEY
# En prod usar FastAPI Security APIKeyHeader
async def verify_api_key(x_api_key: str = "changeme_bot_key_dev_mode"):
    pass # validamos api key aquí

class StateInfo(BaseModel):
    id: int
    label: str
    confidence: float
    probabilities: List[float]

class RecommendationInfo(BaseModel):
    strategy: str
    action_bias: str
    confidence_min: float
    valid_for_minutes: int

class RiskHint(BaseModel):
    volatility_regime: str
    suggested_position_risk: float

class RecommendationResponse(BaseModel):
    symbol: str
    timeframe: str
    timestamp: datetime
    model_version: str
    state: StateInfo
    recommendation: RecommendationInfo
    risk_hint: RiskHint

@router.get("/", response_model=RecommendationResponse)
async def get_recommendation(
    symbol: str, 
    timeframe: str, 
    # _api_key = Depends(verify_api_key)
):
    """
    Este es el endpoint principal para el Bot de Trading.
    Debe respetar estrictamente este contrato y no exponer latencia innecesaria.
    """
    # Lógica de ejemplo: En producción esto lee de Redis o DB (History/Predicciones en línea)
    return RecommendationResponse(
        symbol=symbol,
        timeframe=timeframe,
        timestamp=datetime.utcnow(),
        model_version="hmm_v1",
        state=StateInfo(
            id=3,
            label="UP_TREND_HIGH_VOL",
            confidence=0.71,
            probabilities=[0.02, 0.05, 0.12, 0.71, 0.10]
        ),
        recommendation=RecommendationInfo(
            strategy="trend_following",
            action_bias="LONG",
            confidence_min=0.6,
            valid_for_minutes=60
        ),
        risk_hint=RiskHint(
            volatility_regime="HIGH",
            suggested_position_risk=0.01
        )
    )
