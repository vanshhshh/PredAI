// File: contracts/libraries/Math.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    Math.sol

    PURPOSE
    -------
    Canonical math utility library used across the protocol.

    This library provides:
    - safe arithmetic helpers
    - fixed-point math primitives
    - bounded ratio calculations
    - deterministic rounding rules

    DESIGN RULES (from docs)
    ------------------------
    - No silent overflows (Solidity ^0.8 handles this)
    - Explicit rounding behavior
    - No external dependencies
    - Gas-efficient where possible

    IMPORTANT
    ---------
    This library must be:
    - pure
    - stateless
    - deterministic
*/

library Math {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant BPS = 10_000;

    /*//////////////////////////////////////////////////////////////
                        BASIC HELPERS
    //////////////////////////////////////////////////////////////*/

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    /*//////////////////////////////////////////////////////////////
                        FIXED POINT MATH
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Multiply two WAD numbers, rounding down
     */
    function mulWadDown(uint256 a, uint256 b)
        internal
        pure
        returns (uint256)
    {
        return (a * b) / WAD;
    }

    /**
     * @notice Multiply two WAD numbers, rounding up
     */
    function mulWadUp(uint256 a, uint256 b)
        internal
        pure
        returns (uint256)
    {
        if (a == 0 || b == 0) return 0;
        return ((a * b) + WAD - 1) / WAD;
    }

    /**
     * @notice Divide two numbers into WAD, rounding down
     */
    function divWadDown(uint256 a, uint256 b)
        internal
        pure
        returns (uint256)
    {
        require(b != 0, "DIV_BY_ZERO");
        return (a * WAD) / b;
    }

    /**
     * @notice Divide two numbers into WAD, rounding up
     */
    function divWadUp(uint256 a, uint256 b)
        internal
        pure
        returns (uint256)
    {
        require(b != 0, "DIV_BY_ZERO");
        if (a == 0) return 0;
        return ((a * WAD) + b - 1) / b;
    }

    /*//////////////////////////////////////////////////////////////
                        BASIS POINT MATH
    //////////////////////////////////////////////////////////////*/

    function applyBps(
        uint256 amount,
        uint256 bps
    ) internal pure returns (uint256) {
        require(bps <= BPS, "BPS_TOO_HIGH");
        return (amount * bps) / BPS;
    }

    function inverseBps(
        uint256 amount,
        uint256 bps
    ) internal pure returns (uint256) {
        require(bps <= BPS, "BPS_TOO_HIGH");
        return (amount * (BPS - bps)) / BPS;
    }

    /*//////////////////////////////////////////////////////////////
                        RATIO SAFETY
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Compute ratio capped to maxBps
     */
    function cappedRatioBps(
        uint256 numerator,
        uint256 denominator,
        uint256 maxBps
    ) internal pure returns (uint256) {
        require(denominator != 0, "DIV_BY_ZERO");
        uint256 ratio = (numerator * BPS) / denominator;
        return min(ratio, maxBps);
    }
}
