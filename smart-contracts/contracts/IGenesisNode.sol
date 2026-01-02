// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

/**
 * @title IGenesisNode
 * @dev Interface for the GenesisNode NFT contract
 */
interface IGenesisNode is IERC721Enumerable {
    /// @notice Get referrer (upline) of a user
    function getReferrer(address user) external view returns (address);
    
    /// @notice Check if user has a referrer bound
    function hasReferrer(address user) external view returns (bool);
    
    /// @notice Get self boost for NFT holders (10% = 1000 basis points)
    function getSelfBoost(address user) external view returns (uint256);
    
    /// @notice Get team aura boost from upline (2% = 200 basis points)
    function getTeamAura(address user) external view returns (uint256);
    
    /// @notice Get total boost (selfBoost + teamAura)
    function getTotalBoost(address user) external view returns (uint256);
    
    /// @notice Get user info for frontend
    function getUserInfo(address user) external view returns (
        uint256 nftBalance,
        address referrer,
        uint256 directDownlines,
        uint256 selfBoost,
        uint256 teamAura,
        uint256 totalBoost
    );
    
    /// @notice Get contract stats
    function getContractStats() external view returns (
        uint256 currentSupply,
        uint256 maxSupply,
        uint256 price,
        uint256 totalVolume
    );
    
    /// @notice Check if user has approved enough for minting
    function hasApprovedMint(address user) external view returns (bool);
}
