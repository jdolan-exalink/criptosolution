FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y git
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY libs/ ./libs/
COPY apps/api/ ./apps/api/
ENV PYTHONPATH=/app
CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
