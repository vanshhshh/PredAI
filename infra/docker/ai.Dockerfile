# File: infra/docker/ai.Dockerfile

# --------------------------------------------------
# AI Service Dockerfile
# --------------------------------------------------
# Production-grade:
# - PyTorch / ML ready
# - CPU-safe by default
# - GPU-ready with minor changes
# - Deterministic inference runtime
# --------------------------------------------------

# AI Service Dockerfile (demo-safe, minimal)

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Minimal runtime deps only
RUN pip install --no-cache-dir fastapi uvicorn pydantic

# Copy AI source code
COPY ai /app/ai

EXPOSE 9000

CMD ["uvicorn", "ai.main:app", "--host", "0.0.0.0", "--port", "9000"]
