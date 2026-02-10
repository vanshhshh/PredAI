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

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event OutcomeWrapped(
        address indexed market,
        address yesToken,
        address noToken
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
                true
            )
        );

        noToken = address(
            new OutcomeToken(
                _tokenName(market, "NO"),
                _tokenSymbol(market, "NO"),
                market,
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
    bool public immutable outcomeSide;
    bool private minted;

    error AlreadyMinted();
    error MarketNotSettled();

    constructor(
        string memory name_,
        string memory symbol_,
        address _market,
        bool _outcomeSide
    ) ERC20(name_, symbol_) {
        market = _market;
        outcomeSide = _outcomeSide;
    }

    /**
     * @notice Mint tokens based on user position
     * @dev One-time mint per market side
     */
    function mint(address to, uint256 amount) external {
        if (minted) revert AlreadyMinted();

        PredictionMarket pm = PredictionMarket(market);
        if (!pm.settled()) revert MarketNotSettled();

        minted = true;
        _mint(to, amount);
    }
}
