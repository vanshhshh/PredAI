FROM python:3.11-slim

# Runtime defaults for containerized Python services.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first for better Docker layer caching.
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --upgrade pip && \
    pip install -r /app/backend/requirements.txt

# Copy backend source after dependencies.
COPY backend /app/backend

# Drop root privileges for runtime safety.
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Migration-first startup, then API workers.
CMD ["sh", "-c", "alembic -c /app/backend/alembic.ini upgrade head && uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --workers 2"]
