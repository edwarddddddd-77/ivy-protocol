// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockLPManager
 * @dev Simplified LP Manager for testing purposes
 *
 * This contract simply receives USDT from IvyBond deposits
 * without actually adding liquidity to a DEX.
 *
 * For production, use the full LPManager contract with
 * PancakeSwap integration.
 */
contract MockLPManager is Ownable {
    using SafeERC20 for IERC20;

    /// @notice USDT token
    IERC20 public usdt;

    /// @notice IvyBond contract (authorized caller)
    address public ivyBond;

    /// @notice Total USDT received
    uint256 public totalReceived;

    /// @notice Event emitted when liquidity is "added"
    event LiquidityReceived(uint256 amount, uint256 totalReceived);

    constructor(address _usdt) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT");
        usdt = IERC20(_usdt);
    }

    /**
     * @dev Set IvyBond contract address
     */
    function setIvyBond(address _ivyBond) external onlyOwner {
        require(_ivyBond != address(0), "Invalid IvyBond");
        ivyBond = _ivyBond;
    }

    /**
     * @dev Called by IvyBond when user deposits
     * In production LPManager, this would add liquidity to PancakeSwap
     * In this mock version, we just receive and hold the USDT
     */
    function addLiquidityForBond(uint256 usdtAmount) external {
        require(msg.sender == ivyBond, "Only IvyBond");
        require(usdtAmount > 0, "Amount must be > 0");

        // Transfer USDT from IvyBond
        usdt.safeTransferFrom(msg.sender, address(this), usdtAmount);

        totalReceived += usdtAmount;

        emit LiquidityReceived(usdtAmount, totalReceived);
    }

    /**
     * @dev Withdraw USDT (owner only, for testing)
     */
    function withdrawUSDT(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        usdt.safeTransfer(to, amount);
    }

    /**
     * @dev Get contract USDT balance
     */
    function getBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }
}
