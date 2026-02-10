# backend/infra/transak.py

from backend.core.config import settings

TRANSAK_CONFIG = {
    "apiKey": settings.TRANSAK_API_KEY,
    "environment": "PRODUCTION",
}
