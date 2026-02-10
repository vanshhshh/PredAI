// File: contracts/libraries/SafeCast.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    SafeCast.sol

    PURPOSE
    -------
    Canonical safe casting library for narrowing and widening integer types.

    This library exists to:
    - prevent silent overflows when downcasting
    - make intent explicit
    - enforce deterministic failure on invalid casts

    DESIGN RULES (from docs)
    ------------------------
    - No unchecked casts
    - Explicit bounds
    - Pure functions only
    - Revert on failure, never clamp

    This library is intentionally minimal and audited.
*/

library SafeCast {
    /*//////////////////////////////////////////////////////////////
                        SIGNED <-> UNSIGNED
    //////////////////////////////////////////////////////////////*/

    function toUint256(int256 value) internal pure returns (uint256) {
        require(value >= 0, "INT_NEGATIVE");
        return uint256(value);
    }

    function toInt256(uint256 value) internal pure returns (int256) {
        require(value <= uint256(type(int256).max), "UINT_OVERFLOW");
        return int256(value);
    }

    /*//////////////////////////////////////////////////////////////
                        UINT DOWNSIZING
    //////////////////////////////////////////////////////////////*/

    function toUint128(uint256 value) internal pure returns (uint128) {
        require(value <= type(uint128).max, "UINT128_OVERFLOW");
        return uint128(value);
    }

    function toUint64(uint256 value) internal pure returns (uint64) {
        require(value <= type(uint64).max, "UINT64_OVERFLOW");
        return uint64(value);
    }

    function toUint32(uint256 value) internal pure returns (uint32) {
        require(value <= type(uint32).max, "UINT32_OVERFLOW");
        return uint32(value);
    }

    function toUint16(uint256 value) internal pure returns (uint16) {
        require(value <= type(uint16).max, "UINT16_OVERFLOW");
        return uint16(value);
    }

    function toUint8(uint256 value) internal pure returns (uint8) {
        require(value <= type(uint8).max, "UINT8_OVERFLOW");
        return uint8(value);
    }

    /*//////////////////////////////////////////////////////////////
                        INT DOWNSIZING
    //////////////////////////////////////////////////////////////*/

    function toInt128(int256 value) internal pure returns (int128) {
        require(
            value >= type(int128).min && value <= type(int128).max,
            "INT128_OVERFLOW"
        );
        return int128(value);
    }

    function toInt64(int256 value) internal pure returns (int64) {
        require(
            value >= type(int64).min && value <= type(int64).max,
            "INT64_OVERFLOW"
        );
        return int64(value);
    }

    function toInt32(int256 value) internal pure returns (int32) {
        require(
            value >= type(int32).min && value <= type(int32).max,
            "INT32_OVERFLOW"
        );
        return int32(value);
    }

    function toInt16(int256 value) internal pure returns (int16) {
        require(
            value >= type(int16).min && value <= type(int16).max,
            "INT16_OVERFLOW"
        );
        return int16(value);
    }

    function toInt8(int256 value) internal pure returns (int8) {
        require(
            value >= type(int8).min && value <= type(int8).max,
            "INT8_OVERFLOW"
        );
        return int8(value);
    }
}
