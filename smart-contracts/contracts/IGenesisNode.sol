// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

interface IGenesisNode is IERC721Enumerable {
    function distributeRewards(address minter, uint256 mintAmount) external;
    function getSelfBoost(address user) external view returns (uint256);
    function mint(address to, address referrer) external;
    function getUserInfo(address user) external view returns (
        address referrer,
        uint256 totalRewards,
        uint256 totalMinted,
        uint256 nftBalance
    );
    function hasApprovedMint(address user) external view returns (bool);
}
