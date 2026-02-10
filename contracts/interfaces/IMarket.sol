// File: contracts/interfaces/IMarket.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    IMarket.sol

    PURPOSE
    -------
    Canonical interface for prediction market contracts.

    This interface defines the MINIMUM surface area required
    for any market implementation to integrate with:
    - oracles
    - settlement engines
    - outcome wrappers
    - off-chain indexers

    DESIGN RULES (from docs)
    ------------------------
    - No custody assumptions
    - No off-chain dependencies
    - Deterministic behavior
    - Settlement immutability

    Any market implementation MUST satisfy this interface.
*/

interface IMarket {
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event BetPlaced(address indexed user, bool outcome, uint256 amount);
    event MarketSettled(bool outcome);
    event PayoutClaimed(address indexed user, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                                VIEW
    //////////////////////////////////////////////////////////////*/

    function marketId() external view returns (bytes32);
    function startTime() external view returns (uint256);
    function endTime() external view returns (uint256);
    function maxExposure() external view returns (uint256);

    function settled() external view returns (bool);
    function finalOutcome() external view returns (bool);

    function totalYes() external view returns (uint256);
    function totalNo() external view returns (uint256);

    function yesBets(address user) external view returns (uint256);
    function noBets(address user) external view returns (uint256);

    /*//////////////////////////////////////////////////////////////
                            CORE ACTIONS
    //////////////////////////////////////////////////////////////*/

    function betYes() external payable;
    function betNo() external payable;

    function settle(bool outcome) external;
    function claim() external;
}
