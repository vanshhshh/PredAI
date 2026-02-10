// File: backend/rust-core/src/oracle_consensus.rs
/*
PURPOSE
-------
Oracle consensus computation engine.

This module:
- aggregates oracle submissions
- computes weighted consensus outcomes
- outputs deterministic confidence scores
- is used by backend services for settlement decisions

DESIGN RULES (from docs)
------------------------
- Pure computation (no IO, no globals)
- Deterministic given same inputs
- Resistant to outliers
- Panic-free (returns Result)
*/

use pyo3::prelude::*;
use pyo3::exceptions::PyValueError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OracleVote {
    pub oracle_id: String,
    pub stake: u128,
    pub outcome: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsensusResult {
    pub outcome: bool,
    pub confidence_bps: u32,
}

#[pyfunction]
pub fn compute_consensus(
    votes: Vec<(String, u128, bool)>
) -> PyResult<(bool, u32)> {
    if votes.is_empty() {
        return Err(PyValueError::new_err("NO_ORACLE_VOTES"));
    }

    let internal_votes: Vec<OracleVote> = votes
        .into_iter()
        .map(|(oracle_id, stake, outcome)| OracleVote {
            oracle_id,
            stake,
            outcome,
        })
        .collect();

    let mut yes_weight: u128 = 0;
    let mut no_weight: u128 = 0;

    for vote in internal_votes.iter() {
        if vote.outcome {
            yes_weight += vote.stake;
        } else {
            no_weight += vote.stake;
        }
    }

    let total = yes_weight + no_weight;
    if total == 0 {
        return Err(PyValueError::new_err("ZERO_TOTAL_STAKE"));
    }

    let outcome = yes_weight >= no_weight;
    let winning_weight = if outcome { yes_weight } else { no_weight };
    let confidence_bps = ((winning_weight * 10_000) / total) as u32;

    Ok((outcome, confidence_bps))
}
