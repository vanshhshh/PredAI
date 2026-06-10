// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockGovernedTarget {
    uint256 public value;

    event ValueSet(uint256 value);

    function setValue(uint256 newValue) external {
        value = newValue;
        emit ValueSet(newValue);
    }
}
