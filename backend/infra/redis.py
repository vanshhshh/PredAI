# backend/infra/redis.py

import requests
from backend.core.config import settings

HEADERS = {
    "Authorization": f"Bearer {settings.UPSTASH_REDIS_REST_TOKEN}"
}

def redis_get(key: str):
    res = requests.get(
        f"{settings.UPSTASH_REDIS_REST_URL}/get/{key}",
        headers=HEADERS
    )
    return res.json()

def redis_set(key: str, value: str):
    requests.post(
        f"{settings.UPSTASH_REDIS_REST_URL}/set/{key}/{value}",
        headers=HEADERS
    )
