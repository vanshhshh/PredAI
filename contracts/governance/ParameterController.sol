// File: contracts/governance/ParameterController.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    ParameterController.sol

    PURPOSE
    -------
    Single canonical contract responsible for updating
    governance-controlled parameters across the protocol.

    This contract exists to:
    - prevent scattered parameter mutation
    - enforce hard bounds (defined in docs)
    - ensure all changes are auditable
    - centralize governance authority

    GUARANTEES (from docs)
    ---------------------
    - No direct parameter mutation elsewhere
    - All updates are bounded
    - All updates are event-emitted
    - No fast governance
    - No fund custody

    TRUST MODEL
    -----------
    - DAO + Timelock control execution
    - This contract does NOT execute business logic
*/

contract ParameterController {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyGovernance();
    error InvalidParameter();
    error OutOfBounds();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event AddressParameterUpdated(
        bytes32 indexed key,
        address oldValue,
        address newValue
    );

    event UintParameterUpdated(
        bytes32 indexed key,
        uint256 oldValue,
        uint256 newValue
    );

    event BoolParameterUpdated(
        bytes32 indexed key,
        bool oldValue,
        bool newValue
    );

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Governance authority (Timelock)
    address public governance;

    /// @notice Address parameters
    mapping(bytes32 => address) public addressParams;

    /// @notice Uint parameters
    mapping(bytes32 => uint256) public uintParams;

    /// @notice Bool parameters
    mapping(bytes32 => bool) public boolParams;

    /// @notice Hard bounds for uint parameters
    struct Bounds {
        uint256 min;
        uint256 max;
        bool exists;
    }

    mapping(bytes32 => Bounds) public bounds;

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
                        BOUND MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Define immutable bounds for a parameter
     * @dev Bounds can only be set once
     */
    function setBounds(
        bytes32 key,
        uint256 min,
        uint256 max
    ) external onlyGovernance {
        if (bounds[key].exists) revert InvalidParameter();
        if (min >= max) revert InvalidParameter();

        bounds[key] = Bounds({
            min: min,
            max: max,
            exists: true
        });
    }

    /*//////////////////////////////////////////////////////////////
                        PARAMETER UPDATES
    //////////////////////////////////////////////////////////////*/

    function setAddress(
        bytes32 key,
        address value
    ) external onlyGovernance {
        address old = addressParams[key];
        addressParams[key] = value;

        emit AddressParameterUpdated(key, old, value);
    }

    function setBool(
        bytes32 key,
        bool value
    ) external onlyGovernance {
        bool old = boolParams[key];
        boolParams[key] = value;

        emit BoolParameterUpdated(key, old, value);
    }

    function setUint(
        bytes32 key,
        uint256 value
    ) external onlyGovernance {
        Bounds memory b = bounds[key];
        if (!b.exists) revert InvalidParameter();
        if (value < b.min || value > b.max) revert OutOfBounds();

        uint256 old = uintParams[key];
        uintParams[key] = value;

        emit UintParameterUpdated(key, old, value);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW HELPERS
    //////////////////////////////////////////////////////////////*/

    function getBounds(bytes32 key)
        external
        view
        returns (uint256 min, uint256 max, bool exists)
    {
        Bounds memory b = bounds[key];
        return (b.min, b.max, b.exists);
    }
}
