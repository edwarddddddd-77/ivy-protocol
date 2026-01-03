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
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                 REFERRAL REWARD STRUCTURE                     ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  L1 (Direct):     10% of mining output                        ║
 * ║  L2 (Indirect):   5% of mining output                         ║
 * ║  L3+ (Infinite):  2% differential (first qualified upline)    ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
contract IvyCore is Ownable, ReentrancyGuard {
    
    // ============ Interfaces ============
    
    IGenesisNode public genesisNode;
    IIvyBond public ivyBond;
    IvyToken public ivyToken;
    
    // ============ Constants ============
    
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
    
    /// @notice PID multiplier for dynamic emission control
    uint256 public pidMultiplier = 10**18;  // 1.0x default

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
    event PidMultiplierUpdated(uint256 newMultiplier);

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
    
    function setPidMultiplier(uint256 _multiplier) external onlyOwner {
        require(_multiplier >= 5 * 10**17 && _multiplier <= 2 * 10**18, "Invalid multiplier");
        pidMultiplier = _multiplier;
        emit PidMultiplierUpdated(_multiplier);
    }

    // ============ Core Mining Functions (Reward Per Second) ============

    /**
     * @dev Update pool's accumulated rewards
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              UPDATE POOL - REWARD PER SECOND                  ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Called on every: deposit, withdraw, claim, sync              ║
     * ║                                                               ║
     * ║  Formula:                                                     ║
     * ║  timeElapsed = block.timestamp - lastRewardTime               ║
     * ║  ivyReward = timeElapsed * EMISSION_PER_SECOND * factors      ║
     * ║  accIvyPerShare += ivyReward * ACC_IVY_PRECISION / totalPower ║
     * ╚═══════════════════════════════════════════════════════════════╝
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
        
        // Calculate IVY reward for this period
        // ivyReward = timeElapsed * EMISSION_PER_SECOND * emissionFactor * pidMultiplier
        uint256 ivyReward = (timeElapsed * EMISSION_PER_SECOND * emissionFactor * pidMultiplier) / (10**18 * 10**18);
        
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
     * Must be called when user's bond power changes (deposit/withdraw)
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
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              PENDING IVY CALCULATION                          ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  pending = (userBondPower * accIvyPerShare) - rewardDebt      ║
     * ║          + pendingVested (from previous syncs)                ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function pendingIvy(address user) public view returns (uint256) {
        UserInfo storage info = userInfo[user];
        
        uint256 _accIvyPerShare = accIvyPerShare;
        
        if (block.timestamp > lastRewardTime && totalPoolBondPower > 0) {
            uint256 timeElapsed = block.timestamp - lastRewardTime;
            uint256 ivyReward = (timeElapsed * EMISSION_PER_SECOND * emissionFactor * pidMultiplier) / (10**18 * 10**18);
            
            if (totalMinted + ivyReward > HARD_CAP) {
                ivyReward = HARD_CAP - totalMinted;
            }
            
            _accIvyPerShare += (ivyReward * ACC_IVY_PRECISION) / totalPoolBondPower;
        }
        
        uint256 pending = (info.bondPower * _accIvyPerShare / ACC_IVY_PRECISION) - info.rewardDebt;
        return pending + info.pendingVested;
    }

    /**
     * @dev Harvest pending rewards into vesting
     * Rewards go into 30-day linear vesting, NOT directly to wallet
     */
    function harvest() external nonReentrant {
        address user = msg.sender;
        _syncUser(user);
        
        UserInfo storage info = userInfo[user];
        uint256 pending = info.pendingVested;
        
        require(pending > 0, "No rewards to harvest");
        require(totalMinted + pending <= HARD_CAP, "Hard cap reached");
        
        // Start vesting
        info.totalVested += pending;
        info.vestingStartTime = block.timestamp;
        info.pendingVested = 0;
        
        // Mint to this contract (held for vesting)
        ivyToken.mint(address(this), pending);
        totalMinted += pending;
        
        emit VestingStarted(user, pending, block.timestamp);
        emit RewardsHarvested(user, pending);
        
        // Distribute referral rewards
        _distributeReferralRewards(user, pending);
        
        // Check halving
        _checkHalving();
    }

    /**
     * @dev Claim vested IVY (30-day linear release)
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              30-DAY LINEAR VESTING                            ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  claimable = totalVested * min(timeElapsed, 30 days) / 30days ║
     * ║            - alreadyClaimed                                   ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function claimVested() external nonReentrant {
        address user = msg.sender;
        UserInfo storage info = userInfo[user];
        
        require(info.totalVested > 0, "No vested rewards");
        
        uint256 timeElapsed = block.timestamp - info.vestingStartTime;
        uint256 vestedAmount;
        
        if (timeElapsed >= VESTING_PERIOD) {
            // Fully vested
            vestedAmount = info.totalVested;
        } else {
            // Linearly vested
            vestedAmount = (info.totalVested * timeElapsed) / VESTING_PERIOD;
        }
        
        uint256 claimable = vestedAmount - info.totalClaimed;
        require(claimable > 0, "No claimable rewards");
        
        info.totalClaimed += claimable;
        
        // Transfer from contract to user
        ivyToken.transfer(user, claimable);
        
        emit VestingClaimed(user, claimable);
    }

    /**
     * @dev Instant cash out - get IVY immediately but 50% is burned
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              INSTANT CASH (50% BURN)                          ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  User receives: 50% of remaining vested amount               ║
     * ║  Burned: 50% of remaining vested amount                       ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function instantCashOut() external nonReentrant {
        address user = msg.sender;
        UserInfo storage info = userInfo[user];
        
        uint256 remaining = info.totalVested - info.totalClaimed;
        require(remaining > 0, "No vested rewards to cash out");
        
        uint256 penalty = (remaining * INSTANT_CASH_PENALTY) / BASIS_POINTS;
        uint256 received = remaining - penalty;
        
        // Clear vesting
        info.totalClaimed = info.totalVested;
        
        // Transfer to user
        ivyToken.transfer(user, received);
        
        // Burn penalty (transfer to dead address)
        ivyToken.transfer(address(0xdead), penalty);
        
        emit InstantCashOut(user, received, penalty);
    }

    /**
     * @dev Distribute referral rewards based on mining output
     */
    function _distributeReferralRewards(address user, uint256 miningOutput) internal {
        if (address(genesisNode) == address(0)) return;
        
        address l1 = genesisNode.getReferrer(user);
        if (l1 == address(0)) return;
        
        // L1 Reward (10%)
        uint256 l1Reward = (miningOutput * L1_RATE) / BASIS_POINTS;
        if (l1Reward > 0 && totalMinted + l1Reward <= HARD_CAP) {
            ivyToken.mint(l1, l1Reward);
            totalMinted += l1Reward;
            referralRewardsEarned[l1] += l1Reward;
            emit ReferralRewardPaid(l1, user, l1Reward, 1);
        }
        
        // L2 Reward (5%)
        address l2 = genesisNode.getReferrer(l1);
        if (l2 == address(0)) return;
        
        uint256 l2Reward = (miningOutput * L2_RATE) / BASIS_POINTS;
        if (l2Reward > 0 && totalMinted + l2Reward <= HARD_CAP) {
            ivyToken.mint(l2, l2Reward);
            totalMinted += l2Reward;
            referralRewardsEarned[l2] += l2Reward;
            emit ReferralRewardPaid(l2, user, l2Reward, 2);
        }
        
        // L3+ Infinite Differential (2%)
        address cursor = genesisNode.getReferrer(l2);
        uint256 depth = 0;
        
        while (cursor != address(0) && depth < MAX_REFERRAL_DEPTH) {
            if (genesisNode.balanceOf(cursor) > 0) {
                uint256 infiniteReward = (miningOutput * INFINITE_RATE) / BASIS_POINTS;
                if (infiniteReward > 0 && totalMinted + infiniteReward <= HARD_CAP) {
                    ivyToken.mint(cursor, infiniteReward);
                    totalMinted += infiniteReward;
                    referralRewardsEarned[cursor] += infiniteReward;
                    emit ReferralRewardPaid(cursor, user, infiniteReward, 3);
                }
                break;
            }
            cursor = genesisNode.getReferrer(cursor);
            depth++;
        }
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

    // ============ View Functions ============

    /**
     * @dev Get current daily emission rate (for dashboard)
     */
    function currentDailyEmission() external view returns (uint256) {
        return (BASE_DAILY_EMISSION * emissionFactor * pidMultiplier) / (10**18 * 10**18);
    }

    /**
     * @dev Get user's mining stats
     */
    function getUserMiningStats(address user) external view returns (
        uint256 _pendingReward,
        uint256 _totalClaimed,
        uint256 _referralEarnings,
        uint256 _vestedAmount,
        uint256 _claimableVested,
        uint256 _bondPower
    ) {
        UserInfo storage info = userInfo[user];
        
        _pendingReward = pendingIvy(user);
        _totalClaimed = info.totalClaimed;
        _referralEarnings = referralRewardsEarned[user];
        _vestedAmount = info.totalVested;
        
        // Calculate claimable vested
        if (info.totalVested > 0 && info.vestingStartTime > 0) {
            uint256 timeElapsed = block.timestamp - info.vestingStartTime;
            uint256 vestedSoFar;
            if (timeElapsed >= VESTING_PERIOD) {
                vestedSoFar = info.totalVested;
            } else {
                vestedSoFar = (info.totalVested * timeElapsed) / VESTING_PERIOD;
            }
            _claimableVested = vestedSoFar > info.totalClaimed ? vestedSoFar - info.totalClaimed : 0;
        }
        
        _bondPower = info.bondPower;
    }

    /**
     * @dev Get protocol stats (for dashboard)
     */
    function getProtocolStats() external view returns (
        uint256 _totalMinted,
        uint256 _hardCap,
        uint256 _emissionFactor,
        uint256 _pidMultiplier,
        uint256 _totalPoolBondPower,
        uint256 _emissionPerSecond
    ) {
        return (
            totalMinted,
            HARD_CAP,
            emissionFactor,
            pidMultiplier,
            totalPoolBondPower,
            EMISSION_PER_SECOND
        );
    }

    /**
     * @dev Get vesting info for user
     */
    function getVestingInfo(address user) external view returns (
        uint256 totalVested,
        uint256 totalClaimed,
        uint256 claimable,
        uint256 vestingStartTime,
        uint256 vestingEndTime,
        uint256 percentVested
    ) {
        UserInfo storage info = userInfo[user];
        
        totalVested = info.totalVested;
        totalClaimed = info.totalClaimed;
        vestingStartTime = info.vestingStartTime;
        vestingEndTime = info.vestingStartTime + VESTING_PERIOD;
        
        if (info.totalVested > 0 && info.vestingStartTime > 0) {
            uint256 timeElapsed = block.timestamp - info.vestingStartTime;
            uint256 vestedSoFar;
            
            if (timeElapsed >= VESTING_PERIOD) {
                vestedSoFar = info.totalVested;
                percentVested = 10000;  // 100%
            } else {
                vestedSoFar = (info.totalVested * timeElapsed) / VESTING_PERIOD;
                percentVested = (timeElapsed * 10000) / VESTING_PERIOD;
            }
            
            claimable = vestedSoFar > info.totalClaimed ? vestedSoFar - info.totalClaimed : 0;
        }
    }
}
