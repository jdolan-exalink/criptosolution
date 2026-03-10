from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "hmm_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    beat_schedule={
        'analyze-btc-1h-every-15m': {
            'task': 'app.worker.scheduled_market_analysis',
            'schedule': 900.0, # 15 minutes
            'args': (['BTCUSDT'], '1h')
        }
    }
)

@celery_app.task
def generate_hmm_analysis(symbols: list, timeframe: str, states: int, window_days: int, force_retrain: bool):
    """
    Tarea core asíncrona:
    1. Llama MarketDataService
    2. FeatureEngineer
    3. HMMEngine.fit() o load()
    4. Evaluates state
    5. Guarda en DB
    """
    return {"status": "success", "processed": symbols}

@celery_app.task
def scheduled_market_analysis(symbols: list, timeframe: str):
    """
    A triggered loop by Celery beat that ensures analysis is fresh
    for the trading bot consumption.
    """
    generate_hmm_analysis(symbols, timeframe, 5, 60, False)
    return f"Tick processed for {symbols} at {timeframe}"
