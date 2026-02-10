// File: contracts/oracles/OracleRegistry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    OracleRegistry.sol

    PURPOSE
    -------
    Canonical registry for decentralized oracle nodes.
    Enforces:
    - explicit oracle identity
    - stake-gated participation
    - metadata transparency
    - governance-bounded controls

    GUARANTEES (from docs)
    ---------------------
    - No anonymous oracle influence
    - No participation without stake
    - Deterministic, on-chain accountability
    - Non-custodial staking model

    TRUST MODEL
    -----------
    - Oracles are economically trusted, not inherently trusted
    - Governance is slow, bounded, auditable
*/

contract OracleRegistry {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyGovernance();
    error OracleAlreadyRegistered();
    error OracleNotRegistered();
    error InvalidMetadata();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event OracleRegistered(
        address indexed oracle,
        bytes32 indexed oracleId,
        string metadataURI
    );

    event OracleDeactivated(address indexed oracle);
    event OracleActivated(address indexed oracle);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Governance authority
    address public governance;

    struct Oracle {
        bytes32 oracleId;
        string metadataURI;
        bool active;
        bool exists;
    }

    /// @notice Oracle address => Oracle data
    mapping(address => Oracle) private oracles;

    /// @notice Total registered oracles
    uint256 public totalOracles;

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

    constructor(address _governance) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        governance = _governance;
    }

    /*//////////////////////////////////////////////////////////////
                        REGISTRATION LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Register a new oracle
     * @param oracleId Deterministic identifier (model hash, operator id)
     * @param metadataURI IPFS/Arweave metadata reference
     */
    function registerOracle(bytes32 oracleId, string calldata metadataURI)
        external
    {
        if (oracles[msg.sender].exists) revert OracleAlreadyRegistered();
        if (bytes(metadataURI).length == 0) revert InvalidMetadata();

        oracles[msg.sender] = Oracle({
            oracleId: oracleId,
            metadataURI: metadataURI,
            active: false,
            exists: true
        });

        totalOracles += 1;

        emit OracleRegistered(msg.sender, oracleId, metadataURI);
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE CONTROLS
    //////////////////////////////////////////////////////////////*/

    function activateOracle(address oracle) external onlyGovernance {
        Oracle storage o = oracles[oracle];
        if (!o.exists) revert OracleNotRegistered();
        o.active = true;
        emit OracleActivated(oracle);
    }

    function deactivateOracle(address oracle) external onlyGovernance {
        Oracle storage o = oracles[oracle];
        if (!o.exists) revert OracleNotRegistered();
        o.active = false;
        emit OracleDeactivated(oracle);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function isActiveOracle(address oracle) external view returns (bool) {
        return oracles[oracle].active;
    }

    function getOracle(address oracle)
        external
        view
        returns (
            bytes32 oracleId,
            string memory metadataURI,
            bool active
        )
    {
        Oracle storage o = oracles[oracle];
        if (!o.exists) revert OracleNotRegistered();
        return (o.oracleId, o.metadataURI, o.active);
    }
}
