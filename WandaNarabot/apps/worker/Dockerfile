FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y git
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY libs/ ./libs/
COPY apps/worker/ ./apps/worker/
ENV PYTHONPATH=/app
CMD ["celery", "-A", "apps.worker.main.celery_app", "worker", "--loglevel=info"]
