# backend/core/config.py

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from dotenv import load_dotenv
import os

load_dotenv("backend/.env")


class Settings(BaseSettings):
    # -------------------------------------------------
    # APP
    # -------------------------------------------------
    ENV: str = "development"
    APP_NAME: str = "PredAI Backend"
    BASE_URL: str

    # -------------------------------------------------
    # DATABASE
    # -------------------------------------------------
    DATABASE_URL: str

    # -------------------------------------------------
    # REDIS (UPSTASH)
    # -------------------------------------------------
    UPSTASH_REDIS_REST_URL: str
    UPSTASH_REDIS_REST_TOKEN: str

    # -------------------------------------------------
    # AUTH / WALLET
    # -------------------------------------------------
    REOWN_PROJECT_ID: str
    PHANTOM_CLIENT_ID: Optional[str]

    # -------------------------------------------------
    # BLOCKCHAIN
    # -------------------------------------------------
    ALCHEMY_API_KEY: str
    CHAIN_ID: int = 137  # Polygon mainnet default
    RPC_URL: str

    # -------------------------------------------------
    # PAYMENTS
    # -------------------------------------------------
    STRIPE_SECRET_KEY: str
    TRANSAK_API_KEY: str
    TRANSAK_API_SECRET: str

    # -------------------------------------------------
    # EMAIL
    # -------------------------------------------------
    RESEND_API_KEY: str
    FROM_EMAIL: str = "noreply@predai.in"

    # -------------------------------------------------
    # OBSERVABILITY
    # -------------------------------------------------
    SENTRY_DSN: Optional[str]
    POSTHOG_API_KEY: Optional[str]
    POSTHOG_HOST: Optional[str] = "https://app.posthog.com"

    # -------------------------------------------------
    # AI
    # -------------------------------------------------
    OPENAI_API_KEY: str
    AI_MODEL: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
