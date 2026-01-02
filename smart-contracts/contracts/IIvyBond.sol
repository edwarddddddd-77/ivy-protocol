// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IIvyBond
 * @dev Interface for the IvyBond investment contract
 */
interface IIvyBond {
    /// @notice Get user's bond power
    function getBondPower(address user) external view returns (uint256);
    
    /// @notice Check if user has an active bond
    function hasBond(address user) external view returns (bool);
    
    /// @notice Get user's bond information
    function getBondInfo(address user) external view returns (
        uint256 totalDeposited,
        uint256 depositTime,
        uint256 bondPower,
        uint256 shareOfPool
    );
    
    /// @notice Get contract statistics
    function getStats() external view returns (
        uint256 totalDeposits,
        uint256 totalBondPower,
        uint256 totalUsers
    );
    
    /// @notice Get distribution wallet addresses
    function getWallets() external view returns (
        address liquidityPool,
        address rwaWallet,
        address reservePool
    );
}
