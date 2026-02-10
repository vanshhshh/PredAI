// File: backend/rust-core/src/risk_engine.rs
/*
PURPOSE
-------
Risk computation engine for yield allocation and exposure control.

This module:
- computes portfolio-level risk scores
- evaluates vault risk contributions
- is used by the backend to enforce RiskAllocator bounds

DESIGN RULES (from docs)
------------------------
- Pure computation (no IO, no globals)
- Deterministic for given inputs
- Conservative by default (risk > underestimate)
- Panic-free public APIs
*/

use pyo3::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultPosition {
    pub vault_id: String,
    pub amount: u128,
    pub volatility_bps: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskResult {
    pub risk_score: u32,
}

#[pyfunction]
pub fn compute_risk_score(
    positions: Vec<(String, u128, u32)>
) -> PyResult<u32> {
    if positions.is_empty() {
        return Ok(0);
    }

    let internal_positions: Vec<VaultPosition> = positions
        .into_iter()
        .map(|(vault_id, amount, volatility_bps)| VaultPosition {
            vault_id,
            amount,
            volatility_bps,
        })
        .collect();

    let mut weighted_sum: u128 = 0;
    let mut total_amount: u128 = 0;

    for pos in internal_positions.iter() {
        weighted_sum += pos.amount * pos.volatility_bps as u128;
        total_amount += pos.amount;
    }

    if total_amount == 0 {
        return Ok(0);
    }

    let risk_score = (weighted_sum / total_amount) as u32;
    Ok(risk_score)
}
