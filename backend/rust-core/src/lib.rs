// File: backend/rust-core/src/lib.rs
/*
PURPOSE
-------
Root library for the Rust core.

This crate exposes high-performance, safety-critical primitives used by
the Python backend for:
- oracle consensus math
- agent scoring
- risk calculations

DESIGN RULES (from docs)
------------------------
- Deterministic execution
- No network / IO
- No global mutable state
- Panic-free public APIs
- Explicit error handling
*/

use pyo3::prelude::*;

pub mod oracle_consensus;
pub mod risk_engine;
pub mod scoring;

#[pymodule]
fn rust_core(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(oracle_consensus::compute_consensus, m)?)?;
    m.add_function(wrap_pyfunction!(risk_engine::compute_risk_score, m)?)?;
    m.add_function(wrap_pyfunction!(scoring::compute_agent_score, m)?)?;
    Ok(())
}
