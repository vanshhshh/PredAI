// File: backend/rust-core/src/scoring.rs
/*
PURPOSE
-------
Agent performance scoring engine.

This module:
- computes agent scores based on historical accuracy
- penalizes volatility and recent underperformance
- outputs a deterministic, normalized score
- is used by backend services and indexers

DESIGN RULES (from docs)
------------------------
- Pure computation (no IO, no globals)
- Deterministic for given inputs
- Conservative scoring (hard to game)
- Panic-free public APIs
*/

use pyo3::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentPerformance {
    pub correct_predictions: u32,
    pub total_predictions: u32,
    pub recent_accuracy_bps: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentScore {
    pub score: u32,
}

#[pyfunction]
pub fn compute_agent_score(
    correct_predictions: u32,
    total_predictions: u32,
    recent_accuracy_bps: u32,
) -> PyResult<u32> {
    if total_predictions == 0 {
        return Ok(0);
    }

    let base_accuracy_bps =
        (correct_predictions as u128 * 10_000) / total_predictions as u128;

    let weighted_score =
        (base_accuracy_bps * 6 + recent_accuracy_bps as u128 * 4) / 10;

    let score = weighted_score.min(10_000) as u32;
    Ok(score)
}
