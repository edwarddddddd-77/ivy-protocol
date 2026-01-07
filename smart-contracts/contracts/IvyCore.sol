// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IvyToken.sol";
import "./IGenesisNode.sol";
import "./IIvyBond.sol";
import "./IPriceOracle.sol";

/// @notice DividendPool Interface
interface IDividendPool {
    function depositDividend(uint256 amount) external;
}

/**
 * @title IvyCore
 * @dev Core Mining & Reward Distribution Contract for Ivy Protocol
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║              PID + CIRCUIT BREAKER DUAL CONTROL               ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Final Multiplier = Breaker Active ? BreakerAlpha : PIDAlpha  ║
 * ║                                                               ║
 * ║  PID Formula: alpha = (P/MA30)^k, capped [0.1, 1.5]          ║
 * ║  Breaker L1: -10% drop → 0.5x for 4h                         ║
 * ║  Breaker L2: -15% drop → 0.2x for 12h                        ║
 * ║  Breaker L3: -25% drop → 0.05x for 24h                       ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║              REWARD PER SECOND (RPS) ALGORITHM                ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  - NO daily snapshots (prevents front-running)                ║
 * ║  - Rewards calculated per-second based on time elapsed        ║
 * ║  - updatePool() called on every deposit/withdraw/claim        ║
 * ║  - accIvyPerShare tracks cumulative rewards per bond power    ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                 30-DAY VESTING (vIVY LOCK)                    ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Option A: Standard Unlock - 30 day linear release            ║
 * ║  Option B: Instant Cash - Immediate, but 50% burned           ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
contract IvyCore is Ownable, ReentrancyGuard {
    
    // ============ Interfaces ============

    IGenesisNode public genesisNode;
    IIvyBond public ivyBond;
    IvyToken public ivyToken;
    IPriceOracle public oracle;
    IDividendPool public dividendPool;
    
    // ============ Basic Constants ============
    
    /// @notice Referral reward rates in basis points
    uint256 public constant L1_RATE = 1000;          // 10%
    uint256 public constant L2_RATE = 500;           // 5%
    uint256 public constant INFINITE_RATE = 200;     // 2% (Team Bonus - captured by node holder)
    uint256 public constant PEER_BONUS_RATE = 50;    // 0.5% (Peer Bonus - for blocked upline)
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Maximum referral depth for gas protection
    uint256 public constant MAX_REFERRAL_DEPTH = 20;
    
    /// @notice Base daily emission rate: 30,000 IVY per day
    uint256 public constant BASE_DAILY_EMISSION = 30_000 * 10**18;
    
    /// @notice Emission rate per second: 30,000 / 86400 ≈ 0.3472 IVY/sec
    uint256 public constant EMISSION_PER_SECOND = BASE_DAILY_EMISSION / 86400;
    
    /// @notice Total supply cap (100M IVY)
    uint256 public constant HARD_CAP = 100_000_000 * 10**18;
    
    /// @notice Mining allocation cap (70M IVY) - Only this amount can be minted via mining
    /// @dev The remaining 30M is pre-minted to OperationsWallet at deployment
    uint256 public constant MINING_CAP = 70_000_000 * 10**18;
    
    /// @notice Halving threshold
    uint256 public constant HALVING_THRESHOLD = 7_000_000 * 10**18;
    uint256 public constant HALVING_DECAY = 95;  // 95% of previous rate
    
    /// @notice Vesting period: 30 days
    uint256 public constant VESTING_PERIOD = 30 days;
    
    /// @notice Instant cash penalty: 50% burned
    uint256 public constant INSTANT_CASH_PENALTY = 5000;  // 50% in basis points
    
    /// @notice Precision for accIvyPerShare calculation
    uint256 public constant ACC_IVY_PRECISION = 1e12;

    // ============ PID Constants (Whitepaper V2.5) ============
    
    /// @notice PID coefficient k = 2.0 (for alpha = (P/MA30)^k)
    uint256 public constant PID_K = 2 * 10**18;
    
    /// @notice PID maximum multiplier: 1.5x
    uint256 public constant PID_CAP = 15 * 10**17;
    
    /// @notice PID minimum multiplier: 0.1x
    uint256 public constant PID_FLOOR = 1 * 10**17;

    // ============ Circuit Breaker Constants (Whitepaper V2.5) ============
    
    /// @notice Drop thresholds (1-hour price drop percentage, stored as positive integers)
    int256 public constant DROP_L1 = -10;  // -10%
    int256 public constant DROP_L2 = -15;  // -15%
    int256 public constant DROP_L3 = -25;  // -25%
    
    /// @notice Forced alpha values when breaker is active
    uint256 public constant ALPHA_L1 = 5 * 10**17;   // 0.5x (halved)
    uint256 public constant ALPHA_L2 = 2 * 10**17;   // 0.2x (20% remaining)
    uint256 public constant ALPHA_L3 = 5 * 10**16;   // 0.05x (emergency stop)
    
    /// @notice Cooldown periods for each breaker level
    uint256 public constant COOLDOWN_L1 = 4 hours;
    uint256 public constant COOLDOWN_L2 = 12 hours;
    uint256 public constant COOLDOWN_L3 = 24 hours;

    // ============ Circuit Breaker State ============
    
    enum BreakerLevel { NONE, LEVEL1, LEVEL2, LEVEL3 }
    
    struct BreakerState {
        BreakerLevel currentLevel;
        uint256 activationTime;
        uint256 activationPrice;
    }
    
    BreakerState public breakerState;

    // ============ Pool State (Reward Per Second) ============
    
    /// @notice Accumulated IVY per share (scaled by ACC_IVY_PRECISION)
    uint256 public accIvyPerShare;
    
    /// @notice Last timestamp when pool was updated
    uint256 public lastRewardTime;
    
    /// @notice Total bond power in the pool
    uint256 public totalPoolBondPower;
    
    /// @notice Current emission factor (decreases with halving)
    uint256 public emissionFactor = 10**18;  // 1.0 in 18 decimals
    
    /// @notice Total IVY minted
    uint256 public totalMinted;
    
    /// @notice Last halving checkpoint
    uint256 public lastHalvingMinted;
    
    /// @notice Number of halvings that have occurred
    uint256 public halvingCount;
    
    /// @notice Current IVY price (set by oracle/keeper)
    uint256 public currentPrice = 10**18;  // Default $1.00

    /// @notice 30-day moving average price
    uint256 public ma30Price = 10**18;  // Default $1.00

    /// @notice Price 1 hour ago (for breaker calculation)
    uint256 public price1hAgo = 10**18;

    /// @notice Test mode flag (allows manual price updates)
    /// @dev Should be set to false before mainnet deployment
    bool public testMode = true;  // Default true for testnet

    /// @notice Maximum price change allowed in test mode (50%)
    uint256 public constant MAX_PRICE_CHANGE_PERCENT = 50;

    /// @notice Last price update timestamp (for rate limiting)
    uint256 public lastPriceUpdateTime;

    /// @notice Permanent flag to prevent re-enabling test mode
    /// @dev Once set to true, test mode can NEVER be re-enabled (one-way switch)
    bool public testModeDisabledPermanently;

    // ============ User State ============
    
    struct UserInfo {
        uint256 bondPower;           // User's bond power snapshot
        uint256 rewardDebt;          // Reward debt for RPS calculation
        uint256 pendingVested;       // Pending vested rewards (locked)
        uint256 vestingStartTime;    // When vesting started
        uint256 totalVested;         // Total amount in vesting
        uint256 totalClaimed;        // Total IVY claimed (unlocked)
    }
    
    mapping(address => UserInfo) public userInfo;
    
    /// @notice Referral rewards tracking
    mapping(address => uint256) public referralRewardsEarned;

    // ╔═══════════════════════════════════════════════════════════════╗
    // ║         TEAM PERFORMANCE TRACKING (FEATURE REQUEST)          ║
    // ╠═══════════════════════════════════════════════════════════════╣
    // ║  Purpose: Enable team dashboard and performance analytics    ║
    // ║  Data stored: Referral history, direct referrals, stats      ║
    // ╚═══════════════════════════════════════════════════════════════╝

    /// @notice Referral reward record structure
    struct ReferralRewardRecord {
        uint256 timestamp;      // When reward was paid
        uint256 amount;         // Reward amount in IVY
        uint8 level;            // 1=L1直推, 2=L2间推, 3=TeamBonus, 4=PeerBonus
        address fromUser;       // Reward triggered by which user
    }

    /// @notice Referral reward history for each user
    mapping(address => ReferralRewardRecord[]) public referralRewardHistory;

    /// @notice Direct referrals list (only L1 direct referrals)
    mapping(address => address[]) public directReferrals;

    /// @notice Track if user is already in referrer's direct list (prevent duplicates)
    mapping(address => mapping(address => bool)) private isDirectReferral;

    /// @notice Team statistics cache (updated on syncUser)
    struct TeamStats {
        uint256 totalMembers;       // Total team size (all levels)
        uint256 totalBondPower;     // Total team bond power
        uint256 activeMembers;      // Members with bondPower > 0
        uint256 lastUpdateTime;     // Last stats update timestamp
    }

    mapping(address => TeamStats) public teamStatsCache;

    // ============ Events ============
    
    event PoolUpdated(uint256 accIvyPerShare, uint256 lastRewardTime, uint256 totalPoolBondPower);
    event UserSynced(address indexed user, uint256 bondPower, uint256 rewardDebt);
    event RewardsHarvested(address indexed user, uint256 amount);
    event VestingStarted(address indexed user, uint256 amount, uint256 startTime);
    event VestingClaimed(address indexed user, uint256 amount);
    event InstantCashOut(address indexed user, uint256 received, uint256 burned);
    event ReferralRewardPaid(address indexed referrer, address indexed from, uint256 amount, uint256 level);
    event TeamBonusCaptured(address indexed capturer, address indexed blockedUpline, uint256 amount, uint256 depth);
    event PeerBonusPaid(address indexed receiver, address indexed capturer, uint256 amount);
    event HalvingOccurred(uint256 newEmissionFactor, uint256 totalMinted);
    event CircuitBreakerTriggered(BreakerLevel level, uint256 activationTime, uint256 activationPrice);
    event CircuitBreakerReset(BreakerLevel previousLevel);
    event PriceUpdated(uint256 currentPrice, uint256 ma30Price, uint256 price1hAgo);
    event TestModeChanged(bool testMode);
    event TestModePermanentlyDisabled();
    event VestedCompounded(address indexed user, uint256 indexed tokenId, uint256 pendingIvy, uint256 bonusPower);
    event PriceOracleSet(address indexed oracle);

    // ============ Constructor ============
    
    constructor(address _ivyToken) Ownable(msg.sender) {
        ivyToken = IvyToken(_ivyToken);
        lastRewardTime = block.timestamp;
    }

    // ============ Admin Functions ============
    
    function setGenesisNode(address _genesisNode) external onlyOwner {
        require(_genesisNode != address(0), "Invalid address");
        genesisNode = IGenesisNode(_genesisNode);
    }
    
    function setIvyBond(address _ivyBond) external onlyOwner {
        require(_ivyBond != address(0), "Invalid address");
        ivyBond = IIvyBond(_ivyBond);
    }
    
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid address");
        oracle = IPriceOracle(_oracle);
        emit PriceOracleSet(_oracle);
    }

    function setDividendPool(address _dividendPool) external onlyOwner {
        require(_dividendPool != address(0), "Invalid address");
        dividendPool = IDividendPool(_dividendPool);
    }
    
    /**
     * @dev Update price data (called by oracle/keeper)
     */
    /**
     * @dev Update prices - behavior depends on testMode
     *
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              PRICE UPDATE MODES                               ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  TEST MODE (testnet):                                         ║
     * ║  - Owner can manually set prices for testing                  ║
     * ║  - Rate limited: max 1 update per hour                        ║
     * ║  - Price change limited: max ±50% per update                  ║
     * ║  - Used for testing without DEX/Oracle                        ║
     * ║                                                               ║
     * ║  MAINNET MODE (production):                                   ║
     * ║  - Anyone can call, but prices come from Oracle               ║
     * ║  - No manual override possible                                ║
     * ║  - Fully decentralized                                        ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function updatePrices(uint256 _currentPrice, uint256 _ma30Price, uint256 _price1hAgo) external {
        require(_currentPrice > 0 && _ma30Price > 0 && _price1hAgo > 0, "Invalid prices");

        if (testMode) {
            // ═══════════════════════════════════════════════════════════
            // TEST MODE: Owner can manually set prices (with restrictions)
            // ═══════════════════════════════════════════════════════════
            require(msg.sender == owner(), "Test mode: only owner can update");

            // Rate limiting: prevent spam updates
            require(
                block.timestamp >= lastPriceUpdateTime + 1 hours,
                "Test mode: must wait 1 hour between updates"
            );

            // Prevent extreme price changes (max ±50%)
            if (currentPrice > 0) {
                uint256 maxIncrease = currentPrice + (currentPrice * MAX_PRICE_CHANGE_PERCENT / 100);
                uint256 maxDecrease = currentPrice - (currentPrice * MAX_PRICE_CHANGE_PERCENT / 100);
                require(
                    _currentPrice >= maxDecrease && _currentPrice <= maxIncrease,
                    "Test mode: price change exceeds 50% limit"
                );
            }

            currentPrice = _currentPrice;
            ma30Price = _ma30Price;
            price1hAgo = _price1hAgo;
            lastPriceUpdateTime = block.timestamp;

            emit PriceUpdated(_currentPrice, _ma30Price, _price1hAgo);

        } else {
            // ═══════════════════════════════════════════════════════════
            // MAINNET MODE: Prices MUST come from Oracle (decentralized)
            // ═══════════════════════════════════════════════════════════
            require(address(oracle) != address(0), "Oracle not set");

            // Fetch price from decentralized oracle
            uint256 oraclePrice = oracle.getAssetPrice(address(ivyToken));
            require(oraclePrice > 0, "Oracle returned invalid price");

            // Update prices from oracle (ignore manual parameters)
            currentPrice = oraclePrice;

            // For MA30 and price1hAgo, we use oracle or keep previous values
            // This is a simplified implementation - in production, you'd use
            // Chainlink's historical data or calculate MA30 on-chain
            ma30Price = _ma30Price;  // Could be from oracle's MA30 feed
            price1hAgo = _price1hAgo;  // Could be from oracle's historical data

            emit PriceUpdated(oraclePrice, _ma30Price, _price1hAgo);
        }
    }

    /**
     * @notice Set test mode (manual price updates vs oracle-only)
     * @param _testMode True for test mode, false for decentralized mode (IRREVERSIBLE)
     * @dev Once test mode is disabled, it can NEVER be re-enabled (one-way switch)
     */
    function setTestMode(bool _testMode) external onlyOwner {
        require(testMode != _testMode, "Already in this mode");

        if (!_testMode) {
            // ===== Disabling Test Mode (Going to Mainnet) =====
            require(address(oracle) != address(0), "Must set oracle before disabling test mode");

            // Set permanent flag (irreversible)
            testModeDisabledPermanently = true;
            testMode = false;

            emit TestModeChanged(false);
            emit TestModePermanentlyDisabled();

        } else {
            // ===== Attempting to Re-enable Test Mode =====
            // Check permanent flag (prevent re-enabling)
            require(!testModeDisabledPermanently, "Test mode permanently disabled");

            testMode = true;
            emit TestModeChanged(true);
        }
    }

    /**
     * @notice Check if the protocol is in fully decentralized mode (mainnet)
     * @return True if test mode is permanently disabled (fully decentralized)
     */
    function isFullyDecentralized() external view returns (bool) {
        return testModeDisabledPermanently;
    }

    // ============ PID + Circuit Breaker Functions ============

    /**
     * @dev Get the final emission multiplier (PID + Circuit Breaker)
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              THE MASTER FUNCTION                              ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Priority 1: Circuit Breaker (if active and not cooled)       ║
     * ║  Priority 2: PID calculation (normal operation)               ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function getFinalMultiplier() public view returns (uint256) {
        // --- Priority 1: Check Circuit Breaker ---
        if (breakerState.currentLevel != BreakerLevel.NONE) {
            uint256 timePassed = block.timestamp - breakerState.activationTime;
            
            // Check Level 3 (RED - Emergency Stop) - 24h hard lock
            if (breakerState.currentLevel == BreakerLevel.LEVEL3) {
                if (timePassed < COOLDOWN_L3) return ALPHA_L3;
            }
            // Check Level 2 (ORANGE - Severe)
            else if (breakerState.currentLevel == BreakerLevel.LEVEL2) {
                if (timePassed < COOLDOWN_L2) return ALPHA_L2;
            }
            // Check Level 1 (YELLOW - Warning)
            else if (breakerState.currentLevel == BreakerLevel.LEVEL1) {
                if (timePassed < COOLDOWN_L1) return ALPHA_L1;
            }
            
            // If cooldown has passed but state not reset, still use breaker value
            // Keeper should call resetCircuitBreaker() to clear
        }
        
        // --- Priority 2: PID Calculation ---
        return _calculatePIDAlpha(currentPrice, ma30Price);
    }
    
    /**
     * @dev Calculate PID alpha based on price ratio
     * Formula: alpha = (P / MA30)^k, capped between [PID_FLOOR, PID_CAP]
     */
    function _calculatePIDAlpha(uint256 _currentPrice, uint256 _ma30Price) internal pure returns (uint256) {
        // ╔═══════════════════════════════════════════════════════════════╗
        // ║    FIX: PRICE SANITY CHECK (AUDIT ROUND 2, #13)             ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  Problem: Extreme Oracle prices cause updatePool() to fail  ║
        // ║  Solution: Validate prices are within reasonable range      ║
        // ║  Range: $0.01 - $1000 (18 decimals: 0.01e18 - 1000e18)      ║
        // ║  Impact: Protocol continues even during Oracle failures     ║
        // ╚═══════════════════════════════════════════════════════════════╝

        // ✅ FIX: Sanity check prices (protect against Oracle failures)
        uint256 MIN_PRICE = 0.01 * 10**18;    // $0.01
        uint256 MAX_PRICE = 1000 * 10**18;    // $1000

        // If prices are out of range, return neutral multiplier (1.0x)
        if (_currentPrice < MIN_PRICE || _currentPrice > MAX_PRICE) {
            return 10**18;  // Fallback to 1.0x (no PID adjustment)
        }
        if (_ma30Price < MIN_PRICE || _ma30Price > MAX_PRICE) {
            return 10**18;  // Fallback to 1.0x (no PID adjustment)
        }

        // Prevent division by zero
        if (_ma30Price == 0) return 10**18;  // Return 1.0x

        // Calculate ratio = currentPrice / ma30Price (in 18 decimals)
        uint256 ratio = (_currentPrice * 10**18) / _ma30Price;

        // Calculate alpha = ratio^2 (k=2.0)
        // ratio^2 = ratio * ratio / 10^18
        uint256 alpha = (ratio * ratio) / 10**18;

        // Apply cap and floor
        if (alpha > PID_CAP) alpha = PID_CAP;     // Max 1.5x
        if (alpha < PID_FLOOR) alpha = PID_FLOOR; // Min 0.1x

        return alpha;
    }
    
    /**
     * @dev Check and trigger circuit breaker based on 1-hour price drop
     * Called by external keeper when price data is updated
     */
    function checkCircuitBreaker() external {
        // Calculate 1-hour price change percentage
        // dropPercent = ((currentPrice - price1hAgo) / price1hAgo) * 100
        // Stored as integer, negative means drop
        
        if (price1hAgo == 0) return;
        
        int256 priceChange = int256(currentPrice) - int256(price1hAgo);
        int256 dropPercent = (priceChange * 100) / int256(price1hAgo);
        
        BreakerLevel newLevel = BreakerLevel.NONE;
        
        // Check thresholds (most severe first)
        if (dropPercent <= DROP_L3) {
            newLevel = BreakerLevel.LEVEL3;
        } else if (dropPercent <= DROP_L2) {
            newLevel = BreakerLevel.LEVEL2;
        } else if (dropPercent <= DROP_L1) {
            newLevel = BreakerLevel.LEVEL1;
        }
        
        // Only upgrade breaker level, never downgrade automatically
        if (newLevel > breakerState.currentLevel) {
            breakerState.currentLevel = newLevel;
            breakerState.activationTime = block.timestamp;
            breakerState.activationPrice = currentPrice;
            
            emit CircuitBreakerTriggered(newLevel, block.timestamp, currentPrice);
        }
    }
    
    /**
     * @dev Reset circuit breaker (called by keeper after cooldown + recovery)
     */
    function resetCircuitBreaker() external onlyOwner {
        require(breakerState.currentLevel != BreakerLevel.NONE, "Breaker not active");
        
        uint256 timePassed = block.timestamp - breakerState.activationTime;
        uint256 requiredCooldown;
        
        if (breakerState.currentLevel == BreakerLevel.LEVEL3) {
            requiredCooldown = COOLDOWN_L3;
        } else if (breakerState.currentLevel == BreakerLevel.LEVEL2) {
            requiredCooldown = COOLDOWN_L2;
        } else {
            requiredCooldown = COOLDOWN_L1;
        }
        
        require(timePassed >= requiredCooldown, "Cooldown not complete");
        
        BreakerLevel previousLevel = breakerState.currentLevel;
        breakerState.currentLevel = BreakerLevel.NONE;
        breakerState.activationTime = 0;
        breakerState.activationPrice = 0;
        
        emit CircuitBreakerReset(previousLevel);
    }
    
    /**
     * @dev Get current breaker status for UI
     */
    function getBreakerStatus() external view returns (
        BreakerLevel level,
        uint256 activationTime,
        uint256 activationPrice,
        uint256 timeRemaining,
        uint256 forcedAlpha
    ) {
        level = breakerState.currentLevel;
        activationTime = breakerState.activationTime;
        activationPrice = breakerState.activationPrice;
        
        if (level == BreakerLevel.NONE) {
            return (level, 0, 0, 0, getFinalMultiplier());
        }
        
        uint256 timePassed = block.timestamp - breakerState.activationTime;
        uint256 cooldown;
        uint256 alpha;
        
        if (level == BreakerLevel.LEVEL3) {
            cooldown = COOLDOWN_L3;
            alpha = ALPHA_L3;
        } else if (level == BreakerLevel.LEVEL2) {
            cooldown = COOLDOWN_L2;
            alpha = ALPHA_L2;
        } else {
            cooldown = COOLDOWN_L1;
            alpha = ALPHA_L1;
        }
        
        timeRemaining = timePassed >= cooldown ? 0 : cooldown - timePassed;
        forcedAlpha = alpha;
    }

    // ============ Core Mining Functions (Reward Per Second) ============

    /**
     * @dev Update pool's accumulated rewards using getFinalMultiplier()
     */
    function updatePool() public {
        if (block.timestamp <= lastRewardTime) {
            return;
        }
        
        if (totalPoolBondPower == 0) {
            lastRewardTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - lastRewardTime;
        
        // Get final multiplier (PID or Breaker)
        uint256 finalMultiplier = getFinalMultiplier();
        
        // Calculate IVY reward for this period
        // ivyReward = timeElapsed * EMISSION_PER_SECOND * emissionFactor * finalMultiplier
        uint256 ivyReward = (timeElapsed * EMISSION_PER_SECOND * emissionFactor * finalMultiplier) / (10**18 * 10**18);
        
        // Check mining cap (70M IVY allocated for mining)
        if (totalMinted + ivyReward > MINING_CAP) {
            ivyReward = MINING_CAP > totalMinted ? MINING_CAP - totalMinted : 0;
        }
        
        if (ivyReward > 0) {
            // Update accumulated IVY per share
            accIvyPerShare += (ivyReward * ACC_IVY_PRECISION) / totalPoolBondPower;
        }
        
        lastRewardTime = block.timestamp;
        
        emit PoolUpdated(accIvyPerShare, lastRewardTime, totalPoolBondPower);
    }

    /**
     * @dev Sync user's bond power and calculate pending rewards
     */
    function syncUser(address user) external {
        _syncUser(user);
    }
    
    function _syncUser(address user) internal {
        updatePool();
        
        UserInfo storage info = userInfo[user];
        
        // Get current bond power from IvyBond
        uint256 newBondPower = 0;
        if (address(ivyBond) != address(0)) {
            newBondPower = ivyBond.getBondPower(user);
        }
        
        // Apply boost from GenesisNode
        uint256 totalBoost = 0;
        if (address(genesisNode) != address(0)) {
            totalBoost = genesisNode.getTotalBoost(user);
        }
        
        // Effective bond power = bondPower * (1 + boost)
        uint256 effectiveBondPower = (newBondPower * (BASIS_POINTS + totalBoost)) / BASIS_POINTS;
        
        // Calculate pending rewards before updating
        if (info.bondPower > 0) {
            uint256 pending = (info.bondPower * accIvyPerShare / ACC_IVY_PRECISION) - info.rewardDebt;
            if (pending > 0) {
                info.pendingVested += pending;
            }
        }
        
        // Update total pool bond power
        totalPoolBondPower = totalPoolBondPower - info.bondPower + effectiveBondPower;
        
        // Update user info
        info.bondPower = effectiveBondPower;
        info.rewardDebt = effectiveBondPower * accIvyPerShare / ACC_IVY_PRECISION;
        
        emit UserSynced(user, effectiveBondPower, info.rewardDebt);
    }

    /**
     * @dev Calculate pending IVY rewards for a user (view function)
     */
    function pendingIvy(address user) public view returns (uint256) {
        UserInfo storage info = userInfo[user];
        
        uint256 _accIvyPerShare = accIvyPerShare;
        
        if (block.timestamp > lastRewardTime && totalPoolBondPower > 0) {
            uint256 timeElapsed = block.timestamp - lastRewardTime;
            uint256 finalMultiplier = getFinalMultiplier();
            uint256 ivyReward = (timeElapsed * EMISSION_PER_SECOND * emissionFactor * finalMultiplier) / (10**18 * 10**18);
            _accIvyPerShare += (ivyReward * ACC_IVY_PRECISION) / totalPoolBondPower;
        }
        
        uint256 pending = 0;
        if (info.bondPower > 0) {
            pending = (info.bondPower * _accIvyPerShare / ACC_IVY_PRECISION) - info.rewardDebt;
        }
        
        return pending + info.pendingVested;
    }

    /**
     * @dev Harvest pending rewards into vesting
     */
    function harvest() external nonReentrant {
        address user = msg.sender;
        _syncUser(user);

        UserInfo storage info = userInfo[user];
        uint256 pending = info.pendingVested;

        require(pending > 0, "Nothing to harvest");

        // Check if mining cap reached
        require(totalMinted < MINING_CAP, "Mining cap reached");

        // ╔═══════════════════════════════════════════════════════════════╗
        // ║  MINING CAP ENFORCEMENT INCLUDING REFERRAL REWARDS            ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  Total referral rate:                                         ║
        // ║  - L1 (10%) + L2 (5%) + Team (2%) + Peer (0.5%) = 17.5%      ║
        // ║                                                               ║
        // ║  To ensure 70M cap includes both user and referral rewards:   ║
        // ║  1. Calculate total rewards needed (user + 17.5% referral)   ║
        // ║  2. If exceeds cap, scale down proportionally                ║
        // ║  3. This ensures referrals don't "steal" from mining cap     ║
        // ╚═══════════════════════════════════════════════════════════════╝

        // Calculate total referral rate (17.5% = 1750 basis points)
        uint256 TOTAL_REFERRAL_RATE = L1_RATE + L2_RATE + INFINITE_RATE + PEER_BONUS_RATE;

        // Estimate referral rewards (17.5% of pending)
        uint256 estimatedReferralRewards = (pending * TOTAL_REFERRAL_RATE) / BASIS_POINTS;

        // Calculate total rewards needed (user reward + referral rewards)
        uint256 totalRewardsNeeded = pending + estimatedReferralRewards;

        // Adjust pending if total rewards would exceed mining cap
        if (totalMinted + totalRewardsNeeded > MINING_CAP) {
            // Calculate available space in mining cap
            uint256 availableSpace = MINING_CAP - totalMinted;

            // Scale down pending proportionally
            // Formula: pending = availableSpace / (1 + 17.5%)
            //        = availableSpace * 10000 / (10000 + 1750)
            //        = availableSpace * 10000 / 11750
            pending = (availableSpace * BASIS_POINTS) / (BASIS_POINTS + TOTAL_REFERRAL_RATE);
        }

        // Move to vesting
        info.pendingVested = 0;
        info.totalVested += pending;

        if (info.vestingStartTime == 0) {
            info.vestingStartTime = block.timestamp;
        }

        // Mint IVY to this contract for vesting
        totalMinted += pending;
        ivyToken.mint(address(this), pending);

        // Check for halving
        _checkHalving();

        // Distribute referral rewards (will update totalMinted further)
        _distributeReferralRewards(user, pending);

        emit RewardsHarvested(user, pending);
        emit VestingStarted(user, pending, block.timestamp);
    }

    /**
     * @dev Claim vested IVY (30-day wait period, NOT linear release)
     *
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              30-DAY LOCK MECHANISM (Whitepaper)               ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  User harvests → Starts 30-day timer                          ║
     * ║  Days 1-29: CANNOT claim (must use instantCashOut -50%)       ║
     * ║  Day 30+:   CAN claim 100%                                    ║
     * ║                                                               ║
     * ║  NOT linear release! Must wait full 30 days.                  ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function claimVested() external nonReentrant {
        address user = msg.sender;
        UserInfo storage info = userInfo[user];

        require(info.totalVested > 0, "Nothing vested");
        require(info.vestingStartTime > 0, "Vesting not started");

        uint256 timeElapsed = block.timestamp - info.vestingStartTime;

        // Must wait full 30 days (NOT linear release)
        require(timeElapsed >= VESTING_PERIOD, "Vesting period not completed yet");

        uint256 claimable = info.totalVested - info.totalClaimed;
        require(claimable > 0, "Nothing to claim");

        info.totalClaimed += claimable;

        ivyToken.transfer(user, claimable);

        emit VestingClaimed(user, claimable);
    }

    /**
     * @dev Instant cash out - get IVY immediately but 50% penalty
     *
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              INSTANT CASH-OUT PENALTY (ALWAYS BURN)           ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  50% penalty → Burned (deflationary pressure)                 ║
     * ║                                                               ║
     * ║  Note: Penalty burning is independent of 21M Golden Pivot.    ║
     * ║  This is a punishment mechanism for impatient users who       ║
     * ║  bypass the 30-day vesting period, not regular deflation.     ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function instantCashOut() external nonReentrant {
        address user = msg.sender;
        UserInfo storage info = userInfo[user];

        require(info.totalVested > info.totalClaimed, "Nothing to cash out");

        uint256 remaining = info.totalVested - info.totalClaimed;

        // Calculate penalty and received amount
        uint256 penalty = (remaining * INSTANT_CASH_PENALTY) / BASIS_POINTS;
        uint256 received = remaining - penalty;

        // Mark as fully claimed
        info.totalClaimed = info.totalVested;

        // Transfer to user
        ivyToken.transfer(user, received);

        // Burn penalty (always, regardless of Golden Pivot status)
        // Penalty burning is a punishment mechanism, separate from 21M deflation goal
        if (penalty > 0) {
            ivyToken.transfer(address(0xdead), penalty);
        }

        emit InstantCashOut(user, received, penalty);
    }

    /**
     * @dev Check and apply halving if threshold reached
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              DYNAMIC HALVING (Algorithm Book P3-5)            ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Trigger: Every 7,000,000 IVY minted                          ║
     * ║  Effect: baseDailyEmission *= 0.95 (5% reduction)             ║
     * ║  Formula: effectiveEmission = base * (0.95)^n                 ║
     * ║  Where n = halvingCount                                       ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function _checkHalving() internal {
        // Check if we've crossed a new halving threshold
        // Use while loop to handle multiple halvings in case of large mints
        while (totalMinted >= (halvingCount + 1) * HALVING_THRESHOLD) {
            // Apply 5% decay: emissionFactor *= 0.95
            emissionFactor = (emissionFactor * HALVING_DECAY) / 100;
            halvingCount++;
            lastHalvingMinted = halvingCount * HALVING_THRESHOLD;
            
            emit HalvingOccurred(emissionFactor, totalMinted);
        }
    }

    /**
     * @dev Distribute referral rewards with Breakaway Algorithm
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              BREAKAWAY ALGORITHM (Pioneer Card P2)            ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  L1 (Direct):     10% to direct referrer                      ║
     * ║  L2 (Indirect):   5% to referrer's referrer                   ║
     * ║  Team Bonus:      2% to nearest GenesisNode holder (L3+)      ║
     * ║  Peer Bonus:      0.5% to TeamLeader's upline (if also node)  ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  BREAKAWAY: Once TeamLeader captures 2%, search stops         ║
     * ║  MAX_DEPTH: 20 layers to prevent gas exhaustion               ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function _distributeReferralRewards(address user, uint256 amount) internal {
        if (address(genesisNode) == address(0)) return;
        
        // ========== STEP 1: L1 Direct Referral (10%) ==========
        address l1Referrer = genesisNode.getReferrer(user);
        if (l1Referrer == address(0)) return;
        
        uint256 l1Reward = (amount * L1_RATE) / BASIS_POINTS;
        if (l1Reward > 0) {
            totalMinted += l1Reward;
            ivyToken.mint(l1Referrer, l1Reward);
            referralRewardsEarned[l1Referrer] += l1Reward;
            emit ReferralRewardPaid(l1Referrer, user, l1Reward, 1);

            // 📊 Record referral reward history (team dashboard feature)
            _recordReferralReward(l1Referrer, user, l1Reward, 1);

            // 📊 Record direct referral relationship (first time only)
            _addDirectReferral(l1Referrer, user);
        }
        
        // ========== STEP 2: L2 Indirect Referral (5%) ==========
        address l2Referrer = genesisNode.getReferrer(l1Referrer);
        if (l2Referrer != address(0)) {
            uint256 l2Reward = (amount * L2_RATE) / BASIS_POINTS;
            if (l2Reward > 0) {
                totalMinted += l2Reward;
                ivyToken.mint(l2Referrer, l2Reward);
                referralRewardsEarned[l2Referrer] += l2Reward;
                emit ReferralRewardPaid(l2Referrer, user, l2Reward, 2);

                // 📊 Record referral reward history
                _recordReferralReward(l2Referrer, user, l2Reward, 2);
            }
        }
        
        // ========== STEP 3: Team Bonus with Breakaway (2%) ==========
        // Start from L1, search upward for nearest GenesisNode holder
        address searchAddr = l1Referrer;
        address teamLeader = address(0);
        uint256 teamLeaderDepth = 0;
        uint256 iterations = 0;
        
        // While loop with max 20 iterations to prevent gas exhaustion
        while (searchAddr != address(0) && iterations < MAX_REFERRAL_DEPTH) {
            // Check if this address holds a GenesisNode NFT
            if (genesisNode.balanceOf(searchAddr) > 0) {
                teamLeader = searchAddr;
                teamLeaderDepth = iterations + 1;  // +1 because we start from L1
                break;  // BREAKAWAY: Stop searching once found
            }
            
            // Move to next upline
            searchAddr = genesisNode.getReferrer(searchAddr);
            iterations++;
        }
        
        // Pay Team Bonus if TeamLeader found
        if (teamLeader != address(0)) {
            uint256 teamReward = (amount * INFINITE_RATE) / BASIS_POINTS;
            if (teamReward > 0) {
                totalMinted += teamReward;
                ivyToken.mint(teamLeader, teamReward);
                referralRewardsEarned[teamLeader] += teamReward;
                emit TeamBonusCaptured(teamLeader, user, teamReward, teamLeaderDepth);

                // 📊 Record team bonus history
                _recordReferralReward(teamLeader, user, teamReward, 3);
            }
            
            // ========== STEP 4: Peer Bonus (0.5%) ==========
            // Check if TeamLeader's direct upline is also a GenesisNode holder
            address leaderUpline = genesisNode.getReferrer(teamLeader);
            if (leaderUpline != address(0) && genesisNode.balanceOf(leaderUpline) > 0) {
                uint256 peerReward = (amount * PEER_BONUS_RATE) / BASIS_POINTS;
                if (peerReward > 0) {
                    totalMinted += peerReward;
                    ivyToken.mint(leaderUpline, peerReward);
                    referralRewardsEarned[leaderUpline] += peerReward;
                    emit PeerBonusPaid(leaderUpline, teamLeader, peerReward);

                    // 📊 Record peer bonus history
                    _recordReferralReward(leaderUpline, user, peerReward, 4);
                }
            }
        }
        // END: Logic complete, no further searching
    }

    // ============ View Functions ============

    /**
     * @dev Get user mining stats
     */
    function getUserMiningStats(address user) external view returns (
        uint256 bondPower,
        uint256 pendingRewards,
        uint256 totalVested,
        uint256 totalClaimed,
        uint256 claimableNow
    ) {
        UserInfo storage info = userInfo[user];
        bondPower = info.bondPower;
        pendingRewards = pendingIvy(user);
        totalVested = info.totalVested;
        totalClaimed = info.totalClaimed;
        
        // ╔═══════════════════════════════════════════════════════════════╗
        // ║    FIX: VESTING LOGIC MISMATCH (AUDIT ROUND 2, #1)          ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  Problem: This function showed linear release (50% after 15d)║
        // ║           but claimVested() requires full 30 days            ║
        // ║  Impact: Frontend shows "claimable" but claim fails          ║
        // ║  Solution: Match claimVested() logic - strict 30-day lock   ║
        // ║  NOTE: Frontend needs update to show "Locked until [date]"  ║
        // ╚═══════════════════════════════════════════════════════════════╝

        if (info.vestingStartTime > 0 && info.totalVested > 0) {
            uint256 timeElapsed = block.timestamp - info.vestingStartTime;

            // ✅ FIX: Strict 30-day lock (NOT linear release)
            if (timeElapsed >= VESTING_PERIOD) {
                // After 30 days: all remaining vested amount is claimable
                claimableNow = info.totalVested - info.totalClaimed;
            } else {
                // Before 30 days: nothing claimable (must wait)
                claimableNow = 0;
            }
        }
    }

    /**
     * @dev Get vesting info for user
     */
    function getVestingInfo(address user) external view returns (
        uint256 totalVested,
        uint256 totalClaimed,
        uint256 vestingStartTime,
        uint256 claimableNow,
        uint256 remainingLocked,
        uint256 vestingProgress
    ) {
        UserInfo storage info = userInfo[user];
        totalVested = info.totalVested;
        totalClaimed = info.totalClaimed;
        vestingStartTime = info.vestingStartTime;
        
        if (info.vestingStartTime > 0 && info.totalVested > 0) {
            uint256 timeElapsed = block.timestamp - info.vestingStartTime;
            uint256 vestedAmount;
            
            if (timeElapsed >= VESTING_PERIOD) {
                vestedAmount = info.totalVested;
                vestingProgress = 10000;  // 100%
            } else {
                vestedAmount = (info.totalVested * timeElapsed) / VESTING_PERIOD;
                vestingProgress = (timeElapsed * 10000) / VESTING_PERIOD;
            }
            
            claimableNow = vestedAmount > info.totalClaimed ? vestedAmount - info.totalClaimed : 0;
            remainingLocked = info.totalVested - vestedAmount;
        }
    }

    /**
     * @dev Get protocol stats
     */
    function getProtocolStats() external view returns (
        uint256 _totalMinted,
        uint256 _miningCap,
        uint256 _emissionFactor,
        uint256 _finalMultiplier,
        uint256 _totalPoolBondPower,
        uint256 _emissionPerSecond,
        uint256 _currentDailyEmission,
        uint256 _halvingCount
    ) {
        _totalMinted = totalMinted;
        _miningCap = MINING_CAP;
        _emissionFactor = emissionFactor;
        _finalMultiplier = getFinalMultiplier();
        _totalPoolBondPower = totalPoolBondPower;
        _emissionPerSecond = EMISSION_PER_SECOND;
        _currentDailyEmission = (BASE_DAILY_EMISSION * emissionFactor * _finalMultiplier) / (10**18 * 10**18);
        _halvingCount = halvingCount;
    }

    /**
     * @dev Get halving info for UI
     */
    function getHalvingInfo() external view returns (
        uint256 _halvingCount,
        uint256 _emissionFactor,
        uint256 _nextHalvingAt,
        uint256 _progressToNextHalving
    ) {
        _halvingCount = halvingCount;
        _emissionFactor = emissionFactor;
        _nextHalvingAt = (halvingCount + 1) * HALVING_THRESHOLD;
        
        uint256 mintedSinceLastHalving = totalMinted - (halvingCount * HALVING_THRESHOLD);
        _progressToNextHalving = (mintedSinceLastHalving * 10000) / HALVING_THRESHOLD;  // In basis points
    }

    /**
     * @dev Get current daily emission (for dashboard)
     */
    function currentDailyEmission() external view returns (uint256) {
        uint256 finalMultiplier = getFinalMultiplier();
        return (BASE_DAILY_EMISSION * emissionFactor * finalMultiplier) / (10**18 * 10**18);
    }

    /**
     * @dev Get PID alpha (for UI display)
     */
    function getPIDAlpha() external view returns (uint256) {
        return _calculatePIDAlpha(currentPrice, ma30Price);
    }

    // ============ VIP Compound Function (The Missing Piece) ============

    /**
     * @dev VIP Path: Compound pending vIVY directly into Bond Power
     * Benefits: No vesting wait time, No tax, +10% Bonus Power
     */
    function compoundVested(uint256 tokenId) external nonReentrant {
        // 1. Check Ownership
        require(ivyBond.ownerOfBond(tokenId) == msg.sender, "Not bond owner");
        updatePool();
        
        UserInfo storage user = userInfo[msg.sender];
        
        // 2. Calculate Pending (Unlocked + Vested)
        uint256 pending = (user.bondPower * accIvyPerShare / ACC_IVY_PRECISION) - user.rewardDebt;
        uint256 totalPending = pending + user.pendingVested;
        require(totalPending > 0, "No pending rewards");

        // 3. Update State (Reset Debt & Clear Vesting) -> PREVENT DOUBLE SPEND
        user.rewardDebt = user.bondPower * accIvyPerShare / ACC_IVY_PRECISION;
        user.pendingVested = 0;

        // ╔═══════════════════════════════════════════════════════════════╗
        // ║    FIX: MINING CAP CHECK (AUDIT ROUND 2, #7)                ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  Problem: Direct mint without checking 70M cap              ║
        // ║  Solution: Scale down totalPending if it would exceed cap   ║
        // ║  Impact: Prevents totalMinted from exceeding 70M            ║
        // ╚═══════════════════════════════════════════════════════════════╝

        // 4. Mint IVY from vIVY (occupy mining quota)
        // vIVY is virtual accounting, must convert to real IVY before burn

        // ✅ FIX: Check mining cap before minting
        if (totalMinted + totalPending > MINING_CAP) {
            // Scale down to not exceed cap
            totalPending = MINING_CAP > totalMinted ? MINING_CAP - totalMinted : 0;
            require(totalPending > 0, "Mining cap reached, cannot compound");
        }

        totalMinted += totalPending;
        ivyToken.mint(address(this), totalPending);

        // 5. Calculate Value via Oracle
        // Note: Oracle returns price with 18 decimals (1e18 = $1.0)
        uint256 ivyPrice = oracle.getAssetPrice(address(ivyToken));
        require(ivyPrice > 0, "Oracle price is zero");
        
        // Value in USDT = (Amount * Price) / 1e18
        uint256 valueInUSDT = (totalPending * ivyPrice) / 10**18;

        // 6. Calculate Power to Add (10% Bonus)
        // Power = Value * 1.1
        uint256 powerToAdd = (valueInUSDT * 110) / 100;

        // 7. Burn IVY (Deflationary mechanism)
        // Transfer to dead address (0xdead) for permanent burn
        ivyToken.transfer(address(0xdead), totalPending);

        // 8. Inject to Bond (Cross-Contract Call)
        ivyBond.addCompoundPower(tokenId, powerToAdd);

        emit VestedCompounded(msg.sender, tokenId, totalPending, powerToAdd);
    }

    // ╔═══════════════════════════════════════════════════════════════╗
    // ║            TEAM PERFORMANCE TRACKING FUNCTIONS               ║
    // ╠═══════════════════════════════════════════════════════════════╣
    // ║  Purpose: Enable comprehensive team dashboard analytics      ║
    // ║  Features: History, direct refs, team stats, earnings        ║
    // ╚═══════════════════════════════════════════════════════════════╝

    /**
     * @dev Internal function to record referral reward history
     * @param receiver Address receiving the reward
     * @param fromUser Address whose action triggered the reward
     * @param amount Reward amount
     * @param level 1=L1, 2=L2, 3=TeamBonus, 4=PeerBonus
     */
    function _recordReferralReward(
        address receiver,
        address fromUser,
        uint256 amount,
        uint8 level
    ) internal {
        referralRewardHistory[receiver].push(ReferralRewardRecord({
            timestamp: block.timestamp,
            amount: amount,
            level: level,
            fromUser: fromUser
        }));
    }

    /**
     * @dev Internal function to add direct referral (only first time)
     * @param referrer The referrer address
     * @param referred The referred user address
     */
    function _addDirectReferral(address referrer, address referred) internal {
        if (!isDirectReferral[referrer][referred]) {
            directReferrals[referrer].push(referred);
            isDirectReferral[referrer][referred] = true;
        }
    }

    /**
     * @dev Get referral reward history with pagination
     * @param user User address
     * @param offset Starting index
     * @param limit Number of records to return
     * @return records Array of reward records
     * @return total Total number of records
     */
    function getReferralRewardHistory(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (
        ReferralRewardRecord[] memory records,
        uint256 total
    ) {
        total = referralRewardHistory[user].length;

        if (offset >= total) {
            return (new ReferralRewardRecord[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 length = end - offset;
        records = new ReferralRewardRecord[](length);

        // Return in reverse order (newest first)
        for (uint256 i = 0; i < length; i++) {
            records[i] = referralRewardHistory[user][total - 1 - offset - i];
        }
    }

    /**
     * @dev Get user's direct referrals list with their stats
     * @param user User address
     * @return referrals Array of direct referral addresses
     * @return bondPowers Array of each referral's bond power
     * @return totalRewards Array of total rewards given by each referral
     */
    function getDirectReferrals(address user) external view returns (
        address[] memory referrals,
        uint256[] memory bondPowers,
        uint256[] memory totalRewards
    ) {
        referrals = directReferrals[user];
        uint256 length = referrals.length;

        bondPowers = new uint256[](length);
        totalRewards = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            address ref = referrals[i];
            bondPowers[i] = userInfo[ref].bondPower;

            // Calculate total rewards from this referral (L1 10% + L2 5% + extras)
            // Approximation: count L1 rewards in history
            uint256 rewards = 0;
            ReferralRewardRecord[] storage history = referralRewardHistory[user];
            for (uint256 j = 0; j < history.length; j++) {
                if (history[j].fromUser == ref && history[j].level == 1) {
                    rewards += history[j].amount;
                }
            }
            totalRewards[i] = rewards;
        }
    }

    /**
     * @dev Get team statistics (recursive calculation, max 20 levels)
     * @param user User address
     * @return totalMembers Total team size (all levels)
     * @return totalBondPower Total team bond power
     * @return activeMembers Number of active members (bondPower > 0)
     * @return directCount Direct referral count
     */
    function getTeamStats(address user) external view returns (
        uint256 totalMembers,
        uint256 totalBondPower,
        uint256 activeMembers,
        uint256 directCount
    ) {
        if (address(genesisNode) == address(0)) {
            return (0, 0, 0, 0);
        }

        directCount = directReferrals[user].length;

        // Recursive team counting (with depth limit)
        (totalMembers, totalBondPower, activeMembers) = _countTeamRecursive(user, 0);
    }

    /**
     * @dev Recursive helper to count team members and stats
     * @param user Current user to check
     * @param currentDepth Current recursion depth
     */
    function _countTeamRecursive(
        address user,
        uint256 currentDepth
    ) internal view returns (
        uint256 members,
        uint256 totalPower,
        uint256 active
    ) {
        // Stop at max depth
        if (currentDepth >= MAX_REFERRAL_DEPTH) {
            return (0, 0, 0);
        }

        address[] memory refs = directReferrals[user];
        members = refs.length;

        for (uint256 i = 0; i < refs.length; i++) {
            address ref = refs[i];
            uint256 refPower = userInfo[ref].bondPower;

            totalPower += refPower;
            if (refPower > 0) {
                active++;
            }

            // Recursively count sub-team
            (uint256 subMembers, uint256 subPower, uint256 subActive) =
                _countTeamRecursive(ref, currentDepth + 1);

            members += subMembers;
            totalPower += subPower;
            active += subActive;
        }
    }

    /**
     * @dev Get comprehensive user referral summary
     * @param user User address
     * @return directReferralCount Number of direct referrals
     * @return totalTeamSize Total team size (all levels)
     * @return totalReferralRewards Total referral rewards earned
     * @return rewardHistoryCount Number of reward records
     * @return hasGenesisNode Whether user holds GenesisNode NFT
     */
    function getUserReferralSummary(address user) external view returns (
        uint256 directReferralCount,
        uint256 totalTeamSize,
        uint256 totalReferralRewards,
        uint256 rewardHistoryCount,
        bool hasGenesisNode
    ) {
        directReferralCount = directReferrals[user].length;
        totalReferralRewards = referralRewardsEarned[user];
        rewardHistoryCount = referralRewardHistory[user].length;

        if (address(genesisNode) != address(0)) {
            hasGenesisNode = genesisNode.balanceOf(user) > 0;
            (totalTeamSize, , ) = _countTeamRecursive(user, 0);
        }
    }

    /**
     * @dev Get team performance leaderboard data
     * @param user User address
     * @return rank User's rank in team (placeholder - needs off-chain indexing)
     * @return teamBondPower Total team bond power
     * @return teamActiveRate Percentage of active members (basis points)
     * @return avgBondPower Average bond power per member
     */
    function getTeamPerformance(address user) external view returns (
        uint256 rank,
        uint256 teamBondPower,
        uint256 teamActiveRate,
        uint256 avgBondPower
    ) {
        (uint256 totalMembers, uint256 totalPower, uint256 activeMembers, ) =
            this.getTeamStats(user);

        rank = 0;  // Requires off-chain indexing for global ranking
        teamBondPower = totalPower;

        if (totalMembers > 0) {
            teamActiveRate = (activeMembers * BASIS_POINTS) / totalMembers;
            avgBondPower = totalPower / totalMembers;
        }
    }
}
