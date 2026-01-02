// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev A mock USDT token for BSC Testnet testing purposes.
 * Deployer receives 1,000,000 tokens on deployment.
 */
contract MockUSDT is ERC20, Ownable {
    uint8 private constant DECIMALS = 18;

    constructor() ERC20("Mock USDT", "mUSDT") Ownable(msg.sender) {
        // Mint 1,000,000 tokens to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**DECIMALS);
    }

    /**
     * @dev Returns the number of decimals used for token amounts.
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Allows anyone to mint tokens for testing purposes.
     * In production, this would be restricted or removed.
     */
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @dev Owner can mint additional tokens if needed.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
