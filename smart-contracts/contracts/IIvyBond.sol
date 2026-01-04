// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IIvyBond
 * @dev Interface for the IvyBond NFT investment contract (Whitepaper V2.5)
 * 
 * IvyBond is now an ERC721 contract where each deposit mints a unique Bond NFT
 */
interface IIvyBond {
    /// @notice Get user's total bond power (sum of all their Bond NFTs)
    function getBondPower(address user) external view returns (uint256);
    
    /// @notice Get user's total bond power (alias for compatibility)
    function getUserTotalBondPower(address user) external view returns (uint256);
    
    /// @notice Check if user has any Bond NFTs
    function hasBond(address user) external view returns (bool);
    
    /// @notice Get bond data by token ID
    function getBondData(uint256 tokenId) external view returns (
        uint256 depositTime,
        uint256 totalDeposited,
        uint256 principal,
        uint256 bondPower,
        uint256 compoundedAmount
    );
    
    /// @notice Get user's fund allocation breakdown
    function getFundAllocation(address user) external view returns (
        uint256 totalDeposited,
        uint256 miningPrincipal,
        uint256 rwaAssets,
        uint256 reserveAmount,
        uint256 effectiveMiningPower
    );
    
    /// @notice Get all bond token IDs owned by a user
    function getUserBondIds(address user) external view returns (uint256[] memory);
    
    /// @notice Get total bond power in the system
    function totalBondPower() external view returns (uint256);
    
    /// @notice Get contract statistics
    function getStats() external view returns (
        uint256 totalDeposits,
        uint256 totalBondPower,
        uint256 totalBonds
    );
    
    /// @notice Get distribution wallet addresses
    function getWallets() external view returns (
        address rwaWallet,
        address liquidityPool,
        address reservePool
    );
    
    /// @notice ERC721 balance
    function balanceOf(address owner) external view returns (uint256);
    
    /// @notice ERC721 token of owner by index
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    
    /// @notice Add compound power to a Bond NFT (VIP Compound - called by IvyCore)
    function addCompoundPower(uint256 tokenId, uint256 addedPower) external;
    
    /// @notice Get the owner of a Bond NFT
    function ownerOfBond(uint256 tokenId) external view returns (address);
}
