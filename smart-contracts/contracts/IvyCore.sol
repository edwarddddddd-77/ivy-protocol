// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IvyToken.sol";
import "./IGenesisNode.sol";
import "./IIvyBond.sol";

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
    
    // ============ Basic Constants ============
    
    /// @notice Referral reward rates in basis points
    uint256 public constant L1_RATE = 1000;          // 10%
    uint256 public constant L2_RATE = 500;           // 5%
    uint256 public constant INFINITE_RATE = 200;     // 2%
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Maximum referral depth for gas protection
    uint256 public constant MAX_REFERRAL_DEPTH = 20;
    
    /// @notice Base daily emission rate: 30,000 IVY per day
    uint256 public constant BASE_DAILY_EMISSION = 30_000 * 10**18;
    
    /// @notice Emission rate per second: 30,000 / 86400 ≈ 0.3472 IVY/sec
    uint256 public constant EMISSION_PER_SECOND = BASE_DAILY_EMISSION / 86400;
    
    /// @notice Hard cap for total IVY supply
    uint256 public constant HARD_CAP = 100_000_000 * 10**18;
    
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
    
    /// @notice Current IVY price (set by oracle/keeper)
    uint256 public currentPrice = 10**18;  // Default $1.00
    
    /// @notice 30-day moving average price
    uint256 public ma30Price = 10**18;  // Default $1.00
    
    /// @notice Price 1 hour ago (for breaker calculation)
    uint256 public price1hAgo = 10**18;

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

    // ============ Events ============
    
    event PoolUpdated(uint256 accIvyPerShare, uint256 lastRewardTime, uint256 totalPoolBondPower);
    event UserSynced(address indexed user, uint256 bondPower, uint256 rewardDebt);
    event RewardsHarvested(address indexed user, uint256 amount);
    event VestingStarted(address indexed user, uint256 amount, uint256 startTime);
    event VestingClaimed(address indexed user, uint256 amount);
    event InstantCashOut(address indexed user, uint256 received, uint256 burned);
    event ReferralRewardPaid(address indexed referrer, address indexed from, uint256 amount, uint256 level);
    event HalvingOccurred(uint256 newEmissionFactor, uint256 totalMinted);
    event CircuitBreakerTriggered(BreakerLevel level, uint256 activationTime, uint256 activationPrice);
    event CircuitBreakerReset(BreakerLevel previousLevel);
    event PriceUpdated(uint256 currentPrice, uint256 ma30Price, uint256 price1hAgo);

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
    
    /**
     * @dev Update price data (called by oracle/keeper)
     */
    function updatePrices(uint256 _currentPrice, uint256 _ma30Price, uint256 _price1hAgo) external onlyOwner {
        require(_currentPrice > 0 && _ma30Price > 0 && _price1hAgo > 0, "Invalid prices");
        currentPrice = _currentPrice;
        ma30Price = _ma30Price;
        price1hAgo = _price1hAgo;
        emit PriceUpdated(_currentPrice, _ma30Price, _price1hAgo);
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
        
        // Check hard cap
        if (totalMinted + ivyReward > HARD_CAP) {
            ivyReward = HARD_CAP - totalMinted;
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
        
        // Distribute referral rewards
        _distributeReferralRewards(user, pending);
        
        emit RewardsHarvested(user, pending);
        emit VestingStarted(user, pending, block.timestamp);
    }

    /**
     * @dev Claim vested IVY (30-day linear release)
     */
    function claimVested() external nonReentrant {
        address user = msg.sender;
        UserInfo storage info = userInfo[user];
        
        require(info.totalVested > 0, "Nothing vested");
        require(info.vestingStartTime > 0, "Vesting not started");
        
        uint256 timeElapsed = block.timestamp - info.vestingStartTime;
        uint256 vestedAmount;
        
        if (timeElapsed >= VESTING_PERIOD) {
            vestedAmount = info.totalVested;
        } else {
            vestedAmount = (info.totalVested * timeElapsed) / VESTING_PERIOD;
        }
        
        uint256 claimable = vestedAmount - info.totalClaimed;
        require(claimable > 0, "Nothing to claim");
        
        info.totalClaimed += claimable;
        
        ivyToken.transfer(user, claimable);
        
        emit VestingClaimed(user, claimable);
    }

    /**
     * @dev Instant cash out - get IVY immediately but 50% is burned
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
        
        // Burn penalty (transfer to dead address)
        ivyToken.transfer(address(0xdead), penalty);
        
        emit InstantCashOut(user, received, penalty);
    }

    /**
     * @dev Check and apply halving if threshold reached
     */
    function _checkHalving() internal {
        if (totalMinted - lastHalvingMinted >= HALVING_THRESHOLD) {
            emissionFactor = (emissionFactor * HALVING_DECAY) / 100;
            lastHalvingMinted = totalMinted;
            emit HalvingOccurred(emissionFactor, totalMinted);
        }
    }

    /**
     * @dev Distribute referral rewards
     */
    function _distributeReferralRewards(address user, uint256 amount) internal {
        if (address(genesisNode) == address(0)) return;
        
        address currentReferrer = genesisNode.getReferrer(user);
        uint256 depth = 0;
        
        while (currentReferrer != address(0) && depth < MAX_REFERRAL_DEPTH) {
            uint256 rewardRate;
            
            if (depth == 0) {
                rewardRate = L1_RATE;  // 10%
            } else if (depth == 1) {
                rewardRate = L2_RATE;  // 5%
            } else {
                // L3+ only for qualified (node holders)
                if (genesisNode.balanceOf(currentReferrer) > 0) {
                    rewardRate = INFINITE_RATE;  // 2%
                } else {
                    currentReferrer = genesisNode.getReferrer(currentReferrer);
                    depth++;
                    continue;
                }
            }
            
            uint256 reward = (amount * rewardRate) / BASIS_POINTS;
            if (reward > 0) {
                totalMinted += reward;
                ivyToken.mint(currentReferrer, reward);
                referralRewardsEarned[currentReferrer] += reward;
                emit ReferralRewardPaid(currentReferrer, user, reward, depth + 1);
            }
            
            currentReferrer = genesisNode.getReferrer(currentReferrer);
            depth++;
        }
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
        
        if (info.vestingStartTime > 0 && info.totalVested > 0) {
            uint256 timeElapsed = block.timestamp - info.vestingStartTime;
            uint256 vestedAmount;
            if (timeElapsed >= VESTING_PERIOD) {
                vestedAmount = info.totalVested;
            } else {
                vestedAmount = (info.totalVested * timeElapsed) / VESTING_PERIOD;
            }
            claimableNow = vestedAmount > info.totalClaimed ? vestedAmount - info.totalClaimed : 0;
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
        uint256 _hardCap,
        uint256 _emissionFactor,
        uint256 _finalMultiplier,
        uint256 _totalPoolBondPower,
        uint256 _emissionPerSecond,
        uint256 _currentDailyEmission
    ) {
        _totalMinted = totalMinted;
        _hardCap = HARD_CAP;
        _emissionFactor = emissionFactor;
        _finalMultiplier = getFinalMultiplier();
        _totalPoolBondPower = totalPoolBondPower;
        _emissionPerSecond = EMISSION_PER_SECOND;
        _currentDailyEmission = (BASE_DAILY_EMISSION * emissionFactor * _finalMultiplier) / (10**18 * 10**18);
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
}
