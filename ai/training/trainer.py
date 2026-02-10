# File: ai/training/trainer.py
"""
PURPOSE
-------
Unified training loop for ALL AI models in the platform.

This module:
- orchestrates dataset → model → optimization
- enforces reproducibility and auditability
- logs metrics deterministically
- is framework-agnostic (PyTorch/JAX wrappers plug in here)

DESIGN RULES (from docs)
------------------------
- No network calls
- No hard-coded paths
- Deterministic given (dataset, config, seed)
- No agent logic here (agents consume trained models)
"""

from typing import Any, Dict, Callable, Optional
import random
import numpy as np

from ai.training.datasets import Dataset


class TrainingResult:
    """
    Immutable container for training outputs.
    """

    def __init__(
        self,
        *,
        model_state: Any,
        metrics: Dict[str, float],
        dataset_version: str,
        seed: int,
    ):
        self.model_state = model_state
        self.metrics = metrics
        self.dataset_version = dataset_version
        self.seed = seed


class Trainer:
    """
    Generic trainer abstraction.

    Concrete ML frameworks must provide:
    - model_factory
    - loss_fn
    - optimizer_factory
    """

    def __init__(
        self,
        *,
        model_factory: Callable[[Dict[str, Any]], Any],
        loss_fn: Callable[[Any, Any], float],
        optimizer_factory: Callable[[Any, Dict[str, Any]], Any],
        config: Dict[str, Any],
        seed: int = 42,
    ):
        self.model_factory = model_factory
        self.loss_fn = loss_fn
        self.optimizer_factory = optimizer_factory
        self.config = config
        self.seed = seed

        self._set_seed(seed)

    # ------------------------------------------------------------------
    # TRAINING
    # ------------------------------------------------------------------

    def train(
        self,
        *,
        dataset: Dataset,
    ) -> TrainingResult:
        """
        Execute training loop.

        NOTE:
        -----
        This method assumes:
        - dataset.samples yields (features, label)–compatible objects
        - framework-specific tensor conversion happens in model/loss
        """

        model = self.model_factory(self.config)
        optimizer = self.optimizer_factory(model, self.config)

        epochs = self.config.get("epochs", 1)

        total_loss = 0.0
        for _ in range(epochs):
            for sample in dataset.samples:
                features = sample.features
                label = sample.label

                prediction = model.forward(features)
                loss = self.loss_fn(prediction, label)

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

                total_loss += float(loss)

        avg_loss = total_loss / max(len(dataset.samples), 1)

        metrics = {
            "avg_loss": avg_loss,
        }

        return TrainingResult(
            model_state=model.get_state(),
            metrics=metrics,
            dataset_version=dataset.version,
            seed=self.seed,
        )

    # ------------------------------------------------------------------
    # UTILITIES
    # ------------------------------------------------------------------

    @staticmethod
    def _set_seed(seed: int):
        random.seed(seed)
        np.random.seed(seed)
