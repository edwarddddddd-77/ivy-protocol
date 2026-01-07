// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IvyToken.sol";

/**
 * @title Photosynthesis
 * @dev RWA Yield Router for Ivy Protocol (Whitepaper P7)
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║              PHOTOSYNTHESIS - RWA YIELD ROUTING               ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  "光合作用" - Converting RWA yields into protocol value       ║
 * ║                                                               ║
 * ║  Market Condition Detection:                                  ║
 * ║  - P > MA30 (Bull Market) → Buyback & Burn IVY               ║
 * ║  - P < MA30 (Bear Market) → USDT Dividends to Bond holders   ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                    ROUTING LOGIC                              ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Bull Market (P > MA30):                                      ║
 * ║  1. Swap USDT → IVY via Uniswap                              ║
 * ║  2. Burn all acquired IVY (deflationary pressure)            ║
 * ║                                                               ║
 * ║  Bear Market (P < MA30):                                      ║
 * ║  1. Transfer USDT to DividendPool                            ║
 * ║  2. Bond holders can claim pro-rata dividends                ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

/// @notice Uniswap V2 Router Interface (minimal)
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    
    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);
}

/// @notice DividendPool Interface
interface IDividendPool {
    function depositDividend(uint256 amount) external;
}

/// @notice Price Oracle Interface
interface IPriceOraclePhotosynthesis {
    function getLatestPrice() external view returns (uint256);
    function getMA30Price() external view returns (uint256);
}

contract Photosynthesis is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Constants ============
    
    /// @notice Dead address for burns
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    /// @notice Slippage tolerance: 3% (97% minimum output)
    uint256 public constant SLIPPAGE_TOLERANCE = 9700;
    uint256 public constant SLIPPAGE_BASE = 10000;
    
    // ============ State Variables ============
    
    /// @notice USDT token
    IERC20 public usdt;
    
    /// @notice IVY token
    IvyToken public ivyToken;
    
    /// @notice Price oracle for market condition detection
    IPriceOraclePhotosynthesis public priceOracle;
    
    /// @notice Uniswap V2 Router
    IUniswapV2Router public uniswapRouter;
    
    /// @notice Dividend pool for bear market distributions
    IDividendPool public dividendPool;
    
    /// @notice Current IVY price (18 decimals, $1 = 10^18)
    uint256 public currentPrice;
    
    /// @notice 30-day moving average price
    uint256 public ma30Price;
    
    /// @notice RWA Wallet address (source of yields)
    address public rwaWallet;
    
    /// @notice Keeper address (authorized to call processRwaYield)
    address public keeper;
    
    /// @notice Total USDT processed
    uint256 public totalProcessed;
    
    /// @notice Total IVY bought back and burned
    uint256 public totalBurnedBuyback;
    
    /// @notice Total USDT distributed as dividends
    uint256 public totalDividendsRouted;
    
    /// @notice Processing enabled flag
    bool public processingEnabled = true;
    
    // ============ Events ============
    
    event RwaYieldProcessed(
        uint256 amount,
        bool isBullMarket,
        uint256 currentPrice,
        uint256 ma30Price
    );
    event BuybackAndBurn(uint256 usdtSpent, uint256 ivyBurned);
    event DividendRouted(uint256 amount);
    event PricesUpdated(uint256 currentPrice, uint256 ma30Price);
    event KeeperUpdated(address indexed oldKeeper, address indexed newKeeper);
    event ProcessingToggled(bool enabled);
    
    // ============ Modifiers ============
    
    modifier onlyKeeperOrOwner() {
        require(msg.sender == keeper || msg.sender == owner(), "Not authorized");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _usdt,
        address _ivyToken,
        address _uniswapRouter
    ) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT");
        require(_ivyToken != address(0), "Invalid IVY");
        require(_uniswapRouter != address(0), "Invalid router");
        
        usdt = IERC20(_usdt);
        ivyToken = IvyToken(_ivyToken);
        uniswapRouter = IUniswapV2Router(_uniswapRouter);
        
        // Default prices ($1.00)
        currentPrice = 10**18;
        ma30Price = 10**18;
        
        // Approve router for USDT swaps
        usdt.approve(_uniswapRouter, type(uint256).max);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Set dividend pool address
     */
    function setDividendPool(address _dividendPool) external onlyOwner {
        require(_dividendPool != address(0), "Invalid address");
        dividendPool = IDividendPool(_dividendPool);
        
        // Approve dividend pool for USDT transfers
        usdt.approve(_dividendPool, type(uint256).max);
    }
    
    /**
     * @dev Set price oracle address
     */
    function setPriceOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid address");
        priceOracle = IPriceOraclePhotosynthesis(_oracle);
    }
    
    /**
     * @dev Set RWA wallet address
     */
    function setRwaWallet(address _rwaWallet) external onlyOwner {
        require(_rwaWallet != address(0), "Invalid address");
        rwaWallet = _rwaWallet;
    }
    
    /**
     * @dev Set keeper address
     */
    function setKeeper(address _keeper) external onlyOwner {
        address oldKeeper = keeper;
        keeper = _keeper;
        emit KeeperUpdated(oldKeeper, _keeper);
    }
    
    /**
     * @dev Toggle processing enabled/disabled
     */
    function toggleProcessing(bool _enabled) external onlyOwner {
        processingEnabled = _enabled;
        emit ProcessingToggled(_enabled);
    }
    
    /**
     * @dev Update prices manually (if oracle not available)
     */
    function updatePrices(uint256 _currentPrice, uint256 _ma30Price) external onlyKeeperOrOwner {
        require(_currentPrice > 0 && _ma30Price > 0, "Invalid prices");
        currentPrice = _currentPrice;
        ma30Price = _ma30Price;
        emit PricesUpdated(_currentPrice, _ma30Price);
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Process RWA yield based on market conditions
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              THE PHOTOSYNTHESIS FUNCTION                      ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  1. Read oracle price (or use stored price)                   ║
     * ║  2. Compare P vs MA30                                         ║
     * ║  3. Route funds accordingly:                                  ║
     * ║     - Bull: Buyback IVY → Burn                               ║
     * ║     - Bear: Route to DividendPool                            ║
     * ╚═══════════════════════════════════════════════════════════════╝
     * 
     * @param amount Amount of USDT yield to process
     */
    function processRwaYield(uint256 amount) external nonReentrant onlyKeeperOrOwner {
        require(processingEnabled, "Processing disabled");
        require(amount > 0, "Amount must be > 0");
        
        // Transfer USDT from RWA wallet (must have approved this contract)
        usdt.safeTransferFrom(rwaWallet, address(this), amount);

        // ╔═══════════════════════════════════════════════════════════════╗
        // ║              UPDATE PRICES FROM ORACLE                        ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  Fetch BOTH current price AND MA30 price from oracle          ║
        // ║  If oracle fails, use stored prices as fallback               ║
        // ╚═══════════════════════════════════════════════════════════════╝

        if (address(priceOracle) != address(0)) {
            // Fetch current price
            try priceOracle.getLatestPrice() returns (uint256 price) {
                if (price > 0) {
                    currentPrice = price;
                }
            } catch {
                // Use stored price if oracle fails
            }

            // Fetch MA30 price
            try priceOracle.getMA30Price() returns (uint256 ma30) {
                if (ma30 > 0) {
                    ma30Price = ma30;
                }
            } catch {
                // Use stored MA30 if oracle fails
            }
        }
        
        // ╔═══════════════════════════════════════════════════════════════╗
        // ║              21M GOLDEN PIVOT CHECK                           ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  If total supply ≤ 21M: ALL yields → Dividends               ║
        // ║  If total supply > 21M: Use market condition logic            ║
        // ╚═══════════════════════════════════════════════════════════════╝

        totalProcessed += amount;

        bool reachedGoldenPivot = ivyToken.totalSupply() <= ivyToken.GOLDEN_PIVOT();

        if (reachedGoldenPivot) {
            // Post-21M: ALL yields go to dividends (no more buyback & burn)
            _routeToDividendPool(amount);
            emit RwaYieldProcessed(amount, false, currentPrice, ma30Price);
        } else {
            // Pre-21M: Use market condition logic
            bool isBullMarket = currentPrice > ma30Price;

            if (isBullMarket) {
                // Bull Market: Buyback & Burn
                _executeBuybackAndBurn(amount);
            } else {
                // Bear Market: Route to Dividend Pool
                _routeToDividendPool(amount);
            }

            emit RwaYieldProcessed(amount, isBullMarket, currentPrice, ma30Price);
        }
    }
    
    /**
     * @dev Execute buyback and burn (Bull Market)
     * 
     * Steps:
     * 1. Swap USDT → IVY via Uniswap
     * 2. Transfer IVY to dead address (burn)
     */
    function _executeBuybackAndBurn(uint256 usdtAmount) internal {
        // Build swap path: USDT → IVY
        address[] memory path = new address[](2);
        path[0] = address(usdt);
        path[1] = address(ivyToken);
        
        // Get expected output
        uint256[] memory amountsOut = uniswapRouter.getAmountsOut(usdtAmount, path);
        uint256 expectedIvy = amountsOut[1];
        
        // Calculate minimum output with slippage tolerance
        uint256 minIvyOut = (expectedIvy * SLIPPAGE_TOLERANCE) / SLIPPAGE_BASE;
        
        // Execute swap
        uint256[] memory amounts = uniswapRouter.swapExactTokensForTokens(
            usdtAmount,
            minIvyOut,
            path,
            address(this),
            block.timestamp + 300  // 5 minute deadline
        );
        
        uint256 ivyReceived = amounts[1];
        
        // Burn by sending to dead address
        ivyToken.transfer(DEAD_ADDRESS, ivyReceived);
        
        totalBurnedBuyback += ivyReceived;
        
        emit BuybackAndBurn(usdtAmount, ivyReceived);
    }
    
    /**
     * @dev Route USDT to dividend pool (Bear Market)
     */
    function _routeToDividendPool(uint256 amount) internal {
        require(address(dividendPool) != address(0), "Dividend pool not set");
        
        // Deposit to dividend pool
        dividendPool.depositDividend(amount);
        
        totalDividendsRouted += amount;
        
        emit DividendRouted(amount);
    }
    
    /**
     * @dev Manual buyback and burn (emergency or testing)
     */
    function manualBuybackAndBurn(uint256 amount) external onlyOwner nonReentrant {
        require(usdt.balanceOf(address(this)) >= amount, "Insufficient balance");
        _executeBuybackAndBurn(amount);
    }
    
    /**
     * @dev Manual route to dividends (emergency or testing)
     */
    function manualRouteToDividends(uint256 amount) external onlyOwner nonReentrant {
        require(usdt.balanceOf(address(this)) >= amount, "Insufficient balance");
        _routeToDividendPool(amount);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get current market condition
     */
    function getMarketCondition() external view returns (
        bool isBullMarket,
        uint256 _currentPrice,
        uint256 _ma30Price,
        int256 deviation  // Percentage deviation from MA30 (basis points)
    ) {
        isBullMarket = currentPrice > ma30Price;
        _currentPrice = currentPrice;
        _ma30Price = ma30Price;
        
        if (ma30Price > 0) {
            deviation = int256((currentPrice * 10000) / ma30Price) - 10000;
        }
    }
    
    /**
     * @dev Get processing statistics
     */
    function getStats() external view returns (
        uint256 _totalProcessed,
        uint256 _totalBurnedBuyback,
        uint256 _totalDividendsRouted,
        bool _processingEnabled
    ) {
        _totalProcessed = totalProcessed;
        _totalBurnedBuyback = totalBurnedBuyback;
        _totalDividendsRouted = totalDividendsRouted;
        _processingEnabled = processingEnabled;
    }
    
    /**
     * @dev Preview what would happen if processRwaYield is called
     */
    function previewProcessing(uint256 amount) external view returns (
        bool wouldBuyback,
        uint256 estimatedIvyBurn,
        uint256 estimatedDividend
    ) {
        wouldBuyback = currentPrice > ma30Price;
        
        if (wouldBuyback) {
            // Estimate IVY output from swap
            address[] memory path = new address[](2);
            path[0] = address(usdt);
            path[1] = address(ivyToken);
            
            try uniswapRouter.getAmountsOut(amount, path) returns (uint256[] memory amounts) {
                estimatedIvyBurn = amounts[1];
            } catch {
                estimatedIvyBurn = 0;
            }
        } else {
            estimatedDividend = amount;
        }
    }
    
    // ============ Emergency Functions ============
    
    /**
     * @dev Emergency withdraw stuck tokens
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    /**
     * @dev Update Uniswap router (in case of upgrade)
     */
    function updateRouter(address _newRouter) external onlyOwner {
        require(_newRouter != address(0), "Invalid router");
        
        // Revoke old approval
        usdt.approve(address(uniswapRouter), 0);
        
        // Set new router
        uniswapRouter = IUniswapV2Router(_newRouter);
        
        // Approve new router
        usdt.approve(_newRouter, type(uint256).max);
    }
}
