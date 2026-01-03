// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IvyToken.sol";
import "./IGenesisNode.sol";
import "./IIvyBond.sol";
import "./IPriceOracle.sol";

/**
 * @title IvyCore
 * @dev Core Mining & Reward Distribution Contract for Ivy Protocol
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                    DUAL-TRACK ARCHITECTURE                    ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Track 1: GenesisNode (Identity) - NFT holding boosts         ║
 * ║  Track 2: IvyBond (Investment) - Deposit-based bond power     ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                 REFERRAL REWARD STRUCTURE                     ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  L1 (Direct):     10% of mining output                        ║
 * ║  L2 (Indirect):   5% of mining output                         ║
 * ║  L3+ (Infinite):  2% differential (first qualified upline)    ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  IMPORTANT: Rewards come from Mining Pool, NOT user principal ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
contract IvyCore is Ownable, ReentrancyGuard {
    
    // ============ Interfaces ============

    // ============ State Variables ============
    
    IGenesisNode public genesisNode;
    IIvyBond public ivyBond;
    IvyToken public ivyToken;
    IPriceOracle public priceOracle;
    
    // ============ Constants ============
    
    /// @notice Referral reward rates in basis points
    uint256 public constant L1_RATE = 1000;          // 10%
    uint256 public constant L2_RATE = 500;           // 5%
    uint256 public constant INFINITE_RATE = 200;     // 2%
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Maximum referral depth for gas protection
    uint256 public constant MAX_REFERRAL_DEPTH = 20;
    
    /// @notice Base daily emission rate
    uint256 public constant BASE_DAILY_EMISSION = 30_000 * 10**18;
    
    /// @notice Hard cap for total IVY supply
    uint256 public constant HARD_CAP = 100_000_000 * 10**18;
    
    /// @notice Halving threshold
    uint256 public constant HALVING_THRESHOLD = 7_000_000 * 10**18;
    uint256 public constant HALVING_DECAY = 95;  // 95% of previous rate
    
    /// @notice Claim cooldown period
    uint256 public constant CLAIM_COOLDOWN = 24 hours;

    // ============ State Variables (continued) ============
    
    /// @notice Current emission factor (decreases with halving)
    uint256 public emissionFactor = 10**18;  // 1.0 in 18 decimals
    
    /// @notice Total IVY minted
    uint256 public totalMinted;
    
    /// @notice Last halving checkpoint
    uint256 public lastHalvingMinted;
    
    /// @notice User claim tracking
    mapping(address => uint256) public lastClaimTime;
    mapping(address => uint256) public totalClaimed;
    
    /// @notice Referral rewards tracking
    mapping(address => uint256) public referralRewardsEarned;

    // ============ Events ============
    
    event RewardsClaimed(
        address indexed user,
        uint256 baseReward,
        uint256 boostedReward,
        uint256 timestamp
    );
    event ReferralRewardPaid(
        address indexed referrer,
        address indexed from,
        uint256 amount,
        uint256 level
    );
    event HalvingOccurred(uint256 newEmissionFactor, uint256 totalMinted);

    // ============ Constructor ============
    
    constructor(address _ivyToken) Ownable(msg.sender) {
        ivyToken = IvyToken(_ivyToken);
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

    // ============ Core Mining Functions ============

    /**
     * @dev Calculate user's daily mining reward
     * 
     * Formula: baseEmission * bondPower * (1 + totalBoost) * emissionFactor
     * 
     * Boost Components:
     * - selfBoost: +10% if user holds Genesis Node NFT
     * - teamAura: +2% if user's referrer holds Genesis Node NFT
     * 
     * @param user User address
     * @return Calculated reward amount
     */
    function calculateDailyReward(address user) public view returns (uint256) {
        // Must have a bond to earn rewards
        if (address(ivyBond) == address(0) || !ivyBond.hasBond(user)) {
            return 0;
        }
        
        // Get bond power (determines base share)
        uint256 bondPower = ivyBond.getBondPower(user);
        if (bondPower == 0) return 0;
        
        // Get boost from GenesisNode (selfBoost + teamAura)
        uint256 totalBoost = 0;
        if (address(genesisNode) != address(0)) {
            totalBoost = genesisNode.getTotalBoost(user);
        }
        
        // Calculate base reward (simplified: bondPower / 1000 * baseEmission)
        // In production, this would be based on share of total bond power
        uint256 baseReward = (bondPower * BASE_DAILY_EMISSION) / (1000 * 10**18);
        
        // Apply boost multiplier (BASIS_POINTS + boost)
        uint256 boostedReward = (baseReward * (BASIS_POINTS + totalBoost)) / BASIS_POINTS;
        
        // Apply emission factor (halving)
        uint256 finalReward = (boostedReward * emissionFactor) / 10**18;
        
        return finalReward;
    }

    /**
     * @dev Claim daily mining rewards
     * 
     * Flow:
     * 1. Calculate user's reward
     * 2. Mint IVY to user
     * 3. Distribute referral rewards from Mining Pool
     * 4. Check and apply halving if needed
     */
    function claimRewards() external nonReentrant {
        address user = msg.sender;
        
        require(
            block.timestamp >= lastClaimTime[user] + CLAIM_COOLDOWN,
            "Claim cooldown not elapsed"
        );
        
        uint256 reward = calculateDailyReward(user);
        require(reward > 0, "No rewards to claim");
        require(totalMinted + reward <= HARD_CAP, "Hard cap reached");
        
        // Update claim time
        lastClaimTime[user] = block.timestamp;
        
        // Mint reward to user
        ivyToken.mint(user, reward);
        totalMinted += reward;
        totalClaimed[user] += reward;
        
        emit RewardsClaimed(user, reward, reward, block.timestamp);
        
        // Distribute referral rewards (from Mining Pool, NOT from user's reward)
        _distributeReferralRewards(user, reward);
        
        // Check halving
        _checkHalving();
    }

    /**
     * @dev Distribute referral rewards based on mining output
     * 
     * ┌─────────────────────────────────────────────────────────┐
     * │              REFERRAL REWARD DISTRIBUTION               │
     * ├─────────────────────────────────────────────────────────┤
     * │  When User claims 1000 IVY:                             │
     * │  ├── L1 Referrer gets: 100 IVY (10%) - NEW MINT        │
     * │  ├── L2 Referrer gets: 50 IVY (5%) - NEW MINT          │
     * │  └── L3+ First qualified: 20 IVY (2%) - NEW MINT       │
     * │                                                         │
     * │  IMPORTANT: These are ADDITIONAL mints from Mining Pool │
     * │             User still receives full 1000 IVY           │
     * └─────────────────────────────────────────────────────────┘
     * 
     * @param user User who triggered the reward
     * @param miningOutput Amount of IVY the user mined
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
        
        // L3+ Infinite Differential (2%) - First qualified upline with NFT
        address cursor = genesisNode.getReferrer(l2);
        uint256 depth = 0;
        
        while (cursor != address(0) && depth < MAX_REFERRAL_DEPTH) {
            // Check if this upline holds a Genesis Node
            if (genesisNode.balanceOf(cursor) > 0) {
                uint256 infiniteReward = (miningOutput * INFINITE_RATE) / BASIS_POINTS;
                if (infiniteReward > 0 && totalMinted + infiniteReward <= HARD_CAP) {
                    ivyToken.mint(cursor, infiniteReward);
                    totalMinted += infiniteReward;
                    referralRewardsEarned[cursor] += infiniteReward;
                    emit ReferralRewardPaid(cursor, user, infiniteReward, 3);
                }
                break;  // Only first qualified upline gets infinite reward
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
     * @dev Check if user can claim rewards
     * @param user User address
     * @return canClaim True if can claim
     * @return timeRemaining Seconds until next claim (0 if can claim)
     */
    function canClaim(address user) external view returns (bool, uint256) {
        uint256 nextClaimTime = lastClaimTime[user] + CLAIM_COOLDOWN;
        if (block.timestamp >= nextClaimTime) {
            return (true, 0);
        }
        return (false, nextClaimTime - block.timestamp);
    }

    /**
     * @dev Get user's mining stats
     * @param user User address
     */
    function getUserMiningStats(address user) external view returns (
        uint256 pendingReward,
        uint256 totalClaimedAmount,
        uint256 referralEarnings,
        uint256 lastClaim,
        uint256 bondPower,
        uint256 totalBoost
    ) {
        pendingReward = calculateDailyReward(user);
        totalClaimedAmount = totalClaimed[user];
        referralEarnings = referralRewardsEarned[user];
        lastClaim = lastClaimTime[user];
        
        if (address(ivyBond) != address(0)) {
            bondPower = ivyBond.getBondPower(user);
        }
        
        if (address(genesisNode) != address(0)) {
            totalBoost = genesisNode.getTotalBoost(user);
        }
    }

    /**
     * @dev Get protocol stats
     */
    function getProtocolStats() external view returns (
        uint256 _totalMinted,
        uint256 _hardCap,
        uint256 _emissionFactor,
        uint256 _nextHalvingAt
    ) {
        return (
            totalMinted,
            HARD_CAP,
            emissionFactor,
            lastHalvingMinted + HALVING_THRESHOLD
        );
    }
}
