// File: contracts/libraries/Risk.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    Risk.sol

    PURPOSE
    -------
    Canonical risk-evaluation helper library for the protocol.

    This library centralizes:
    - exposure checks
    - risk score validation
    - invariant enforcement helpers
    - deterministic risk gating

    DESIGN RULES (from docs)
    ------------------------
    - Safety > Yield
    - Deterministic checks only
    - No state, no side effects
    - Explicit failure on violation

    This library is used by:
    - CapitalRouter
    - RiskAllocator
    - Yield strategies
*/

library Risk {
    uint256 internal constant MAX_RISK_SCORE = 10_000;

    /*//////////////////////////////////////////////////////////////
                        RISK SCORE VALIDATION
    //////////////////////////////////////////////////////////////*/

    function validateRiskScore(uint256 riskScore) internal pure {
        require(riskScore <= MAX_RISK_SCORE, "RISK_SCORE_TOO_HIGH");
    }

    /*//////////////////////////////////////////////////////////////
                        EXPOSURE CHECKS
    //////////////////////////////////////////////////////////////*/

    function checkExposure(
        uint256 currentExposure,
        uint256 delta,
        uint256 maxExposure
    ) internal pure {
        require(
            currentExposure + delta <= maxExposure,
            "EXPOSURE_LIMIT_EXCEEDED"
        );
    }

    /*//////////////////////////////////////////////////////////////
                        SYSTEMIC SAFETY
    //////////////////////////////////////////////////////////////*/

    function ensureNonZero(uint256 value) internal pure {
        require(value != 0, "ZERO_VALUE");
    }

    function ensureAddress(address a) internal pure {
        require(a != address(0), "ZERO_ADDRESS");
    }
}
