// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LPManager
 * @dev Progressive Hybrid LP Strategy Manager
 *
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║         PROGRESSIVE HYBRID LP STRATEGY (4 STAGES)             ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Reserve Cap: 15,000,000 IVY (15% of total supply)            ║
 * ║                                                               ║
 * ║  Stage 1 (0-5M):      80% Reserve + 20% Buy  (Foundation)    ║
 * ║  Stage 2 (5M-10M):    50% Reserve + 50% Buy  (Acceleration)  ║
 * ║  Stage 3 (10M-15M):   20% Reserve + 80% Buy  (Sprint)        ║
 * ║  Stage 4 (>15M):      0% Reserve + 100% Buy  (Mature)        ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
contract LPManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    /// @notice LP Reserve cap: 15,000,000 IVY (15% of total supply)
    uint256 public constant LP_RESERVE_CAP = 15_000_000 * 10**18;

    /// @notice Stage thresholds (in IVY used)
    uint256 public constant STAGE_1_THRESHOLD = 5_000_000 * 10**18;   // 0-5M
    uint256 public constant STAGE_2_THRESHOLD = 10_000_000 * 10**18;  // 5M-10M
    uint256 public constant STAGE_3_THRESHOLD = 15_000_000 * 10**18;  // 10M-15M

    /// @notice Stage ratios (reserve percentage in basis points)
    uint256 public constant STAGE_1_RESERVE_RATIO = 8000;  // 80%
    uint256 public constant STAGE_2_RESERVE_RATIO = 5000;  // 50%
    uint256 public constant STAGE_3_RESERVE_RATIO = 2000;  // 20%
    uint256 public constant STAGE_4_RESERVE_RATIO = 0;     // 0%

    uint256 public constant BASIS_POINTS = 10000;

    // ============ State Variables ============

    /// @notice USDT payment token
    IERC20 public immutable usdt;

    /// @notice IVY token
    IERC20 public immutable ivyToken;

    /// @notice IVY token minter interface (for minting reserve IVY)
    address public ivyTokenMinter;

    /// @notice Uniswap V2 Router (for adding liquidity and buying IVY)
    address public uniswapRouter;

    /// @notice IVY-USDT LP pair address
    address public lpPair;

    /// @notice IvyBond contract (authorized caller)
    address public ivyBond;

    /// @notice Total reserve IVY used so far
    uint256 public reserveUsed;

    /// @notice Total USDT processed for LP
    uint256 public totalUsdtProcessed;

    /// @notice Total IVY minted from reserve
    uint256 public totalReserveMinted;

    /// @notice Total IVY bought from market
    uint256 public totalMarketBought;

    /// @notice Emergency pause flag
    bool public paused;

    // ============ Events ============

    event LPAdded(
        uint256 usdtAmount,
        uint256 ivyFromReserve,
        uint256 ivyFromMarket,
        uint256 currentStage,
        uint256 reserveRatio
    );
    event StageChanged(uint256 newStage, uint256 reserveUsed);
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);

    // ============ Modifiers ============

    modifier onlyBond() {
        require(msg.sender == ivyBond, "Only IvyBond");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    // ============ Constructor ============

    /**
     * @param _usdt USDT token address
     * @param _ivyToken IVY token address
     * @param _ivyTokenMinter IVY minter address (IvyToken contract itself)
     * @param _uniswapRouter Uniswap V2 Router address
     * @param _lpPair IVY-USDT LP pair address
     */
    constructor(
        address _usdt,
        address _ivyToken,
        address _ivyTokenMinter,
        address _uniswapRouter,
        address _lpPair
    ) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT");
        require(_ivyToken != address(0), "Invalid IVY");
        require(_ivyTokenMinter != address(0), "Invalid minter");
        require(_uniswapRouter != address(0), "Invalid router");
        require(_lpPair != address(0), "Invalid LP pair");

        usdt = IERC20(_usdt);
        ivyToken = IERC20(_ivyToken);
        ivyTokenMinter = _ivyTokenMinter;
        uniswapRouter = _uniswapRouter;
        lpPair = _lpPair;
    }

    // ============ Admin Functions ============

    /**
     * @dev Set IvyBond contract address (authorized caller)
     */
    function setIvyBond(address _ivyBond) external onlyOwner {
        require(_ivyBond != address(0), "Invalid bond");
        ivyBond = _ivyBond;
    }

    /**
     * @dev Update Uniswap router (in case of migration)
     */
    function setUniswapRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router");
        uniswapRouter = _router;
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        paused = true;
        emit EmergencyPaused(msg.sender);
    }

    /**
     * @dev Emergency unpause
     */
    function unpause() external onlyOwner {
        paused = false;
        emit EmergencyUnpaused(msg.sender);
    }

    // ============ Core LP Logic ============

    /**
     * @notice Add liquidity using progressive hybrid strategy
     * @dev Called by IvyBond when user deposits
     * @param usdtAmount Amount of USDT to use for LP
     */
    function addLiquidityForBond(uint256 usdtAmount)
        external
        onlyBond
        nonReentrant
        whenNotPaused
    {
        require(usdtAmount > 0, "Zero amount");

        // Transfer USDT from IvyBond
        usdt.safeTransferFrom(msg.sender, address(this), usdtAmount);

        // Get current stage and reserve ratio
        (uint256 currentStage, uint256 reserveRatio) = getCurrentStageInfo();

        // ╔═══════════════════════════════════════════════════════════════╗
        // ║              CORRECT LP PAIRING CALCULATION                   ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  Problem: If we spend USDT buying IVY, less USDT for LP      ║
        // ║  Solution: Calculate balanced amount considering buy cost     ║
        // ║                                                               ║
        // ║  Formula: balancedAmount = totalUSDT / (1 + marketBuyRatio)   ║
        // ║                                                               ║
        // ║  Example (5000 USDT, 80% reserve, 20% market):                ║
        // ║  - balancedAmount = 5000 / 1.2 = 4166.67                      ║
        // ║  - Mint 3333.33 IVY from reserve (80%)                        ║
        // ║  - Buy 833.33 IVY from market (costs 833.33 USDT)             ║
        // ║  - Add LP: 4166.67 IVY + 4166.67 USDT                         ║
        // ║  - Total USDT: 833.33 + 4166.67 = 5000 ✓                      ║
        // ╚═══════════════════════════════════════════════════════════════╝

        // Calculate market buy ratio (opposite of reserve ratio)
        uint256 marketBuyRatio = BASIS_POINTS - reserveRatio;

        // Calculate balanced LP amount accounting for market buy cost
        // balancedAmount represents both IVY and USDT amounts for LP (1:1 at $1 price)
        uint256 balancedAmount = (usdtAmount * BASIS_POINTS) / (BASIS_POINTS + marketBuyRatio);

        // ╔═══════════════════════════════════════════════════════════════╗
        // ║    FIX: PRECISION LOSS (AUDIT ROUND 2, PROBLEM #10)         ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  Problem: ivyFromReserve + ivyFromMarket ≠ balancedAmount   ║
        // ║           due to integer division truncation                 ║
        // ║  Solution: Let ivyFromMarket absorb rounding error           ║
        // ║  Formula: ivyFromMarket = balancedAmount - ivyFromReserve    ║
        // ╚═══════════════════════════════════════════════════════════════╝

        // Calculate IVY split: how much from reserve vs market
        uint256 ivyFromReserve = (balancedAmount * reserveRatio) / BASIS_POINTS;
        // ✅ FIX: Absorb truncation error in market buy amount
        uint256 ivyFromMarket = balancedAmount - ivyFromReserve;

        // Calculate USDT split
        uint256 usdtForBuy = ivyFromMarket;  // USDT needed to buy IVY from market (1:1 at $1 price)
        uint256 usdtForLP = balancedAmount;   // USDT for LP pairing

        // Step 1: Mint IVY from reserve (if any)
        if (ivyFromReserve > 0) {
            require(reserveUsed + ivyFromReserve <= LP_RESERVE_CAP, "Reserve depleted");

            // Call IVY token to mint (LPManager must be authorized minter)
            IIvyTokenMinter(ivyTokenMinter).mintForLP(address(this), ivyFromReserve);

            reserveUsed += ivyFromReserve;
            totalReserveMinted += ivyFromReserve;
        }

        // Step 2: Buy IVY from market (if any)
        if (ivyFromMarket > 0 && usdtForBuy > 0) {
            // Buy IVY from Uniswap using USDT
            _buyIvyFromMarket(usdtForBuy);

            totalMarketBought += ivyFromMarket;
        }

        // Step 3: Add liquidity to Uniswap
        // Total IVY = ivyFromReserve + ivyFromMarket = balancedAmount
        uint256 ivyForLP = balancedAmount;

        _addLiquidityToUniswap(ivyForLP, usdtForLP);

        // Update stats
        totalUsdtProcessed += usdtAmount;

        emit LPAdded(usdtAmount, ivyFromReserve, ivyFromMarket, currentStage, reserveRatio);

        // Check if stage changed
        (uint256 newStage, ) = getCurrentStageInfo();
        if (newStage != currentStage) {
            emit StageChanged(newStage, reserveUsed);
        }
    }

    // ============ Internal Helper Functions ============

    /**
     * @dev Get current stage and reserve ratio
     * @return stage Current stage (1/2/3/4)
     * @return reserveRatio Reserve percentage in basis points
     */
    function getCurrentStageInfo() public view returns (uint256 stage, uint256 reserveRatio) {
        if (reserveUsed < STAGE_1_THRESHOLD) {
            return (1, STAGE_1_RESERVE_RATIO);  // Stage 1: 80%
        } else if (reserveUsed < STAGE_2_THRESHOLD) {
            return (2, STAGE_2_RESERVE_RATIO);  // Stage 2: 50%
        } else if (reserveUsed < STAGE_3_THRESHOLD) {
            return (3, STAGE_3_RESERVE_RATIO);  // Stage 3: 20%
        } else {
            return (4, STAGE_4_RESERVE_RATIO);  // Stage 4: 0%
        }
    }

    /**
     * @dev Calculate IVY amount needed for LP
     * @param usdtAmount USDT amount for LP
     * @return ivyAmount IVY amount needed (1:1 ratio at $1 price)
     *
     * TODO: In production, fetch real-time price from Oracle or Uniswap reserves
     */
    function _getIvyAmountForLP(uint256 usdtAmount) internal pure returns (uint256) {
        // Simplified: assume IVY = $1.0
        // In production, use Oracle price or Uniswap TWAP
        return usdtAmount;
    }

    /**
     * @dev Buy IVY from Uniswap using USDT
     * @param usdtAmount USDT amount to spend
     */
    function _buyIvyFromMarket(uint256 usdtAmount) internal {
        // ╔═══════════════════════════════════════════════════════════════╗
        // ║    FIX: APPROVE DOS & SLIPPAGE (AUDIT ROUND 2, #2 & #8)     ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  Fix #8: Reset approval to 0 before setting new value        ║
        // ║  Fix #2: Add 5% slippage protection (MEV defense)            ║
        // ╚═══════════════════════════════════════════════════════════════╝

        // ✅ FIX #8: Use forceApprove (OpenZeppelin v5 replacement for safeApprove)
        usdt.forceApprove(uniswapRouter, usdtAmount);

        // Prepare swap path: USDT → IVY
        address[] memory path = new address[](2);
        path[0] = address(usdt);
        path[1] = address(ivyToken);

        // ✅ FIX #2: Add 5% slippage protection
        // Calculate minimum IVY output (95% of expected at current price)
        uint256 expectedIvy = usdtAmount;  // Assuming $1 price
        uint256 minIvyOut = (expectedIvy * 9500) / 10000;  // 95% = 5% slippage

        // Execute swap (using Uniswap V2 Router)
        IUniswapV2Router(uniswapRouter).swapExactTokensForTokens(
            usdtAmount,
            minIvyOut,  // ✅ FIXED: 5% slippage protection (was 0)
            path,
            address(this),
            block.timestamp + 300  // 5 min deadline
        );
    }

    /**
     * @dev Add liquidity to Uniswap
     * @param ivyAmount IVY amount
     * @param usdtAmount USDT amount
     */
    function _addLiquidityToUniswap(uint256 ivyAmount, uint256 usdtAmount) internal {
        // ╔═══════════════════════════════════════════════════════════════╗
        // ║    FIX: APPROVE DOS & SLIPPAGE (AUDIT ROUND 2, #2 & #8)     ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  Fix #8: Reset approvals to 0 before setting new values     ║
        // ║  Fix #2: Add 5% slippage protection (MEV defense)            ║
        // ╚═══════════════════════════════════════════════════════════════╝

        // ✅ FIX #8: Use forceApprove (OpenZeppelin v5 replacement for safeApprove)
        ivyToken.forceApprove(uniswapRouter, ivyAmount);
        usdt.forceApprove(uniswapRouter, usdtAmount);

        // ✅ FIX #2: Calculate minimum amounts with 5% slippage tolerance
        uint256 minIvyAmount = (ivyAmount * 9500) / 10000;   // 95% of desired
        uint256 minUsdtAmount = (usdtAmount * 9500) / 10000; // 95% of desired

        // Add liquidity
        IUniswapV2Router(uniswapRouter).addLiquidity(
            address(ivyToken),
            address(usdt),
            ivyAmount,
            usdtAmount,
            minIvyAmount,   // ✅ FIXED: 5% slippage protection (was 0)
            minUsdtAmount,  // ✅ FIXED: 5% slippage protection (was 0)
            address(this),  // LP tokens go to LPManager
            block.timestamp + 300
        );
    }

    // ============ View Functions ============

    /**
     * @dev Get reserve status
     */
    function getReserveStatus() external view returns (
        uint256 cap,
        uint256 used,
        uint256 remaining,
        uint256 usagePercent
    ) {
        cap = LP_RESERVE_CAP;
        used = reserveUsed;
        remaining = LP_RESERVE_CAP > reserveUsed ? LP_RESERVE_CAP - reserveUsed : 0;
        usagePercent = (reserveUsed * 10000) / LP_RESERVE_CAP;  // in basis points
    }

    /**
     * @dev Get current stage description
     */
    function getCurrentStageDescription() external view returns (
        uint256 stage,
        string memory name,
        uint256 reservePercent,
        uint256 buyPercent
    ) {
        uint256 reserveRatio;
        (stage, reserveRatio) = getCurrentStageInfo();

        if (stage == 1) {
            name = "Foundation";
        } else if (stage == 2) {
            name = "Acceleration";
        } else if (stage == 3) {
            name = "Sprint";
        } else {
            name = "Mature";
        }

        reservePercent = reserveRatio / 100;  // Convert to percentage
        buyPercent = 100 - reservePercent;
    }
}

// ============ Interfaces ============

interface IIvyTokenMinter {
    function mintForLP(address to, uint256 amount) external;
}

interface IUniswapV2Router {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}
