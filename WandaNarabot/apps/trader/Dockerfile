FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y git
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY libs/ ./libs/
COPY apps/trader/ ./apps/trader/
ENV PYTHONPATH=/app
CMD ["python", "-m", "apps.trader.main"]
