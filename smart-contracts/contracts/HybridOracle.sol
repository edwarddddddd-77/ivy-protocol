// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HybridOracle
 * @dev 混合价格预言机 - 支持测试网和主网模式
 *
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║              HYBRID ORACLE (测试网+主网兼容)                   ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  测试网模式 (Manual Mode):                                     ║
 * ║  - Owner手动设置价格                                           ║
 * ║  - 用于测试PID算法和熔断器                                      ║
 * ║                                                               ║
 * ║  主网模式 (Chainlink Mode):                                    ║
 * ║  - 从Chainlink聚合器获取实时价格                                ║
 * ║  - 去中心化,防止操纵                                           ║
 * ║                                                               ║
 * ║  切换: setMode(OracleMode.CHAINLINK)                          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

/// @notice Chainlink聚合器接口
interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function decimals() external view returns (uint8);
}

contract HybridOracle is Ownable {

    // ============ Enums ============

    enum OracleMode { MANUAL, CHAINLINK }

    // ============ State Variables ============

    /// @notice Current oracle mode
    OracleMode public mode;

    /// @notice Chainlink price feed for IVY/USD (when available)
    AggregatorV3Interface public ivyUsdFeed;

    /// @notice Manual price storage (for testing)
    uint256 public manualCurrentPrice;
    uint256 public manualMa30Price;
    uint256 public manualPrice1hAgo;

    /// @notice Price staleness threshold (主网模式下使用)
    uint256 public constant MAX_PRICE_AGE = 1 hours;

    // ============ Events ============

    event OracleModeChanged(OracleMode oldMode, OracleMode newMode);
    event ChainlinkFeedSet(address indexed feed);
    event ManualPriceUpdated(uint256 currentPrice, uint256 ma30Price, uint256 price1hAgo);

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {
        // 默认使用手动模式(测试网)
        mode = OracleMode.MANUAL;

        // 初始化默认价格 $1.00
        manualCurrentPrice = 10**18;
        manualMa30Price = 10**18;
        manualPrice1hAgo = 10**18;
    }

    // ============ Admin Functions ============

    /**
     * @dev 切换预言机模式
     * @param _mode 新模式 (MANUAL或CHAINLINK)
     */
    function setMode(OracleMode _mode) external onlyOwner {
        OracleMode oldMode = mode;
        mode = _mode;
        emit OracleModeChanged(oldMode, _mode);
    }

    /**
     * @dev 设置Chainlink价格聚合器地址
     * @param _feed Chainlink IVY/USD聚合器地址
     *
     * BSC主网示例: 0x... (需要Chainlink部署IVY价格对)
     * 或使用BNB/USD等已有价格对作为参考
     */
    function setChainlinkFeed(address _feed) external onlyOwner {
        require(_feed != address(0), "Invalid feed address");
        ivyUsdFeed = AggregatorV3Interface(_feed);
        emit ChainlinkFeedSet(_feed);
    }

    /**
     * @dev 手动更新价格 (仅在MANUAL模式下使效)
     * @param _currentPrice 当前价格 (18 decimals)
     * @param _ma30Price 30日均价 (18 decimals)
     * @param _price1hAgo 1小时前价格 (18 decimals)
     */
    function setManualPrices(
        uint256 _currentPrice,
        uint256 _ma30Price,
        uint256 _price1hAgo
    ) external onlyOwner {
        require(_currentPrice > 0 && _ma30Price > 0 && _price1hAgo > 0, "Invalid prices");

        manualCurrentPrice = _currentPrice;
        manualMa30Price = _ma30Price;
        manualPrice1hAgo = _price1hAgo;

        emit ManualPriceUpdated(_currentPrice, _ma30Price, _price1hAgo);
    }

    // ============ View Functions ============

    /**
     * @dev 获取当前价格 (IvyCore使用)
     * @return 当前IVY价格 (18 decimals, $1 = 10^18)
     */
    function getLatestPrice() external view returns (uint256) {
        if (mode == OracleMode.MANUAL) {
            return manualCurrentPrice;
        } else {
            return _getChainlinkPrice();
        }
    }

    /**
     * @dev 获取完整价格数据 (供Photosynthesis使用)
     * @return currentPrice 当前价格
     * @return ma30Price 30日均价
     * @return price1hAgo 1小时前价格
     */
    function getPriceData() external view returns (
        uint256 currentPrice,
        uint256 ma30Price,
        uint256 price1hAgo
    ) {
        if (mode == OracleMode.MANUAL) {
            return (manualCurrentPrice, manualMa30Price, manualPrice1hAgo);
        } else {
            currentPrice = _getChainlinkPrice();
            // 主网模式下,MA30和1h前价格需要链下计算后喂入
            // 这里返回当前价格作为fallback
            ma30Price = manualMa30Price;  // 需要keeper更新
            price1hAgo = manualPrice1hAgo;  // 需要keeper更新
        }
    }

    /**
     * @dev 从Chainlink获取价格
     * @return 价格 (18 decimals)
     */
    function _getChainlinkPrice() internal view returns (uint256) {
        require(address(ivyUsdFeed) != address(0), "Chainlink feed not set");

        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = ivyUsdFeed.latestRoundData();

        // 检查价格新鲜度
        require(updatedAt >= block.timestamp - MAX_PRICE_AGE, "Price stale");
        require(answeredInRound >= roundId, "Stale price round");
        require(answer > 0, "Invalid price");

        // Chainlink价格通常是8位小数,需要转换到18位
        uint8 decimals = ivyUsdFeed.decimals();
        uint256 price = uint256(answer);

        // 转换到18位小数
        if (decimals < 18) {
            price = price * 10**(18 - decimals);
        } else if (decimals > 18) {
            price = price / 10**(decimals - 18);
        }

        return price;
    }

    /**
     * @dev 获取预言机状态信息
     */
    function getOracleInfo() external view returns (
        OracleMode currentMode,
        address chainlinkFeed,
        uint256 currentPrice,
        uint256 ma30Price,
        uint256 price1hAgo
    ) {
        currentMode = mode;
        chainlinkFeed = address(ivyUsdFeed);

        if (mode == OracleMode.MANUAL) {
            currentPrice = manualCurrentPrice;
            ma30Price = manualMa30Price;
            price1hAgo = manualPrice1hAgo;
        } else {
            currentPrice = _getChainlinkPrice();
            ma30Price = manualMa30Price;
            price1hAgo = manualPrice1hAgo;
        }
    }
}
