// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPriceOracle {
    function getLatestPrice() external view returns (uint256);
    function getHourlyCandle(uint256 index) external view returns (uint256 open, uint256 close);
    function getAssetPrice(address asset) external view returns (uint256);
}
