# File: ai/registry/model_registry.py
"""
PURPOSE
-------
Canonical registry for AI models.

This module:
- tracks model identities, versions, and states
- links models to datasets and training configs
- enables reproducible inference and audits
- acts as the single source of truth for model metadata

DESIGN RULES (from docs)
------------------------
- No training or inference here
- No network or filesystem IO
- Deterministic and serializable state
- Explicit versioning and immutability guarantees
"""

from typing import Dict, Optional
from dataclasses import dataclass, field
import time
import hashlib
import json


@dataclass(frozen=True)
class ModelRecord:
    """
    Immutable record describing a trained model.
    """
    model_id: str
    model_type: str
    dataset_version: str
    created_at: int
    config_hash: str
    metrics: Dict[str, float] = field(default_factory=dict)


class ModelRegistry:
    """
    In-memory model registry.

    NOTE:
    -----
    Persistence is handled by backend services.
    This registry ensures deterministic lookup and linkage.
    """

    def __init__(self):
        self._models: Dict[str, ModelRecord] = {}

    # ------------------------------------------------------------------
    # REGISTRATION
    # ------------------------------------------------------------------

    def register(
        self,
        *,
        model_id: str,
        model_type: str,
        dataset_version: str,
        config: Dict,
        metrics: Optional[Dict[str, float]] = None,
    ) -> ModelRecord:
        if model_id in self._models:
            raise ValueError("MODEL_ALREADY_REGISTERED")

        config_hash = self._hash_config(config)

        record = ModelRecord(
            model_id=model_id,
            model_type=model_type,
            dataset_version=dataset_version,
            created_at=int(time.time()),
            config_hash=config_hash,
            metrics=metrics or {},
        )

        self._models[model_id] = record
        return record

    # ------------------------------------------------------------------
    # LOOKUPS
    # ------------------------------------------------------------------

    def get(self, model_id: str) -> ModelRecord:
        if model_id not in self._models:
            raise KeyError("MODEL_NOT_FOUND")
        return self._models[model_id]

    def all_models(self) -> Dict[str, ModelRecord]:
        return dict(self._models)

    # ------------------------------------------------------------------
    # UTILITIES
    # ------------------------------------------------------------------

    @staticmethod
    def _hash_config(config: Dict) -> str:
        payload = json.dumps(config, sort_keys=True).encode("utf-8")
        return hashlib.sha256(payload).hexdigest()
