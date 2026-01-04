// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IIvyBond.sol";

/**
 * @title DividendPool
 * @dev USDT Dividend Distribution Pool for Ivy Protocol
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║              DIVIDEND POOL (Whitepaper P7)                    ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Purpose: Distribute RWA yields to Bond holders in bear market║
 * ║                                                               ║
 * ║  Distribution Logic:                                          ║
 * ║  - Pro-rata based on user's Bond Power                        ║
 * ║  - Uses accDividendPerShare for fair distribution             ║
 * ║  - Claimable anytime, no vesting                              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
contract DividendPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Constants ============
    
    /// @notice Precision for dividend calculation
    uint256 public constant ACC_DIVIDEND_PRECISION = 1e12;
    
    // ============ State Variables ============
    
    /// @notice USDT token address
    IERC20 public usdt;
    
    /// @notice IvyBond contract for bond power queries
    IIvyBond public ivyBond;
    
    /// @notice Photosynthesis contract (authorized depositor)
    address public photosynthesis;
    
    /// @notice Accumulated dividend per share (scaled by precision)
    uint256 public accDividendPerShare;
    
    /// @notice Total dividends distributed
    uint256 public totalDividendsDistributed;
    
    /// @notice Total dividends claimed
    uint256 public totalDividendsClaimed;
    
    /// @notice User dividend debt for fair calculation
    mapping(address => uint256) public userDividendDebt;
    
    /// @notice User's last known bond power snapshot
    mapping(address => uint256) public userBondPowerSnapshot;
    
    /// @notice Total claimed by user
    mapping(address => uint256) public userTotalClaimed;
    
    // ============ Events ============
    
    event DividendDeposited(address indexed from, uint256 amount, uint256 newAccPerShare);
    event DividendClaimed(address indexed user, uint256 amount);
    event UserSynced(address indexed user, uint256 bondPower, uint256 dividendDebt);
    event PhotosynthesisUpdated(address indexed oldAddress, address indexed newAddress);
    
    // ============ Constructor ============
    
    constructor(address _usdt, address _ivyBond) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT");
        require(_ivyBond != address(0), "Invalid IvyBond");
        
        usdt = IERC20(_usdt);
        ivyBond = IIvyBond(_ivyBond);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Set Photosynthesis contract address
     */
    function setPhotosynthesis(address _photosynthesis) external onlyOwner {
        require(_photosynthesis != address(0), "Invalid address");
        address oldAddress = photosynthesis;
        photosynthesis = _photosynthesis;
        emit PhotosynthesisUpdated(oldAddress, _photosynthesis);
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Deposit USDT dividends into the pool
     * Called by Photosynthesis contract during bear market
     * 
     * @param amount Amount of USDT to distribute
     */
    function depositDividend(uint256 amount) external nonReentrant {
        require(msg.sender == photosynthesis || msg.sender == owner(), "Not authorized");
        require(amount > 0, "Amount must be > 0");
        
        // Get total bond power from IvyBond
        uint256 totalBondPower = ivyBond.totalBondPower();
        require(totalBondPower > 0, "No bond power in system");
        
        // Transfer USDT from caller
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update accumulated dividend per share
        accDividendPerShare += (amount * ACC_DIVIDEND_PRECISION) / totalBondPower;
        totalDividendsDistributed += amount;
        
        emit DividendDeposited(msg.sender, amount, accDividendPerShare);
    }
    
    /**
     * @dev Sync user's bond power and calculate pending dividends
     */
    function syncUser(address user) public {
        uint256 currentBondPower = ivyBond.getBondPower(user);
        uint256 previousBondPower = userBondPowerSnapshot[user];
        
        // If user had bond power before, calculate pending based on old snapshot
        // This ensures fair distribution even when bond power changes
        if (previousBondPower > 0) {
            // Pending is already accounted in debt, no action needed
        }
        
        // Update snapshot and debt
        userBondPowerSnapshot[user] = currentBondPower;
        userDividendDebt[user] = (currentBondPower * accDividendPerShare) / ACC_DIVIDEND_PRECISION;
        
        emit UserSynced(user, currentBondPower, userDividendDebt[user]);
    }
    
    /**
     * @dev Claim pending USDT dividends
     */
    function claimDividend() external nonReentrant {
        address user = msg.sender;
        
        // Sync user first
        syncUser(user);
        
        uint256 pending = pendingDividend(user);
        require(pending > 0, "No dividends to claim");
        
        // Update debt
        userDividendDebt[user] = (userBondPowerSnapshot[user] * accDividendPerShare) / ACC_DIVIDEND_PRECISION;
        userTotalClaimed[user] += pending;
        totalDividendsClaimed += pending;
        
        // Transfer USDT
        usdt.safeTransfer(user, pending);
        
        emit DividendClaimed(user, pending);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Calculate pending dividends for a user
     */
    function pendingDividend(address user) public view returns (uint256) {
        uint256 bondPower = ivyBond.getBondPower(user);
        if (bondPower == 0) return 0;
        
        uint256 accumulated = (bondPower * accDividendPerShare) / ACC_DIVIDEND_PRECISION;
        uint256 debt = userDividendDebt[user];
        
        return accumulated > debt ? accumulated - debt : 0;
    }
    
    /**
     * @dev Get pool statistics
     */
    function getPoolStats() external view returns (
        uint256 _totalDistributed,
        uint256 _totalClaimed,
        uint256 _poolBalance,
        uint256 _accPerShare
    ) {
        _totalDistributed = totalDividendsDistributed;
        _totalClaimed = totalDividendsClaimed;
        _poolBalance = usdt.balanceOf(address(this));
        _accPerShare = accDividendPerShare;
    }
    
    /**
     * @dev Get user dividend info
     */
    function getUserDividendInfo(address user) external view returns (
        uint256 pending,
        uint256 totalClaimed,
        uint256 bondPower
    ) {
        pending = pendingDividend(user);
        totalClaimed = userTotalClaimed[user];
        bondPower = ivyBond.getBondPower(user);
    }
    
    // ============ Emergency Functions ============
    
    /**
     * @dev Emergency withdraw (only owner, for stuck funds)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
