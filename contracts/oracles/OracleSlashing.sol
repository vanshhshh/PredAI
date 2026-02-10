// File: contracts/oracles/OracleSlashing.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    OracleSlashing.sol

    PURPOSE
    -------
    Deterministic slashing executor for oracle misbehavior.
    This contract:
    - applies slashing based on finalized consensus
    - enforces proportional penalties
    - emits full audit trails
    - never exercises discretionary judgment

    GUARANTEES (from docs)
    ---------------------
    - Slashing is attributable and replayable
    - No silent or off-chain punishment
    - Governance-bounded authority
    - Non-custodial fund handling

    TRUST MODEL
    -----------
    - OracleConsensus provides final truth
    - Governance authorizes execution
*/

import {OracleConsensus} from "./OracleConsensus.sol";
import {OracleStaking} from "./OracleStaking.sol";
import {OracleRegistry} from "./OracleRegistry.sol";

contract OracleSlashing {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyGovernance();
    error ConsensusNotFinalized();
    error OracleNotEligible();
    error InvalidSlashAmount();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event OracleSlashed(
        address indexed oracle,
        address indexed market,
        uint256 amount
    );

    event SlashRateUpdated(uint256 newSlashBps);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    address public governance;

    OracleConsensus public immutable oracleConsensus;
    OracleStaking public immutable oracleStaking;
    OracleRegistry public immutable oracleRegistry;

    /// @notice Base slashing rate in basis points
    uint256 public baseSlashBps;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _governance,
        address _oracleConsensus,
        address _oracleStaking,
        address _oracleRegistry,
        uint256 _baseSlashBps
    ) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(_oracleConsensus != address(0), "INVALID_CONSENSUS");
        require(_oracleStaking != address(0), "INVALID_STAKING");
        require(_oracleRegistry != address(0), "INVALID_REGISTRY");
        require(_baseSlashBps <= 10_000, "INVALID_SLASH");

        governance = _governance;
        oracleConsensus = OracleConsensus(_oracleConsensus);
        oracleStaking = OracleStaking(_oracleStaking);
        oracleRegistry = OracleRegistry(_oracleRegistry);
        baseSlashBps = _baseSlashBps;
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE CONTROLS
    //////////////////////////////////////////////////////////////*/

    function updateBaseSlash(uint256 newSlashBps)
        external
        onlyGovernance
    {
        require(newSlashBps <= 10_000, "INVALID_SLASH");
        baseSlashBps = newSlashBps;
        emit SlashRateUpdated(newSlashBps);
    }

    /*//////////////////////////////////////////////////////////////
                        SLASHING LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Slash oracle after finalized consensus
     * @dev Governance-triggered, deterministic execution
     */
    function slashOracle(
        address oracle,
        address market,
        bool oracleOutcome
    ) external onlyGovernance {
        if (!oracleConsensus.isFinalized(market))
            revert ConsensusNotFinalized();

        if (!oracleRegistry.isActiveOracle(oracle))
            revert OracleNotEligible();

        bool finalOutcome = oracleConsensus.getOutcome(market);

        if (oracleOutcome == finalOutcome) {
            return; // correct oracle, no slash
        }

        uint256 stake = oracleStaking.getStake(oracle);
        if (stake == 0) revert InvalidSlashAmount();

        uint256 slashAmount =
            (stake * baseSlashBps) / 10_000;

        oracleStaking.slash(oracle, slashAmount);

        emit OracleSlashed(oracle, market, slashAmount);
    }
}
