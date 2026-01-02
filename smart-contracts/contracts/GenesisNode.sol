// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IGenesisNode.sol";

/**
 * @title GenesisNode
 * @dev ERC721 NFT contract with Pay-to-Mint functionality and 50/40/10 fund distribution.
 * 
 * Fund Split Logic:
 * - 50% → LiquidityWallet (for DEX liquidity)
 * - 40% → DividendPool (for staking rewards, can be IvyCore)
 * - 10% → DevWallet (for development & operations)
 */
contract GenesisNode is ERC721Enumerable, Ownable, ReentrancyGuard, IGenesisNode {
    using SafeERC20 for IERC20;
    
    // ============ Structs ============
    struct UserInfo {
        address referrer;
        uint256 totalRewards;
        uint256 totalMinted;
    }
    
    // ============ State Variables ============
    mapping(address => UserInfo) public users;
    
    // Payment Token (USDT)
    IERC20 public paymentToken;
    
    // Node Price: 100 USDT (with 18 decimals)
    uint256 public constant NODE_PRICE = 100 * 10**18;
    
    // Fund Distribution Wallets
    address public liquidityWallet;   // 50%
    address public dividendPool;      // 40% (IvyCore address)
    address public devWallet;         // 10%
    
    // Distribution Rates (basis points, 10000 = 100%)
    uint256 public constant LIQUIDITY_RATE = 5000;  // 50%
    uint256 public constant DIVIDEND_RATE = 4000;   // 40%
    uint256 public constant DEV_RATE = 1000;        // 10%
    
    // Referral Reward Rates (basis points)
    uint256 public constant L1_RATE = 1000;         // 10%
    uint256 public constant L2_RATE = 500;          // 5%
    uint256 public constant INFINITE_RATE = 200;    // 2%
    uint256 public constant EQUAL_LEVEL_BONUS = 50; // 0.5%
    uint256 public constant MAX_DEPTH = 20;         // Gas Limit Protection

    uint256 private _nextTokenId;
    string private _baseTokenURI;
    
    // Total funds collected
    uint256 public totalFundsCollected;

    // ============ Events ============
    event NodeMinted(address indexed buyer, uint256 indexed tokenId, address referrer, uint256 price);
    event FundsDistributed(uint256 toLiquidity, uint256 toDividend, uint256 toDev);
    event PaymentTokenUpdated(address indexed oldToken, address indexed newToken);
    event WalletsUpdated(address liquidity, address dividend, address dev);
    event ReferralRewardPaid(address indexed referrer, address indexed buyer, uint256 amount, uint256 level);

    // ============ Constructor ============
    constructor(
        address _liquidityWallet,
        address _dividendPool,
        address _devWallet
    ) ERC721("Ivy Genesis Node", "IVY-NODE") Ownable(msg.sender) {
        require(_liquidityWallet != address(0), "Invalid liquidity wallet");
        require(_dividendPool != address(0), "Invalid dividend pool");
        require(_devWallet != address(0), "Invalid dev wallet");
        
        liquidityWallet = _liquidityWallet;
        dividendPool = _dividendPool;
        devWallet = _devWallet;
    }

    // ============ Admin Functions ============
    
    /**
     * @dev Set the payment token address (USDT)
     * @param _paymentToken Address of the ERC20 token to accept as payment
     */
    function setPaymentToken(address _paymentToken) external onlyOwner {
        require(_paymentToken != address(0), "Invalid token address");
        address oldToken = address(paymentToken);
        paymentToken = IERC20(_paymentToken);
        emit PaymentTokenUpdated(oldToken, _paymentToken);
    }

    /**
     * @dev Update distribution wallet addresses
     */
    function setWallets(
        address _liquidityWallet,
        address _dividendPool,
        address _devWallet
    ) external onlyOwner {
        require(_liquidityWallet != address(0), "Invalid liquidity wallet");
        require(_dividendPool != address(0), "Invalid dividend pool");
        require(_devWallet != address(0), "Invalid dev wallet");
        
        liquidityWallet = _liquidityWallet;
        dividendPool = _dividendPool;
        devWallet = _devWallet;
        
        emit WalletsUpdated(_liquidityWallet, _dividendPool, _devWallet);
    }

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function setReferrer(address user, address referrer) external onlyOwner {
        users[user].referrer = referrer;
    }

    // ============ Core Functions ============

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Pay-to-Mint: Users pay USDT to mint a Genesis Node NFT
     * @param referrer Address of the referrer (optional, can be address(0))
     * 
     * Flow:
     * 1. Check payment token is set
     * 2. Check user has approved enough USDT
     * 3. Transfer USDT from user to contract
     * 4. Execute 50/40/10 fund split
     * 5. Set referrer relationship (if first time)
     * 6. Mint NFT to user
     */
    function mint(address to, address referrer) external override nonReentrant {
        require(address(paymentToken) != address(0), "Payment token not set");
        require(to != address(0), "Invalid recipient");
        
        // Step 1: Transfer payment from user
        // User must have called paymentToken.approve(thisContract, NODE_PRICE) beforehand
        paymentToken.safeTransferFrom(msg.sender, address(this), NODE_PRICE);
        
        // Step 2: Execute the 50/40/10 Fund Split
        _distributeFunds(NODE_PRICE);
        
        // Step 3: Set referrer relationship (only if not already set)
        if (users[to].referrer == address(0) && referrer != address(0) && referrer != to) {
            users[to].referrer = referrer;
        }
        
        // Step 4: Mint NFT
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        
        // Update stats
        users[to].totalMinted++;
        totalFundsCollected += NODE_PRICE;
        
        emit NodeMinted(to, tokenId, referrer, NODE_PRICE);
    }

    /**
     * @dev Internal function to distribute funds according to 50/40/10 split
     * @param amount Total amount to distribute
     * 
     * ┌─────────────────────────────────────────────────────────┐
     * │                    FUND DISTRIBUTION                    │
     * ├─────────────────────────────────────────────────────────┤
     * │  50% → LiquidityWallet  (DEX Liquidity Pool)           │
     * │  40% → DividendPool     (Staking Rewards / IvyCore)    │
     * │  10% → DevWallet        (Development & Operations)     │
     * └─────────────────────────────────────────────────────────┘
     */
    function _distributeFunds(uint256 amount) internal {
        // Calculate split amounts
        uint256 toLiquidity = (amount * LIQUIDITY_RATE) / 10000;  // 50%
        uint256 toDividend = (amount * DIVIDEND_RATE) / 10000;    // 40%
        uint256 toDev = (amount * DEV_RATE) / 10000;              // 10%
        
        // Transfer to respective wallets
        paymentToken.safeTransfer(liquidityWallet, toLiquidity);
        paymentToken.safeTransfer(dividendPool, toDividend);
        paymentToken.safeTransfer(devWallet, toDev);
        
        emit FundsDistributed(toLiquidity, toDividend, toDev);
    }

    /**
     * @dev Distribute IVY token rewards to referral network
     * Called by IvyCore when user claims daily rewards
     * @param minter Address of the user who triggered the reward
     * @param mintAmount Amount of IVY tokens being distributed
     */
    function distributeRewards(address minter, uint256 mintAmount) external override {
        address current = users[minter].referrer;
        if (current == address(0)) return;

        // --- L1 Distribution (10%) ---
        uint256 l1Reward = (mintAmount * L1_RATE) / 10000;
        _safeTransferReward(current, l1Reward);
        emit ReferralRewardPaid(current, minter, l1Reward, 1);
        
        address l2 = users[current].referrer;
        if (l2 == address(0)) return;

        // --- L2 Distribution (5%) ---
        uint256 l2Reward = (mintAmount * L2_RATE) / 10000;
        _safeTransferReward(l2, l2Reward);
        emit ReferralRewardPaid(l2, minter, l2Reward, 2);

        // --- L3~Infinite Distribution (2% Differential) ---
        address cursor = users[l2].referrer;
        bool infiniteRewardClaimed = false;
        uint256 depth = 0;

        while (cursor != address(0) && !infiniteRewardClaimed && depth < MAX_DEPTH) {
            if (balanceOf(cursor) > 0) {
                uint256 infiniteReward = (mintAmount * INFINITE_RATE) / 10000;
                _safeTransferReward(cursor, infiniteReward);
                emit ReferralRewardPaid(cursor, minter, infiniteReward, 3);
                infiniteRewardClaimed = true;
                
                // Equal level bonus
                address potentialBlockedUpline = users[cursor].referrer;
                if (potentialBlockedUpline != address(0) && balanceOf(potentialBlockedUpline) > 0) {
                    uint256 equalBonus = (mintAmount * EQUAL_LEVEL_BONUS) / 10000;
                    _safeTransferReward(potentialBlockedUpline, equalBonus);
                    emit ReferralRewardPaid(potentialBlockedUpline, minter, equalBonus, 4);
                }
            }
            cursor = users[cursor].referrer;
            depth++;
        }

        // If no one claimed the infinite reward, it goes to dividend pool
        if (!infiniteRewardClaimed) {
            uint256 unclaimedReward = (mintAmount * INFINITE_RATE) / 10000;
            _safeTransferReward(dividendPool, unclaimedReward);
        }
    }

    /**
     * @dev Get self boost multiplier for a user
     * Users holding at least 1 NFT get +10% boost
     */
    function getSelfBoost(address user) external view override returns (uint256) {
        return balanceOf(user) > 0 ? 1e17 : 0; // +10% if holds NFT
    }

    /**
     * @dev Internal function to record reward distribution
     * In production, this would mint IVY tokens or transfer from a pool
     */
    function _safeTransferReward(address to, uint256 amount) internal {
        users[to].totalRewards += amount;
    }

    // ============ View Functions ============

    /**
     * @dev Get user info including referrer and total rewards
     */
    function getUserInfo(address user) external view returns (
        address referrer,
        uint256 totalRewards,
        uint256 totalMinted,
        uint256 nftBalance
    ) {
        UserInfo memory info = users[user];
        return (
            info.referrer,
            info.totalRewards,
            info.totalMinted,
            balanceOf(user)
        );
    }

    /**
     * @dev Get current distribution wallet addresses
     */
    function getDistributionWallets() external view returns (
        address _liquidityWallet,
        address _dividendPool,
        address _devWallet
    ) {
        return (liquidityWallet, dividendPool, devWallet);
    }

    /**
     * @dev Check if user has approved enough tokens for minting
     */
    function hasApprovedMint(address user) external view returns (bool) {
        if (address(paymentToken) == address(0)) return false;
        return paymentToken.allowance(user, address(this)) >= NODE_PRICE;
    }
}
