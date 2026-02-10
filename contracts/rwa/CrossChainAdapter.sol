// File: contracts/rwa/CrossChainAdapter.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    CrossChainAdapter.sol

    PURPOSE
    -------
    Canonical adapter for cross-chain movement of RWA and outcome tokens.
    This contract provides:
    - a single abstraction layer for bridges
    - governance-bounded configuration
    - non-custodial, opt-in transfers
    - replay- and double-mint protection

    IMPORTANT (from docs)
    ---------------------
    - This contract does NOT custody funds long-term
    - This contract does NOT mint arbitrarily
    - This contract does NOT trust a single bridge implicitly
    - Users must explicitly approve transfers

    TRUST MODEL
    -----------
    - Bridge implementations are semi-trusted
    - Governance approves adapters, not transfers
    - On-chain accounting remains source-of-truth
*/

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CrossChainAdapter {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyGovernance();
    error BridgeNotApproved();
    error InvalidTargetChain();
    error ZeroAddress();
    error ZeroAmount();
    error AlreadyProcessed();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event BridgeApproved(address indexed bridge, bool approved);
    event TransferInitiated(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 targetChainId,
        bytes targetAddress,
        bytes32 transferId
    );
    event TransferFinalized(
        bytes32 indexed transferId,
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Governance authority (Timelock)
    address public governance;

    /// @notice Approved bridge adapters
    mapping(address => bool) public approvedBridges;

    /// @notice Processed transfer IDs (replay protection)
    mapping(bytes32 => bool) public processedTransfers;

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
        if (_governance == address(0)) revert ZeroAddress();
        governance = _governance;
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE CONTROLS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Approve or revoke a bridge adapter
     */
    function approveBridge(address bridge, bool approved)
        external
        onlyGovernance
    {
        if (bridge == address(0)) revert ZeroAddress();
        approvedBridges[bridge] = approved;
        emit BridgeApproved(bridge, approved);
    }

    /*//////////////////////////////////////////////////////////////
                        TRANSFER INITIATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initiate a cross-chain transfer
     * @dev Tokens are escrowed in this contract
     */
    function initiateTransfer(
        address bridge,
        address token,
        uint256 amount,
        uint256 targetChainId,
        bytes calldata targetAddress
    ) external returns (bytes32 transferId) {
        if (!approvedBridges[bridge]) revert BridgeNotApproved();
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (targetChainId == 0) revert InvalidTargetChain();

        // Pull tokens from user
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        transferId = keccak256(
            abi.encode(
                msg.sender,
                token,
                amount,
                targetChainId,
                targetAddress,
                block.number
            )
        );

        emit TransferInitiated(
            msg.sender,
            token,
            amount,
            targetChainId,
            targetAddress,
            transferId
        );

        // Bridge call is externalized
        // Actual message passing handled by bridge adapter
    }

    /*//////////////////////////////////////////////////////////////
                        TRANSFER FINALIZATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Finalize an incoming transfer from another chain
     * @dev Callable only by approved bridge
     */
    function finalizeTransfer(
        bytes32 transferId,
        address token,
        address recipient,
        uint256 amount
    ) external {
        if (!approvedBridges[msg.sender]) revert BridgeNotApproved();
        if (processedTransfers[transferId]) revert AlreadyProcessed();
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        processedTransfers[transferId] = true;

        IERC20(token).transfer(recipient, amount);

        emit TransferFinalized(
            transferId,
            token,
            recipient,
            amount
        );
    }
}
