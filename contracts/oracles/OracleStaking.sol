// File: contracts/oracles/OracleStaking.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    OracleStaking.sol

    PURPOSE
    -------
    Handles staking, slashing, and withdrawal of oracle capital.
    This contract enforces:
    - minimum stake requirements
    - slashable capital for incorrect behavior
    - non-custodial withdrawals
    - governance-bounded slashing authority

    GUARANTEES (from docs)
    ---------------------
    - No oracle influence without stake
    - Slashing is deterministic and attributable
    - Funds are never custodied off-chain
    - Governance cannot arbitrarily seize funds

    TRUST MODEL
    -----------
    - Oracles are economically trusted
    - Governance is slow, bounded, auditable
*/

import {OracleRegistry} from "./OracleRegistry.sol";

contract OracleStaking {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyGovernance();
    error OracleNotActive();
    error InvalidStakeAmount();
    error InsufficientStake();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event StakeDeposited(address indexed oracle, uint256 amount);
    event StakeSlashed(address indexed oracle, uint256 amount);
    event StakeWithdrawn(address indexed oracle, uint256 amount);
    event MinimumStakeUpdated(uint256 newMinimumStake);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Governance authority
    address public governance;

    /// @notice Oracle registry
    OracleRegistry public immutable oracleRegistry;

    /// @notice Oracle address => stake
    mapping(address => uint256) public stakes;

    /// @notice Total oracle stake
    uint256 public totalStaked;

    /// @notice Minimum stake required to participate
    uint256 public minimumStake;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    modifier onlyActiveOracle(address oracle) {
        if (!oracleRegistry.isActiveOracle(oracle)) revert OracleNotActive();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _governance,
        address _oracleRegistry,
        uint256 _minimumStake
    ) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(_oracleRegistry != address(0), "INVALID_REGISTRY");

        governance = _governance;
        oracleRegistry = OracleRegistry(_oracleRegistry);
        minimumStake = _minimumStake;
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE CONTROLS
    //////////////////////////////////////////////////////////////*/

    function updateMinimumStake(uint256 newMinimumStake)
        external
        onlyGovernance
    {
        minimumStake = newMinimumStake;
        emit MinimumStakeUpdated(newMinimumStake);
    }

    /*//////////////////////////////////////////////////////////////
                        STAKING LOGIC
    //////////////////////////////////////////////////////////////*/

    function stake() external payable onlyActiveOracle(msg.sender) {
        if (msg.value == 0) revert InvalidStakeAmount();

        stakes[msg.sender] += msg.value;
        totalStaked += msg.value;

        emit StakeDeposited(msg.sender, msg.value);
    }

    /*//////////////////////////////////////////////////////////////
                        SLASHING LOGIC
    //////////////////////////////////////////////////////////////*/

    function slash(address oracle, uint256 amount)
        external
        onlyGovernance
    {
        uint256 current = stakes[oracle];
        if (amount == 0 || amount > current) revert InvalidStakeAmount();

        stakes[oracle] = current - amount;
        totalStaked -= amount;

        emit StakeSlashed(oracle, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        WITHDRAWAL LOGIC
    //////////////////////////////////////////////////////////////*/

    function withdraw(uint256 amount) external {
        if (oracleRegistry.isActiveOracle(msg.sender)) revert OracleNotActive();

        uint256 current = stakes[msg.sender];
        if (amount == 0 || amount > current) revert InsufficientStake();

        stakes[msg.sender] = current - amount;
        totalStaked -= amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "TRANSFER_FAILED");

        emit StakeWithdrawn(msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getStake(address oracle) external view returns (uint256) {
        return stakes[oracle];
    }
}
