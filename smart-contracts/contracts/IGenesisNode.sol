// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

interface IGenesisNode is IERC721Enumerable {
    function distributeRewards(address minter, uint256 mintAmount) external;
    function getSelfBoost(address user) external view returns (uint256);
    function mint(address to) external;
}
