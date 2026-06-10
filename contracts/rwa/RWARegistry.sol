// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract RWARegistry is Ownable {
    error AssetAlreadyRegistered();
    error AssetNotRegistered();
    error InvalidAsset();
    error InvalidToken();
    error InvalidMetadata();

    struct Asset {
        address token;
        string metadataURI;
        bool active;
        bool exists;
    }

    mapping(bytes32 => Asset) private assets;

    event AssetRegistered(
        bytes32 indexed assetId,
        address indexed token,
        string metadataURI,
        bool active
    );
    event AssetStatusSet(bytes32 indexed assetId, bool active);
    event AssetTokenSet(bytes32 indexed assetId, address indexed token);

    constructor(address owner_) Ownable(owner_) {}

    function registerAsset(
        bytes32 assetId,
        address token,
        string calldata metadataURI,
        bool active
    ) external onlyOwner {
        if (assetId == bytes32(0)) revert InvalidAsset();
        if (token == address(0)) revert InvalidToken();
        if (bytes(metadataURI).length == 0) revert InvalidMetadata();
        if (assets[assetId].exists) revert AssetAlreadyRegistered();

        assets[assetId] = Asset({
            token: token,
            metadataURI: metadataURI,
            active: active,
            exists: true
        });

        emit AssetRegistered(assetId, token, metadataURI, active);
    }

    function setAssetActive(bytes32 assetId, bool active) external onlyOwner {
        Asset storage asset = assets[assetId];
        if (!asset.exists) revert AssetNotRegistered();
        asset.active = active;
        emit AssetStatusSet(assetId, active);
    }

    function setAssetToken(bytes32 assetId, address token) external onlyOwner {
        Asset storage asset = assets[assetId];
        if (!asset.exists) revert AssetNotRegistered();
        if (token == address(0)) revert InvalidToken();
        asset.token = token;
        emit AssetTokenSet(assetId, token);
    }

    function isAssetActive(bytes32 assetId) external view returns (bool) {
        Asset storage asset = assets[assetId];
        return asset.exists && asset.active;
    }

    function getAsset(bytes32 assetId)
        external
        view
        returns (
            address token,
            string memory metadataURI,
            bool active
        )
    {
        Asset storage asset = assets[assetId];
        if (!asset.exists) revert AssetNotRegistered();
        return (asset.token, asset.metadataURI, asset.active);
    }
}
