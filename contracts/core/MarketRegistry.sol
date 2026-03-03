// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    MarketRegistry.sol

    PURPOSE
    -------
    Canonical on-chain registry of all valid prediction markets.
    Acts as the single source of truth for:
    - market existence
    - market identity
    - market validity

    DESIGN GUARANTEES
    -----------------
    - Append-only registration (no silent removals)
    - Deterministic lookups
    - Event-sourced for full replay
    - Governance-bounded controls
    - No custody of funds

    TRUST MODEL
    -----------
    - Callers are untrusted
    - Factory contracts are permissioned
    - Governance may pause or invalidate markets explicitly
*/

contract MarketRegistry {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyFactory();
    error OnlyGovernance();
    error MarketAlreadyRegistered();
    error InvalidMarketAddress();
    error MarketNotRegistered();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event MarketRegistered(
        address indexed market,
        bytes32 indexed marketId
    );

    event MarketInvalidated(
        address indexed market,
        bytes32 indexed marketId
    );

    event FactoryUpdated(address indexed newFactory);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Governance authority (DAO / Timelock)
    address public governance;

    /// @notice Authorized market factory
    address public marketFactory;

    /// @notice Market address => marketId
    mapping(address => bytes32) public marketIds;

    /// @notice Market address => validity
    mapping(address => bool) public isValidMarket;

    /// @notice Total number of markets ever registered
    uint256 public totalMarkets;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != marketFactory) revert OnlyFactory();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _governance, address _marketFactory) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(_marketFactory != address(0), "INVALID_FACTORY");

        governance = _governance;
        marketFactory = _marketFactory;
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE CONTROLS
    //////////////////////////////////////////////////////////////*/

    function updateFactory(address newFactory)
        external
        onlyGovernance
    {
        require(newFactory != address(0), "INVALID_FACTORY");
        marketFactory = newFactory;
        emit FactoryUpdated(newFactory);
    }

    /*//////////////////////////////////////////////////////////////
                        REGISTRATION LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Register a newly created market
     * @dev Callable only by authorized MarketFactory
     */
    function registerMarket(address market, bytes32 marketId)
        external
        onlyFactory
    {
        if (market == address(0)) revert InvalidMarketAddress();
        if (isValidMarket[market]) revert MarketAlreadyRegistered();

        isValidMarket[market] = true;
        marketIds[market] = marketId;
        totalMarkets += 1;

        emit MarketRegistered(market, marketId);
    }

    /*//////////////////////////////////////////////////////////////
                        INVALIDATION LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Explicitly invalidate a market
     * @dev Used only for emergency or post-mortem scenarios
     */
    function invalidateMarket(address market)
        external
        onlyGovernance
    {
        if (!isValidMarket[market]) revert MarketNotRegistered();

        isValidMarket[market] = false;

        emit MarketInvalidated(market, marketIds[market]);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function isMarket(address market)
        external
        view
        returns (bool)
    {
        return isValidMarket[market];
    }

    function getMarketId(address market)
        external
        view
        returns (bytes32)
    {
        if (!isValidMarket[market]) revert MarketNotRegistered();
        return marketIds[market];
    }
}
