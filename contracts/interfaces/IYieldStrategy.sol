// File: contracts/interfaces/IYieldStrategy.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    IYieldStrategy.sol

    PURPOSE
    -------
    Canonical interface for yield-generating strategies used by the protocol.

    This interface defines the minimum surface area required
    for any strategy that wishes to:
    - receive routed idle capital
    - generate yield deterministically
    - unwind capital on demand
    - respect protocol risk constraints

    DESIGN RULES (from docs)
    ------------------------
    - No leverage unless explicitly approved
    - Deterministic exits must be possible
    - No custody of user keys
    - Strategy failures must fail closed, not open
*/

interface IYieldStrategy {
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event CapitalDeployed(uint256 amount);
    event CapitalWithdrawn(uint256 amount);
    event YieldRealized(uint256 amount);

    /*//////////////////////////////////////////////////////////////
                                VIEW
    //////////////////////////////////////////////////////////////*/

    function totalDeployed() external view returns (uint256);
    function pendingYield() external view returns (uint256);
    function riskScore() external view returns (uint256);

    /*//////////////////////////////////////////////////////////////
                            CORE ACTIONS
    //////////////////////////////////////////////////////////////*/

    function deploy(uint256 amount) external;
    function unwind(uint256 amount) external;
    function harvest() external;
}
