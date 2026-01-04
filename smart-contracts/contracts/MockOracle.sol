// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IPriceOracle.sol";

contract MockOracle is IPriceOracle {
    uint256 private latestPrice;
    mapping(uint256 => Candle) private history;
    
    // Asset-specific prices (for VIP Compound)
    mapping(address => uint256) private assetPrices;

    struct Candle {
        uint256 open;
        uint256 close;
    }

    constructor(uint256 _initialPrice) {
        latestPrice = _initialPrice;
    }

    function setPrice(uint256 _price) external {
        latestPrice = _price;
    }

    function getLatestPrice() external view override returns (uint256) {
        return latestPrice;
    }

    // Mock function to set historical candle data for testing
    function setHourlyCandle(uint256 index, uint256 open, uint256 close) external {
        history[index] = Candle(open, close);
    }

    function getHourlyCandle(uint256 index) external view override returns (uint256 open, uint256 close) {
        Candle memory c = history[index];
        return (c.open, c.close);
    }
    
    // ============ Asset Price Functions (for VIP Compound) ============
    
    /**
     * @dev Set price for a specific asset (God Mode for testing)
     * @param asset The asset address (e.g., IvyToken)
     * @param price The price in 18 decimals (1e18 = $1.00)
     */
    function setAssetPrice(address asset, uint256 price) external {
        assetPrices[asset] = price;
    }
    
    /**
     * @dev Get price for a specific asset
     * @param asset The asset address
     * @return The price in 18 decimals
     */
    function getAssetPrice(address asset) external view override returns (uint256) {
        uint256 price = assetPrices[asset];
        // If no specific price set, return latestPrice as fallback
        return price > 0 ? price : latestPrice;
    }
}
