// File: contracts/rwa/OutcomeWrapper.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    OutcomeWrapper.sol

    PURPOSE
    -------
    Bridges prediction market outcomes into composable ERC20-style
    representations usable across DeFi, RWAs, and cross-chain systems.

    This contract:
    - wraps finalized market outcomes
    - creates canonical outcome tokens (YES / NO)
    - enforces single-mint semantics
    - guarantees settlement correctness

    CRITICAL DESIGN NOTES (from docs)
    ---------------------------------
    - Outcomes MUST be finalized on-chain
    - No speculative minting
    - No retroactive changes
    - No governance override after mint

    TRUST MODEL
    -----------
    - Market settlement is trusted input
    - Governance has NO authority after finalization
*/

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MarketRegistry} from "../core/MarketRegistry.sol";
import {PredictionMarket} from "../core/PredictionMarket.sol";

contract OutcomeWrapper {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error MarketNotFinalized();
    error MarketAlreadyWrapped();
    error InvalidMarket();
    error ZeroAddress();
    error ZeroAmount();
    error PositionAlreadyMinted();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event OutcomeWrapped(
        address indexed market,
        address yesToken,
        address noToken
    );

    event PositionTokensMinted(
        address indexed market,
        address indexed user,
        uint256 yesAmount,
        uint256 noAmount
    );

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    MarketRegistry public immutable marketRegistry;

    struct WrappedOutcome {
        address yesToken;
        address noToken;
        bool exists;
    }

    /// @notice Market address => wrapped outcome tokens
    mapping(address => WrappedOutcome) public wrappedOutcomes;
    mapping(address => mapping(address => bool)) public positionMinted;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _marketRegistry) {
        if (_marketRegistry == address(0)) revert ZeroAddress();
        marketRegistry = MarketRegistry(_marketRegistry);
    }

    /*//////////////////////////////////////////////////////////////
                        WRAPPING LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Wrap a finalized market into ERC20 outcome tokens
     * @dev Can be called permissionlessly AFTER settlement
     */
    function wrapOutcome(address market)
        external
        returns (address yesToken, address noToken)
    {
        if (!marketRegistry.isValidMarket(market))
            revert InvalidMarket();

        if (wrappedOutcomes[market].exists)
            revert MarketAlreadyWrapped();

        PredictionMarket pm = PredictionMarket(market);

        if (!pm.settled()) revert MarketNotFinalized();

        // Deploy outcome tokens
        yesToken = address(
            new OutcomeToken(
                _tokenName(market, "YES"),
                _tokenSymbol(market, "YES"),
                market,
                address(this),
                true
            )
        );

        noToken = address(
            new OutcomeToken(
                _tokenName(market, "NO"),
                _tokenSymbol(market, "NO"),
                market,
                address(this),
                false
            )
        );

        wrappedOutcomes[market] = WrappedOutcome({
            yesToken: yesToken,
            noToken: noToken,
            exists: true
        });

        emit OutcomeWrapped(market, yesToken, noToken);
    }

    function mintPositionTokens(address market)
        external
        returns (uint256 yesAmount, uint256 noAmount)
    {
        WrappedOutcome memory w = wrappedOutcomes[market];
        if (!w.exists) revert InvalidMarket();
        if (positionMinted[market][msg.sender]) revert PositionAlreadyMinted();

        PredictionMarket pm = PredictionMarket(market);
        if (!pm.settled()) revert MarketNotFinalized();

        (yesAmount, noAmount) = pm.getUserPosition(msg.sender);
        if (yesAmount + noAmount == 0) revert ZeroAmount();

        positionMinted[market][msg.sender] = true;

        if (yesAmount > 0) {
            OutcomeToken(w.yesToken).mint(msg.sender, yesAmount);
        }
        if (noAmount > 0) {
            OutcomeToken(w.noToken).mint(msg.sender, noAmount);
        }

        emit PositionTokensMinted(market, msg.sender, yesAmount, noAmount);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW HELPERS
    //////////////////////////////////////////////////////////////*/

    function getOutcomeTokens(address market)
        external
        view
        returns (address yesToken, address noToken)
    {
        WrappedOutcome memory w = wrappedOutcomes[market];
        if (!w.exists) revert InvalidMarket();
        return (w.yesToken, w.noToken);
    }

    function _tokenName(address market, string memory side)
        internal
        pure
        returns (string memory)
    {
        return string(
            abi.encodePacked("Outcome ", side, " @ ", _toHex(market))
        );
    }

    function _tokenSymbol(address market, string memory side)
        internal
        pure
        returns (string memory)
    {
        return string(
            abi.encodePacked(side, "-", _shortHex(market))
        );
    }

    function _toHex(address a) internal pure returns (string memory) {
        return _shortHex(a);
    }

    function _shortHex(address a) internal pure returns (string memory) {
        bytes20 data = bytes20(a);
        bytes memory out = new bytes(6);
        for (uint256 i = 0; i < 3; i++) {
            out[i * 2] = _hexChar(uint8(data[i] >> 4));
            out[i * 2 + 1] = _hexChar(uint8(data[i] & 0x0f));
        }
        return string(out);
    }

    function _hexChar(uint8 c) internal pure returns (bytes1) {
        return c < 10 ? bytes1(c + 48) : bytes1(c + 87);
    }
}

/*//////////////////////////////////////////////////////////////
                    INTERNAL OUTCOME TOKEN
//////////////////////////////////////////////////////////////*/

contract OutcomeToken is ERC20 {
    address public immutable market;
    address public immutable wrapper;
    bool public immutable outcomeSide;

    error OnlyWrapper();
    error MarketNotSettled();

    constructor(
        string memory name_,
        string memory symbol_,
        address _market,
        address _wrapper,
        bool _outcomeSide
    ) ERC20(name_, symbol_) {
        market = _market;
        wrapper = _wrapper;
        outcomeSide = _outcomeSide;
    }

    /**
     * @notice Mint tokens based on a user position verified by OutcomeWrapper.
     */
    function mint(address to, uint256 amount) external {
        if (msg.sender != wrapper) revert OnlyWrapper();
        if (amount == 0) return;

        PredictionMarket pm = PredictionMarket(market);
        if (!pm.settled()) revert MarketNotSettled();

        _mint(to, amount);
    }
}
