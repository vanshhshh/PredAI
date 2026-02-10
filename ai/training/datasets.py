# File: ai/training/datasets.py
"""
PURPOSE
-------
Canonical dataset loading, normalization, and versioning layer
for ALL AI training pipelines in the system.

This module:
- defines how raw data becomes model-ready tensors
- enforces schema consistency across agents and models
- supports deterministic dataset versioning
- is shared by training, evaluation, and backtesting

DESIGN RULES (from docs)
------------------------
- No model logic here
- No network calls (data is injected / pre-fetched)
- Deterministic transforms only
- Explicit schemas, no implicit fields
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Iterable
import hashlib
import json


# -------------------------------------------------------------------
# DATA SCHEMAS
# -------------------------------------------------------------------

@dataclass(frozen=True)
class MarketSample:
    """
    Single training sample for market prediction.
    """
    market_id: str
    timestamp: int
    features: Dict[str, float]
    label: int  # 0 or 1


@dataclass(frozen=True)
class SocialSample:
    """
    Training sample derived from social signals.
    """
    timestamp: int
    sentiment: float
    volume: float
    velocity: float
    label: int


# -------------------------------------------------------------------
# DATASET CONTAINERS
# -------------------------------------------------------------------

class Dataset:
    """
    Immutable dataset wrapper with versioning support.
    """

    def __init__(self, samples: Iterable[Any]):
        self._samples: List[Any] = list(samples)
        self._version = self._compute_version(self._samples)

    @property
    def samples(self) -> List[Any]:
        return self._samples

    @property
    def version(self) -> str:
        """
        Deterministic hash of dataset contents.
        Used for reproducibility and audits.
        """
        return self._version

    # ------------------------------------------------------------------

    @staticmethod
    def _compute_version(samples: List[Any]) -> str:
        """
        Compute a stable hash for dataset contents.
        """
        payload = json.dumps(
            [sample.__dict__ for sample in samples],
            sort_keys=True,
        ).encode("utf-8")

        return hashlib.sha256(payload).hexdigest()


# -------------------------------------------------------------------
# NORMALIZATION UTILITIES
# -------------------------------------------------------------------

def normalize_market_features(
    raw: Dict[str, Any],
) -> Dict[str, float]:
    """
    Normalize raw market data into model-ready features.

    Expected raw keys:
    - price_yes
    - price_no
    - liquidity
    - volume_24h
    """

    return {
        "price_yes": float(raw.get("price_yes", 0.0)),
        "price_no": float(raw.get("price_no", 0.0)),
        "liquidity": float(raw.get("liquidity", 0.0)),
        "volume_24h": float(raw.get("volume_24h", 0.0)),
    }


def normalize_social_features(
    raw: Dict[str, Any],
) -> Dict[str, float]:
    """
    Normalize raw social metrics.
    """
    return {
        "sentiment": float(raw.get("sentiment", 0.0)),
        "volume": float(raw.get("volume", 0.0)),
        "velocity": float(raw.get("velocity", 0.0)),
    }
