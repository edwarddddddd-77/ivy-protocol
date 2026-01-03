// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Interface for GenesisNode referral binding
interface IGenesisNodeReferral {
    function bindReferrerFromBond(address user, address referrer) external;
    function referrers(address user) external view returns (address);
}

/**
 * @title IvyBond
 * @dev Investment Layer of Ivy Protocol - Handles deposits with 50/40/10 fund split
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                    FUND DISTRIBUTION                          ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  50% → LiquidityPool   (DEX Liquidity)                        ║
 * ║  40% → RWAWallet       (Real World Assets)                    ║
 * ║  10% → ReservePool     (Protocol Reserve)                     ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * IMPORTANT: Referral rewards come from Mining Pool (IvyCore),
 *            NOT deducted from user principal!
 */
contract IvyBond is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Constants ============
    
    /// @notice Distribution rates in basis points (10000 = 100%)
    uint256 public constant LIQUIDITY_RATE = 5000;   // 50%
    uint256 public constant RWA_RATE = 4000;         // 40%
    uint256 public constant RESERVE_RATE = 1000;     // 10%
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Minimum deposit amount (10 USDT)
    uint256 public constant MIN_DEPOSIT = 10 * 10**18;

    // ============ State Variables ============
    
    /// @notice Payment token (USDT)
    IERC20 public paymentToken;
    
    /// @notice Distribution wallets
    address public liquidityPool;    // 50%
    address public rwaWallet;        // 40%
    address public reservePool;      // 10%
    
    /// @notice IvyCore contract address (for reward calculations)
    address public ivyCore;
    
    /// @notice GenesisNode contract address (for referral binding)
    address public genesisNode;
    
    /// @notice User deposit info
    struct BondInfo {
        uint256 totalDeposited;      // Total USDT deposited
        uint256 depositTime;         // Last deposit timestamp
        uint256 bondPower;           // Calculated bond power for mining
    }
    
    mapping(address => BondInfo) public bonds;
    
    /// @notice Global stats
    uint256 public totalDeposits;
    uint256 public totalBondPower;
    uint256 public totalUsers;

    // ============ Events ============
    
    event Deposited(
        address indexed user,
        uint256 amount,
        uint256 toLiquidity,
        uint256 toRWA,
        uint256 toReserve
    );
    event WalletsUpdated(
        address liquidityPool,
        address rwaWallet,
        address reservePool
    );
    event IvyCoreSet(address indexed ivyCore);
    event GenesisNodeSet(address indexed genesisNode);
    event ReferrerBound(address indexed user, address indexed referrer);

    // ============ Constructor ============
    
    /**
     * @dev Initialize the IvyBond contract
     * @param _liquidityPool Address for liquidity pool (50%)
     * @param _rwaWallet Address for RWA wallet (40%)
     * @param _reservePool Address for reserve pool (10%)
     */
    constructor(
        address _liquidityPool,
        address _rwaWallet,
        address _reservePool
    ) Ownable(msg.sender) {
        require(_liquidityPool != address(0), "Invalid liquidity pool");
        require(_rwaWallet != address(0), "Invalid RWA wallet");
        require(_reservePool != address(0), "Invalid reserve pool");
        
        liquidityPool = _liquidityPool;
        rwaWallet = _rwaWallet;
        reservePool = _reservePool;
    }

    // ============ Admin Functions ============
    
    /**
     * @dev Set the payment token address (USDT)
     */
    function setPaymentToken(address _paymentToken) external onlyOwner {
        require(_paymentToken != address(0), "Invalid token");
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @dev Set the IvyCore contract address
     */
    function setIvyCore(address _ivyCore) external onlyOwner {
        require(_ivyCore != address(0), "Invalid IvyCore");
        ivyCore = _ivyCore;
        emit IvyCoreSet(_ivyCore);
    }
    
    /**
     * @dev Set the GenesisNode contract address (for referral binding)
     */
    function setGenesisNode(address _genesisNode) external onlyOwner {
        require(_genesisNode != address(0), "Invalid GenesisNode");
        genesisNode = _genesisNode;
        emit GenesisNodeSet(_genesisNode);
    }

    /**
     * @dev Update distribution wallet addresses
     */
    function setWallets(
        address _liquidityPool,
        address _rwaWallet,
        address _reservePool
    ) external onlyOwner {
        require(_liquidityPool != address(0), "Invalid liquidity pool");
        require(_rwaWallet != address(0), "Invalid RWA wallet");
        require(_reservePool != address(0), "Invalid reserve pool");
        
        liquidityPool = _liquidityPool;
        rwaWallet = _rwaWallet;
        reservePool = _reservePool;
        
        emit WalletsUpdated(_liquidityPool, _rwaWallet, _reservePool);
    }

    // ============ Core Functions ============

    /**
     * @dev Deposit USDT to create/increase bond position
     * 
     * ┌─────────────────────────────────────────────────────────┐
     * │                 50/40/10 FUND SPLIT                     │
     * ├─────────────────────────────────────────────────────────┤
     * │  User deposits 1000 USDT:                               │
     * │  ├── 500 USDT (50%) → LiquidityPool                    │
     * │  ├── 400 USDT (40%) → RWAWallet                        │
     * │  └── 100 USDT (10%) → ReservePool                      │
     * └─────────────────────────────────────────────────────────┘
     * 
     * @param amount Amount of USDT to deposit
     * @param referrer Address of the referrer (can be address(0) for no referrer)
     */
    function deposit(uint256 amount, address referrer) external nonReentrant {
        require(address(paymentToken) != address(0), "Payment token not set");
        require(amount >= MIN_DEPOSIT, "Below minimum deposit");
        
        address user = msg.sender;
        
        // Bind referrer if not already bound (CRITICAL: Must happen before any rewards)
        if (genesisNode != address(0) && referrer != address(0) && referrer != user) {
            IGenesisNodeReferral(genesisNode).bindReferrerFromBond(user, referrer);
        }
        
        // Transfer USDT from user
        paymentToken.safeTransferFrom(user, address(this), amount);
        
        // Calculate split amounts
        uint256 toLiquidity = (amount * LIQUIDITY_RATE) / BASIS_POINTS;  // 50%
        uint256 toRWA = (amount * RWA_RATE) / BASIS_POINTS;              // 40%
        uint256 toReserve = (amount * RESERVE_RATE) / BASIS_POINTS;      // 10%
        
        // Execute the 50/40/10 split
        paymentToken.safeTransfer(liquidityPool, toLiquidity);
        paymentToken.safeTransfer(rwaWallet, toRWA);
        paymentToken.safeTransfer(reservePool, toReserve);
        
        // Update user bond info
        if (bonds[user].totalDeposited == 0) {
            totalUsers++;
        }
        
        bonds[user].totalDeposited += amount;
        bonds[user].depositTime = block.timestamp;
        bonds[user].bondPower = _calculateBondPower(bonds[user].totalDeposited);
        
        // Update global stats
        totalDeposits += amount;
        totalBondPower += _calculateBondPower(amount);
        
        emit Deposited(user, amount, toLiquidity, toRWA, toReserve);
    }

    /**
     * @dev Calculate bond power from deposit amount
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              WHITEPAPER COMPLIANCE (P3, P6)                   ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Only Tranche B (50%) of deposit is used for mining power    ║
     * ║  Bond Power = Deposit Amount × 50%                           ║
     * ║                                                               ║
     * ║  Example: User deposits 10,000 USDT                          ║
     * ║  - 5,000 USDT (50%) → Mining Power (Tranche B)               ║
     * ║  - 4,000 USDT (40%) → RWA Assets (Tranche A)                 ║
     * ║  - 1,000 USDT (10%) → Reserve Pool                           ║
     * ╚═══════════════════════════════════════════════════════════════╝
     * 
     * @param depositAmount Amount deposited
     * @return Bond power value (50% of deposit)
     */
    function _calculateBondPower(uint256 depositAmount) internal pure returns (uint256) {
        // Bond Power = Deposit × 50% (Only Tranche B is used for mining)
        return (depositAmount * LIQUIDITY_RATE) / BASIS_POINTS;
    }

    // ============ View Functions ============

    /**
     * @dev Get user's bond information
     * @param user User address
     * @return totalDeposited Total amount deposited
     * @return depositTime Last deposit timestamp
     * @return bondPower User's bond power
     * @return shareOfPool User's share of total pool (in basis points)
     */
    function getBondInfo(address user) external view returns (
        uint256 totalDeposited,
        uint256 depositTime,
        uint256 bondPower,
        uint256 shareOfPool
    ) {
        BondInfo memory bond = bonds[user];
        uint256 share = 0;
        if (totalBondPower > 0) {
            share = (bond.bondPower * BASIS_POINTS) / totalBondPower;
        }
        return (
            bond.totalDeposited,
            bond.depositTime,
            bond.bondPower,
            share
        );
    }

    /**
     * @dev Get user's bond power (for IvyCore integration)
     * @param user User address
     * @return Bond power value
     */
    function getBondPower(address user) external view returns (uint256) {
        return bonds[user].bondPower;
    }

    /**
     * @dev Check if user has an active bond
     * @param user User address
     * @return True if user has deposited
     */
    function hasBond(address user) external view returns (bool) {
        return bonds[user].totalDeposited > 0;
    }

    /**
     * @dev Get contract statistics
     * @return _totalDeposits Total USDT deposited
     * @return _totalBondPower Total bond power
     * @return _totalUsers Total number of users
     */
    function getStats() external view returns (
        uint256 _totalDeposits,
        uint256 _totalBondPower,
        uint256 _totalUsers
    ) {
        return (totalDeposits, totalBondPower, totalUsers);
    }

    /**
     * @dev Get distribution wallet addresses
     */
    function getWallets() external view returns (
        address _liquidityPool,
        address _rwaWallet,
        address _reservePool
    ) {
        return (liquidityPool, rwaWallet, reservePool);
    }
    
    /**
     * @dev Get user's fund allocation breakdown (for UI display)
     * Shows how user's deposit is split according to whitepaper
     * @param user User address
     * @return totalDeposited Total amount deposited by user
     * @return miningPrincipal Amount allocated to mining (50% - Tranche B)
     * @return rwaAssets Amount allocated to RWA (40% - Tranche A)
     * @return reserveAmount Amount allocated to reserve (10%)
     * @return effectiveMiningPower Mining power after boosts (calculated by IvyCore)
     */
    function getFundAllocation(address user) external view returns (
        uint256 totalDeposited,
        uint256 miningPrincipal,
        uint256 rwaAssets,
        uint256 reserveAmount,
        uint256 effectiveMiningPower
    ) {
        BondInfo memory bond = bonds[user];
        totalDeposited = bond.totalDeposited;
        miningPrincipal = (totalDeposited * LIQUIDITY_RATE) / BASIS_POINTS;  // 50%
        rwaAssets = (totalDeposited * RWA_RATE) / BASIS_POINTS;              // 40%
        reserveAmount = (totalDeposited * RESERVE_RATE) / BASIS_POINTS;      // 10%
        effectiveMiningPower = bond.bondPower;  // This is already 50% of deposit
    }
}
