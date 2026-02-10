# File: infra/docker/backend.Dockerfile

# --------------------------------------------------
# Backend Service Dockerfile (FastAPI + Rust core)
# --------------------------------------------------
# Production-grade:
# - Multi-stage build
# - Slim runtime
# - Deterministic dependencies
# - Safe for Kubernetes
# --------------------------------------------------
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------
# Python deps
# -----------------------------
FROM base AS deps
COPY backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && \
    pip install \
      --no-cache-dir \
      --default-timeout=100 \
      --retries=10 \
      -r requirements.txt
# -----------------------------
# Rust build
# -----------------------------
FROM rust:1.75-slim AS rust-build

# Install Python for PyO3
RUN apt-get update && apt-get install -y \
    python3 \
    python3-dev \
    python3-venv \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PYO3_PYTHON=/usr/bin/python3

WORKDIR /rust
COPY backend/rust-core ./rust-core
WORKDIR /rust/rust-core

RUN cargo build --release --features python-bindings



# -----------------------------
# Runtime
# -----------------------------
FROM base AS runtime

COPY --from=deps /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=deps /usr/local/bin /usr/local/bin

COPY backend /app/backend
COPY --from=rust-build /rust/rust-core/target/release /app/rust-core

RUN useradd -m appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
