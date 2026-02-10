// File: contracts/interfaces/IOracle.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    IOracle.sol

    PURPOSE
    -------
    Canonical interface for oracle participants in the protocol.

    This interface defines the minimum surface area required
    for oracle implementations to:
    - register identity
    - stake capital
    - submit outcomes
    - be slashable

    DESIGN RULES (from docs)
    ------------------------
    - Oracles are economically accountable
    - No oracle has unilateral authority
    - All submissions are attributable
    - Slashing is deterministic and auditable
*/

interface IOracle {
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event OracleRegistered(address indexed oracle, bytes32 oracleId);
    event OracleActivated(address indexed oracle);
    event OracleDeactivated(address indexed oracle);
    event OutcomeSubmitted(
        address indexed oracle,
        address indexed market,
        bool outcome
    );

    /*//////////////////////////////////////////////////////////////
                                VIEW
    //////////////////////////////////////////////////////////////*/

    function oracleId() external view returns (bytes32);
    function metadataURI() external view returns (string memory);
    function stake() external view returns (uint256);
    function active() external view returns (bool);

    /*//////////////////////////////////////////////////////////////
                            CORE ACTIONS
    //////////////////////////////////////////////////////////////*/

    function register(bytes32 oracleId, string calldata metadataURI) external;
    function stake() external payable;
    function submitOutcome(address market, bool outcome) external;
    function deactivate() external;
}
