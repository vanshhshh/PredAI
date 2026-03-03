// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IRWA {
    function isAssetActive(bytes32 assetId) external view returns (bool);
}

contract RWAToken is ERC20, Pausable, Ownable {
    bytes32 public immutable assetId;
    IRWA public immutable rwaRegistry;

    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        bytes32 assetId_,
        address rwaRegistry_,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        assetId = assetId_;
        rwaRegistry = IRWA(rwaRegistry_);
    }

    // -------------------------
    // Governance
    // -------------------------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // -------------------------
    // Mint / Burn
    // -------------------------

    function mint(address to, uint256 amount)
        external
        onlyOwner
        whenNotPaused
    {
        require(
            rwaRegistry.isAssetActive(assetId),
            "Underlying RWA inactive"
        );
        _mint(to, amount);
        emit Minted(to, amount);
    }

    function burn(address from, uint256 amount)
        external
        onlyOwner
    {
        _burn(from, amount);
        emit Burned(from, amount);
    }

    // -------------------------
    // Transfers
    // -------------------------

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._update(from, to, amount);
    }
}
