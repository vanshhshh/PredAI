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
    CHAIN_ID: int = 137
    ALLOW_TESTNET: bool = os.getenv("ALLOW_TESTNET", "false").lower() == "true"
    RPC_URL: str
    CHAIN_SIGNER_PRIVATE_KEY: Optional[str] = None
    MARKET_CREATION_BOND_UNITS: int = 0
    MARKET_FACTORY_ADDRESS: Optional[str] = None
    SETTLEMENT_ENGINE_ADDRESS: Optional[str] = None
    COLLATERAL_TOKEN_ADDRESS: Optional[str] = None
    FEE_TREASURY_ADDRESS: Optional[str] = None
    AGENT_REGISTRY_ADDRESS: Optional[str] = None
    ORACLE_REGISTRY_ADDRESS: Optional[str] = None
    ORACLE_STAKING_ADDRESS: Optional[str] = None
    ORACLE_CONSENSUS_ADDRESS: Optional[str] = None
    OUTCOME_WRAPPER_ADDRESS: Optional[str] = None
    CROSS_CHAIN_ADAPTER_ADDRESS: Optional[str] = None
    RWA_REGISTRY_ADDRESS: Optional[str] = None
    GOVERNANCE_DAO_ADDRESS: Optional[str] = None

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

    if cfg.ALLOW_TESTNET:
        errors.append("ALLOW_TESTNET_DISALLOWED_IN_PRODUCTION")
    if cfg.CHAIN_ID != 137:
        errors.append("CHAIN_ID_MUST_BE_137")
    if _is_local_url(cfg.BASE_URL):
        errors.append("BASE_URL_LOCALHOST_DISALLOWED")
    if _is_local_url(cfg.RPC_URL):
        errors.append("RPC_URL_LOCALHOST_DISALLOWED")
    if _is_local_url(cfg.RUST_CORE_URL):
        errors.append("RUST_CORE_URL_LOCALHOST_DISALLOWED")
    if not cfg.JWT_SECRET or len(cfg.JWT_SECRET.strip()) < 32:
        errors.append("JWT_SECRET_WEAK_OR_MISSING")
    if os.getenv("RATE_LIMIT_FAIL_OPEN", "false").lower() == "true":
        errors.append("RATE_LIMIT_FAIL_OPEN_DISALLOWED")
    if os.getenv("DB_STRICT_STARTUP", "true").lower() != "true":
        errors.append("DB_STRICT_STARTUP_REQUIRED")
    if "MARKET_CREATION_BOND_UNITS" not in os.environ:
        errors.append("MARKET_CREATION_BOND_UNITS_REQUIRED")
    if os.getenv("AUTONOMOUS_AGENT_LIVE_TRADING", "false").lower() == "true":
        live_agent_required = {
            "AUTONOMOUS_AGENT_PRIVATE_KEY": os.getenv("AUTONOMOUS_AGENT_PRIVATE_KEY"),
            "AUTONOMOUS_AGENT_MAX_TX_WEI": os.getenv("AUTONOMOUS_AGENT_MAX_TX_WEI"),
            "AGENT_MAX_TRADE_WEI": os.getenv("AGENT_MAX_TRADE_WEI"),
            "AGENT_MAX_MARKET_EXPOSURE_WEI": os.getenv("AGENT_MAX_MARKET_EXPOSURE_WEI"),
            "AGENT_MAX_DAILY_EXPOSURE_WEI": os.getenv("AGENT_MAX_DAILY_EXPOSURE_WEI"),
        }
        for name, value in live_agent_required.items():
            if not value:
                errors.append(f"{name}_REQUIRED_FOR_LIVE_AGENT_TRADING")
            elif name.endswith("_WEI"):
                try:
                    if int(value) <= 0:
                        errors.append(f"{name}_MUST_BE_POSITIVE")
                except ValueError:
                    errors.append(f"{name}_INVALID")

    required_addresses = {
        "MARKET_FACTORY_ADDRESS": cfg.MARKET_FACTORY_ADDRESS,
        "SETTLEMENT_ENGINE_ADDRESS": cfg.SETTLEMENT_ENGINE_ADDRESS,
        "COLLATERAL_TOKEN_ADDRESS": cfg.COLLATERAL_TOKEN_ADDRESS,
        "FEE_TREASURY_ADDRESS": cfg.FEE_TREASURY_ADDRESS,
        "ORACLE_CONSENSUS_ADDRESS": cfg.ORACLE_CONSENSUS_ADDRESS,
        "OUTCOME_WRAPPER_ADDRESS": cfg.OUTCOME_WRAPPER_ADDRESS,
        "RWA_REGISTRY_ADDRESS": cfg.RWA_REGISTRY_ADDRESS,
        "GOVERNANCE_DAO_ADDRESS": cfg.GOVERNANCE_DAO_ADDRESS,
    }
    for name, value in required_addresses.items():
        if not value:
            errors.append(f"{name}_REQUIRED")
        elif not (value.startswith("0x") and len(value) == 42):
            errors.append(f"{name}_INVALID")

    if errors:
        raise RuntimeError(f"PRODUCTION_ENV_VALIDATION_FAILED:{','.join(errors)}")


_validate_production_settings(settings)
