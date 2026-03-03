# backend/core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict
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
    CHAIN_SIGNER_PRIVATE_KEY: Optional[str] = None
    MARKET_CREATION_BOND_WEI: int = 0
    MARKET_FACTORY_ADDRESS: Optional[str] = None
    AGENT_REGISTRY_ADDRESS: Optional[str] = None
    ORACLE_REGISTRY_ADDRESS: Optional[str] = None
    ORACLE_STAKING_ADDRESS: Optional[str] = None
    ORACLE_CONSENSUS_ADDRESS: Optional[str] = None
    OUTCOME_WRAPPER_ADDRESS: Optional[str] = None
    CROSS_CHAIN_ADAPTER_ADDRESS: Optional[str] = None

    # -------------------------------------------------
    # PAYMENTS
    # -------------------------------------------------
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
    RUST_CORE_URL: Optional[str] = None

    # -------------------------------------------------
    # SECURITY / CORS
    # -------------------------------------------------
    JWT_SECRET: Optional[str] = None
    CORS_ORIGINS: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()


def _is_local_url(value: Optional[str]) -> bool:
    if not value:
        return False
    normalized = value.strip().lower()
    return "localhost" in normalized or "127.0.0.1" in normalized


def _validate_production_settings(cfg: Settings) -> None:
    env = (cfg.ENV or "").strip().lower()
    if env not in {"production", "prod"}:
        return

    errors: list[str] = []

    if cfg.CHAIN_ID == 80002:
        errors.append("CHAIN_ID_TESTNET_DISALLOWED")
    if _is_local_url(cfg.BASE_URL):
        errors.append("BASE_URL_LOCALHOST_DISALLOWED")
    if _is_local_url(cfg.RPC_URL):
        errors.append("RPC_URL_LOCALHOST_DISALLOWED")
    if _is_local_url(cfg.RUST_CORE_URL):
        errors.append("RUST_CORE_URL_LOCALHOST_DISALLOWED")
    if not cfg.JWT_SECRET or len(cfg.JWT_SECRET.strip()) < 32:
        errors.append("JWT_SECRET_WEAK_OR_MISSING")

    if errors:
        raise RuntimeError(f"PRODUCTION_ENV_VALIDATION_FAILED:{','.join(errors)}")


_validate_production_settings(settings)
