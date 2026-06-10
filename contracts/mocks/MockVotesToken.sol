// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockVotesToken {
    mapping(address => uint256) private votes;

    function setVotes(address account, uint256 amount) external {
        votes[account] = amount;
    }

    function getPastVotes(address account, uint256) external view returns (uint256) {
        return votes[account];
    }
}
