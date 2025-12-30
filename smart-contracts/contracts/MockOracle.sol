// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IPriceOracle.sol";

contract MockOracle is IPriceOracle {
    uint256 private latestPrice;
    mapping(uint256 => Candle) private history;

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
}
