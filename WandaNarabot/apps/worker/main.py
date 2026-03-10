import logging
from celery import Celery
import os

logger = logging.getLogger(__name__)

# Basic Celery Setup
redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery("wanda_worker", broker=redis_url, backend=redis_url)

@celery_app.task
def generate_daily_report():
    logger.info("Executing daily report generation task...")
    # Add actual telegram notification logic here later
    return "Report generated"

# Scheduled tasks setup
celery_app.conf.beat_schedule = {
    'daily-report-every-midnight': {
        'task': 'apps.worker.main.generate_daily_report',
        'schedule': 86400.0, # Every 24 hours
    },
}
celery_app.conf.timezone = 'UTC'
