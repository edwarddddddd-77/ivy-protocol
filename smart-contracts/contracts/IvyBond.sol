// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Interface for GenesisNode referral binding
interface IGenesisNodeReferral {
    function bindReferrerFromBond(address user, address referrer) external;
    function referrers(address user) external view returns (address);
}

/// @notice Interface for LPManager progressive LP strategy
interface ILPManager {
    function addLiquidityForBond(uint256 usdtAmount) external;
}

/**
 * @title IvyBond
 * @dev Bond NFT Contract - Investment Layer of Ivy Protocol
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║              WHITEPAPER V2.5 COMPLIANCE                       ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Asset Type:    ERC721 Bond NFT (NOT mapping-based ledger)    ║
 * ║  Each deposit mints a unique NFT with its own:                ║
 * ║  - Deposit timestamp                                          ║
 * ║  - Principal amount (40% RWA - redeemable)                    ║
 * ║  - Bond power (50% LP - mining weight)                        ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                FUND DISTRIBUTION (DONATION MODEL)             ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Tranche A (40%) → RWA Wallet    (User Equity, Redeemable)    ║
 * ║  Tranche B (50%) → Liquidity Pool (Mining Power, bondPower)   ║
 * ║  Tranche C (10%) → Reserve Pool  (DONATION - Non-redeemable)  ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  CRITICAL CHANGE (Commander Directive):                       ║
 * ║  - 10% is DONATION to protocol reserve                        ║
 * ║  - NOT recorded in user's redeemable principal                ║
 * ║  - Like a fee that "disappears" from user's perspective       ║
 * ║                                                               ║
 * ║  Example: Deposit 10,000 USDT                                 ║
 * ║  - principal = 4,000 (40% RWA, redeemable)                    ║
 * ║  - bondPower = 5,000 (50% LP, mining weight)                  ║
 * ║  - donation  = 1,000 (10% Reserve, non-redeemable)            ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                 COMPOUND MECHANISM                            ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Whitepaper: "复投部分的资金给予 10% 的算力加成"                ║
 * ║  Formula: newBondPower = oldBondPower + (amount * 110 / 100)  ║
 * ║                                                               ║
 * ║  REAL COMPOUND (Audit Report 3.1-A2):                         ║
 * ║  - User must transfer IVY tokens to DEAD_ADDRESS (burn)       ║
 * ║  - Only after successful burn, bondPower is increased         ║
 * ║  - Logic: Compound = Burn circulating tokens for NFT power    ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
contract IvyBond is ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Constants ============
    
    /// @notice Distribution rates in basis points (10000 = 100%)
    uint256 public constant RWA_RATE = 4000;         // 40% - Tranche A (Redeemable Principal)
    uint256 public constant LIQUIDITY_RATE = 5000;   // 50% - Tranche B (Mining Power)
    uint256 public constant DONATION_RATE = 1000;    // 10% - Tranche C (Donation, Non-redeemable)
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Compound bonus rate (110% = 10% bonus)
    uint256 public constant COMPOUND_BONUS = 110;
    uint256 public constant COMPOUND_BASE = 100;
    
    /// @notice Minimum deposit amount (10 USDT)
    uint256 public constant MIN_DEPOSIT = 10 * 10**18;

    /// @notice RWA redemption lock period (180 days)
    uint256 public constant RWA_LOCK_PERIOD = 180 days;

    /// @notice Dead address for burning IVY tokens during compound
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @notice Redeem clearance period (7 days for RWA liquidation)
    uint256 public constant REDEEM_CLEARANCE_PERIOD = 7 days;

    /// @notice Daily redeem limit (10% of TVL to prevent bank run)
    uint256 public constant DAILY_REDEEM_LIMIT_RATE = 1000;  // 10% in basis points

    /// @notice Redeem penalty fee (2% to discourage bank runs)
    uint256 public constant REDEEM_FEE_RATE = 200;  // 2% in basis points

    // ============ Enums ============

    /// @notice Bond status for redeem lifecycle management
    enum BondStatus {
        ACTIVE,      // Normal mining state
        REDEEMING,   // Clearance period (mining stopped, waiting for RWA liquidation)
        REDEEMED     // Fully redeemed (can be restaked or traded in secondary market)
    }

    // ============ State Variables ============
    
    /// @notice Payment token (USDT)
    IERC20 public paymentToken;
    
    /// @notice IVY token for compound operations
    IERC20 public ivyToken;
    
    /// @notice Distribution wallets
    address public rwaWallet;        // 40% - Tranche A (User Equity)
    address public lpManager;        // 50% - Tranche B (LP Manager for progressive strategy)
    address public reservePool;      // 10% - Tranche C (Donation)
    
    /// @notice IvyCore contract address (for reward calculations)
    address public ivyCore;
    
    /// @notice GenesisNode contract address (for referral binding)
    address public genesisNode;

    /// @notice Photosynthesis contract address (for buyback & burn)
    address public photosynthesis;

    /// @notice Token ID counter
    uint256 private _nextTokenId;
    
    /// @notice Base URI for token metadata
    string private _baseTokenURI;
    
    /// @notice Total IVY burned through compound operations
    uint256 public totalCompoundBurned;
    
    /// @notice Total USDT donated to protocol reserve (10% Tranche C)
    uint256 public totalDonated;
    
    /**
     * @notice Bond NFT Data Structure
     * @dev Each NFT represents a unique deposit with its own properties
     *
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║  CRITICAL: principal = 40% RWA (redeemable)                   ║
     * ║            bondPower = 50% LP (mining weight)                 ║
     * ║            10% donation is NOT recorded in user data          ║
     * ║                                                               ║
     * ║  REDEEM LIFECYCLE (Two-Step Process):                         ║
     * ║  1. ACTIVE → requestRedeem() → REDEEMING (mining stops)       ║
     * ║  2. REDEEMING → claimRedeem() (7 days) → REDEEMED             ║
     * ║  3. REDEEMED → restake() → ACTIVE (mining resumes)            ║
     * ║                                                               ║
     * ║  NFT SECONDARY MARKET:                                        ║
     * ║  - NFT can be traded even after redeem (REDEEMED status)      ║
     * ║  - New owner can restake to activate mining                   ║
     * ║  - originalPrincipal and originalBondPower preserved          ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    struct BondInfo {
        uint256 depositTime;         // Timestamp when bond was created
        uint256 totalDeposited;      // Total USDT deposited (for display only)
        uint256 principal;           // Current redeemable principal (40% RWA) - Tranche A
        uint256 bondPower;           // Current mining power (50% LP) - Tranche B
        uint256 compoundedAmount;    // Total amount compounded into this bond
        uint256 originalPrincipal;   // Original principal (for restake reference)
        uint256 originalBondPower;   // Original bond power (for secondary market display)
        uint256 redeemRequestTime;   // Timestamp when redeem was requested
        BondStatus status;           // Current bond status (ACTIVE/REDEEMING/REDEEMED)
    }
    
    /// @notice Bond data mapping: tokenId => BondInfo
    /// @dev MUST use tokenId-based mapping, NOT address-based (per whitepaper)
    mapping(uint256 => BondInfo) public bondData;
    
    /// @notice Global stats
    uint256 public totalDeposits;
    uint256 public totalBondPower;
    uint256 public totalBonds;
    uint256 public totalPrincipal;   // Total redeemable principal (40% of all deposits)

    /// @notice Redeem queue management (防挤兑机制)
    uint256 public dailyRedeemedAmount;      // Amount redeemed today
    uint256 public lastRedeemResetTime;      // Last daily limit reset timestamp

    // ============ Events ============
    
    event BondMinted(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 depositAmount,
        uint256 principal,       // 40% RWA (redeemable)
        uint256 bondPower,       // 50% LP (mining)
        uint256 donation,        // 10% Reserve (non-redeemable)
        uint256 toRWA,
        uint256 toLiquidity,
        uint256 toReserve
    );
    
    event BondCompounded(
        uint256 indexed tokenId,
        address indexed user,
        uint256 ivyBurned,
        uint256 bonusPower,
        uint256 newBondPower
    );
    
    event WalletsUpdated(
        address rwaWallet,
        address lpManager,
        address reservePool
    );
    
    event IvyCoreSet(address indexed ivyCore);
    event GenesisNodeSet(address indexed genesisNode);
    event IvyTokenSet(address indexed ivyToken);
    event ReferrerBound(address indexed user, address indexed referrer);
    
    /// @notice Event emitted when IvyCore adds compound power via VIP compound
    event CompoundPowerAdded(
        uint256 indexed tokenId,
        address indexed user,
        uint256 addedPower,
        uint256 newBondPower
    );

    /// @notice Event emitted when user requests redeem (Step 1 of 2)
    event RedeemRequested(
        uint256 indexed tokenId,
        address indexed user,
        uint256 principalAmount
    );

    /// @notice Event emitted when user claims redeemed funds (Step 2 of 2)
    event RedeemClaimed(
        uint256 indexed tokenId,
        address indexed user,
        uint256 principalClaimed
    );

    /// @notice Event emitted when redeem fee is sent for buyback & burn
    event RedeemFeeBurned(
        uint256 indexed tokenId,
        address indexed user,
        uint256 feeAmount
    );

    /// @notice Event emitted when user restakes to reactivate NFT
    event Restaked(
        uint256 indexed tokenId,
        address indexed user,
        uint256 principalRestaked,
        uint256 bondPowerRestored
    );

    // ============ Constructor ============
    
    /**
     * @dev Initialize the IvyBond NFT contract
     * @param _rwaWallet Address for RWA wallet (40% - Tranche A, Redeemable)
     * @param _lpManager Address for LP Manager (50% - Tranche B, Progressive LP Strategy)
     * @param _reservePool Address for reserve pool (10% - Tranche C, Donation)
     */
    constructor(
        address _rwaWallet,
        address _lpManager,
        address _reservePool
    ) ERC721("Ivy Bond NFT", "IVY-BOND") Ownable(msg.sender) {
        require(_rwaWallet != address(0), "Invalid RWA wallet");
        require(_lpManager != address(0), "Invalid LP Manager");
        require(_reservePool != address(0), "Invalid reserve pool");

        rwaWallet = _rwaWallet;
        lpManager = _lpManager;
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
     * @dev Set the IVY token address for compound operations
     * @param _ivyToken Address of the IvyToken contract
     */
    function setIvyToken(address _ivyToken) external onlyOwner {
        require(_ivyToken != address(0), "Invalid IvyToken");
        ivyToken = IERC20(_ivyToken);
        emit IvyTokenSet(_ivyToken);
    }

    /**
     * @dev Set the IvyCore contract address
     *
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║    FIX: ONE-TIME ONLY (AUDIT ROUND 2, PROBLEM #5)            ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  ✅ Fix #3: Prevent owner from changing IvyCore after it's   ║
     * ║            set, preventing permission hijacking attack       ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function setIvyCore(address _ivyCore) external onlyOwner {
        // ✅ FIX #3: Ensure IvyCore can only be set once
        require(ivyCore == address(0), "IvyCore already set");
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
     * @dev Set the Photosynthesis contract address (for buyback & burn)
     */
    function setPhotosynthesis(address _photosynthesis) external onlyOwner {
        require(_photosynthesis != address(0), "Invalid Photosynthesis");
        photosynthesis = _photosynthesis;
    }

    /**
     * @dev Update distribution wallet addresses
     */
    function setWallets(
        address _rwaWallet,
        address _lpManager,
        address _reservePool
    ) external onlyOwner {
        require(_rwaWallet != address(0), "Invalid RWA wallet");
        require(_lpManager != address(0), "Invalid LP Manager");
        require(_reservePool != address(0), "Invalid reserve pool");

        rwaWallet = _rwaWallet;
        lpManager = _lpManager;
        reservePool = _reservePool;

        emit WalletsUpdated(_rwaWallet, _lpManager, _reservePool);
    }
    
    /**
     * @dev Set the base URI for token metadata
     */
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    // ============ Core Functions ============
    
    /**
     * @dev Internal function to return base URI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Deposit USDT and mint a Bond NFT
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║           DEPOSIT FLOW (DONATION MODEL - Commander Directive) ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  1. User deposits N USDT                                      ║
     * ║  2. Split funds:                                              ║
     * ║     - 40% (N * 0.4) → RWA Wallet (User Equity, Redeemable)   ║
     * ║     - 50% (N * 0.5) → Liquidity Pool (Mining Power)          ║
     * ║     - 10% (N * 0.1) → Reserve Pool (DONATION, Non-redeemable)║
     * ║  3. Mint Bond NFT with:                                       ║
     * ║     - principal = N * 40% (RWA, redeemable)                  ║
     * ║     - bondPower = N * 50% (LP, mining weight)                ║
     * ║     - 10% is NOT recorded (donation to protocol)             ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  IMPORTANT: 10% is ecosystem insurance fund, donated upon    ║
     * ║  deposit, non-redeemable. Frontend MUST display this clearly.║
     * ╚═══════════════════════════════════════════════════════════════╝
     * 
     * @param amount Amount of USDT to deposit
     * @param referrer Address of the referrer (can be address(0))
     * @return tokenId The ID of the minted Bond NFT
     */
    function deposit(uint256 amount, address referrer) external nonReentrant returns (uint256) {
        require(address(paymentToken) != address(0), "Payment token not set");
        require(amount >= MIN_DEPOSIT, "Below minimum deposit");
        
        address user = msg.sender;
        
        // Bind referrer if not already bound (CRITICAL: Must happen before any rewards)
        if (genesisNode != address(0) && referrer != address(0) && referrer != user) {
            try IGenesisNodeReferral(genesisNode).bindReferrerFromBond(user, referrer) {
                emit ReferrerBound(user, referrer);
            } catch {
                // Referrer already bound or invalid, continue
            }
        }
        
        // Transfer USDT from user
        paymentToken.safeTransferFrom(user, address(this), amount);

        // ╔═══════════════════════════════════════════════════════════════╗
        // ║         FIX: ROUNDING ERROR (AUDIT ISSUE #4)                  ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  Problem: 40% + 50% + 10% may not sum to 100% due to         ║
        // ║           integer division truncation                         ║
        // ║  Solution: Let donation absorb all rounding errors            ║
        // ║  Formula: toDonation = amount - toRWA - toLiquidity           ║
        // ╚═══════════════════════════════════════════════════════════════╝

        // Calculate split amounts (DONATION MODEL)
        uint256 toRWA = (amount * RWA_RATE) / BASIS_POINTS;           // 40% - Tranche A (Redeemable)
        uint256 toLiquidity = (amount * LIQUIDITY_RATE) / BASIS_POINTS; // 50% - Tranche B (Mining)
        uint256 toDonation = amount - toRWA - toLiquidity;              // 10% + rounding dust - Tranche C (Donation)

        // Execute the 40/50/10 split
        paymentToken.safeTransfer(rwaWallet, toRWA);
        paymentToken.safeTransfer(reservePool, toDonation);  // Donation to protocol reserve

        // ╔═══════════════════════════════════════════════════════════════╗
        // ║    FIX: APPROVE ISSUE (AUDIT ROUND 2, PROBLEM #9)            ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  Problem: safeApprove() reverts if allowance is non-zero     ║
        // ║  Solution: Reset to 0 first, then set new allowance          ║
        // ║  Prevents: Failed deposits due to residual allowance          ║
        // ╚═══════════════════════════════════════════════════════════════╝

        // ✅ FIX: Use forceApprove (OpenZeppelin v5 replacement for safeApprove)
        paymentToken.forceApprove(lpManager, toLiquidity);
        ILPManager(lpManager).addLiquidityForBond(toLiquidity);
        
        // Mint Bond NFT
        uint256 tokenId = _nextTokenId++;
        _safeMint(user, tokenId);
        
        // Record bond data
        // CRITICAL CHANGE:
        // - principal = 40% RWA (redeemable equity)
        // - bondPower = 50% LP (mining weight)
        // - 10% donation is NOT recorded in user's redeemable balance
        uint256 principal = toRWA;      // 40% - Redeemable principal
        uint256 bondPower = toLiquidity; // 50% - Mining power

        bondData[tokenId] = BondInfo({
            depositTime: block.timestamp,
            totalDeposited: amount,          // Display only - actual redeemable is principal
            principal: principal,            // 40% RWA - what user can redeem
            bondPower: bondPower,            // 50% LP - mining weight
            compoundedAmount: 0,
            originalPrincipal: principal,    // Store original for restake reference
            originalBondPower: bondPower,    // Store original for secondary market
            redeemRequestTime: 0,            // No redeem request yet
            status: BondStatus.ACTIVE        // Start as active mining NFT
        });
        
        // Update global stats
        totalDeposits += amount;
        totalBondPower += bondPower;
        totalPrincipal += principal;
        totalDonated += toDonation;
        totalBonds++;
        
        emit BondMinted(user, tokenId, amount, principal, bondPower, toDonation, toRWA, toLiquidity, toDonation);
        
        return tokenId;
    }

    /**
     * @dev Compound mining rewards (IVY) into a Bond NFT
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              REAL COMPOUND MECHANISM (Audit Report 3.1-A2)    ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Whitepaper Quote:                                            ║
     * ║  "将挖矿产出的 VIVY 复投进 Bond NFT...                         ║
     * ║   系统仅对复投部分的资金给予 10% 的算力加成"                    ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  IMPLEMENTATION:                                              ║
     * ║  1. User calls compound(tokenId, amount)                      ║
     * ║  2. Contract transfers IVY from user to DEAD_ADDRESS (burn)   ║
     * ║  3. ONLY if transfer succeeds, bondPower is increased         ║
     * ║  4. Formula: addedBondPower = amount * 110 / 100              ║
     * ║  5. Example: Compound 1000 IVY → Burn 1000 IVY → Gain 1100 BP ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  LOGIC CLOSURE:                                               ║
     * ║  Compound = Burn circulating IVY tokens in exchange for       ║
     * ║             NFT mining power (+10% bonus)                     ║
     * ╚═══════════════════════════════════════════════════════════════╝
     * 
     * @param tokenId The Bond NFT to compound into
     * @param amount Amount of IVY to burn and convert to bond power
     * 
     * Requirements:
     * - Caller must own the Bond NFT
     * - Caller must have approved this contract to spend IVY tokens
     * - IvyToken address must be set
     * - Amount must be greater than 0
     */
    function compound(uint256 tokenId, uint256 amount) external nonReentrant {
        require(_ownerOf(tokenId) == msg.sender, "Not bond owner");
        require(amount > 0, "Amount must be > 0");
        require(address(ivyToken) != address(0), "IvyToken not set");
        
        address user = msg.sender;
        
        // CRITICAL: Transfer IVY tokens from user to DEAD_ADDRESS (burn)
        // This is the "Real Compound" implementation per Audit Report 3.1-A2
        // User must have approved this contract to spend their IVY tokens
        ivyToken.safeTransferFrom(user, DEAD_ADDRESS, amount);
        
        // Calculate bonus power: 100% of amount + 10% bonus = 110%
        // Whitepaper: "复投部分的资金给予 10% 的算力加成"
        // NO SPLIT! Compound is IVY burning, not USDT deposit
        uint256 addedBondPower = (amount * COMPOUND_BONUS) / COMPOUND_BASE;
        
        // Update bond data
        BondInfo storage bond = bondData[tokenId];
        
        bond.bondPower += addedBondPower;
        bond.compoundedAmount += amount;
        
        // Update global stats
        totalBondPower += addedBondPower;
        totalCompoundBurned += amount;
        
        emit BondCompounded(tokenId, user, amount, addedBondPower, bond.bondPower);
    }

    /**
     * @dev Redeem RWA principal (40% Tranche A only)
     *
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              RWA REDEMPTION MECHANISM                         ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Lock Period:   180 days from deposit                         ║
     * ║  Redeemable:    40% RWA principal ONLY (no interest)          ║
     * ║  Interest Flow: RWA yields → Photosynthesis → Buyback/Burn    ║
     * ║                                                               ║
     * ║  Example: Deposited 1000 USDT                                 ║
     * ║  - 400U → RWA wallet (redeemable after 180 days)              ║
     * ║  - 500U → LP (NOT redeemable, converted to bond power)        ║
     * ║  - 100U → Reserve (NOT redeemable, donation)                  ║
     * ║  - Interest earned by 400U → NOT returned to user             ║
     * ╚═══════════════════════════════════════════════════════════════╝
     *
     * @param tokenId Bond NFT token ID
     */
    /**
     * @notice Request redeem (Step 1 of 2) - Initiates 7-day RWA liquidation
     * @dev Mining stops immediately, funds transferred after clearance period
     * @param tokenId Bond NFT token ID
     *
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║         TWO-STEP REDEEM PROCESS (Business Logic)              ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Step 1: requestRedeem()                                      ║
     * ║  - User initiates redeem request                              ║
     * ║  - NFT mining stops immediately (bondPower → 0)               ║
     * ║  - Backend starts liquidating RWA investments                 ║
     * ║  - Status: ACTIVE → REDEEMING                                 ║
     * ║                                                               ║
     * ║  Clearance Period: 7 days                                     ║
     * ║  - RWA platform withdraws investments                         ║
     * ║  - Converts assets → USDT                                     ║
     * ║  - Transfers to rwaWallet                                     ║
     * ║                                                               ║
     * ║  Step 2: claimRedeem()                                        ║
     * ║  - After 7 days, user claims funds                            ║
     * ║  - Funds transferred from rwaWallet                           ║
     * ║  - Status: REDEEMING → REDEEMED                               ║
     * ║  - NFT preserved (can be traded or restaked)                  ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function requestRedeem(uint256 tokenId) external nonReentrant {
        require(_ownerOf(tokenId) == msg.sender, "Not bond owner");

        BondInfo storage bond = bondData[tokenId];
        require(bond.status == BondStatus.ACTIVE, "Bond not active");
        require(bond.principal > 0, "No principal to redeem");

        // Check 180-day lock period
        require(
            block.timestamp >= bond.depositTime + RWA_LOCK_PERIOD,
            "Still in lock period"
        );

        // Stop mining immediately (funds no longer earning yield)
        totalBondPower -= bond.bondPower;
        bond.bondPower = 0;

        // Record redeem request
        bond.redeemRequestTime = block.timestamp;
        bond.status = BondStatus.REDEEMING;

        emit RedeemRequested(tokenId, msg.sender, bond.principal);
    }

    /**
     * @notice Claim redeemed funds (Step 2 of 2) - After 7-day clearance
     * @param tokenId Bond NFT token ID
     *
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║           ANTI-BANK-RUN MECHANISM (防挤兑)                     ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Daily Limit: 10% of total TVL (totalPrincipal)               ║
     * ║  - Prevents all users from redeeming simultaneously           ║
     * ║  - Protects protocol from death spiral                        ║
     * ║  - Resets every 24 hours                                      ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function claimRedeem(uint256 tokenId) external nonReentrant {
        require(_ownerOf(tokenId) == msg.sender, "Not bond owner");

        BondInfo storage bond = bondData[tokenId];
        require(bond.status == BondStatus.REDEEMING, "Not in redeeming state");
        require(
            block.timestamp >= bond.redeemRequestTime + REDEEM_CLEARANCE_PERIOD,
            "Clearance period not completed (7 days required)"
        );

        uint256 claimAmount = bond.principal;

        // ╔═══════════════════════════════════════════════════════════════╗
        // ║             DAILY REDEEM LIMIT (防挤兑队列)                    ║
        // ╚═══════════════════════════════════════════════════════════════╝

        // Reset daily counter if 24 hours passed
        if (block.timestamp >= lastRedeemResetTime + 1 days) {
            dailyRedeemedAmount = 0;
            lastRedeemResetTime = block.timestamp;
        }

        // Calculate daily limit (10% of TVL)
        uint256 dailyLimit = (totalPrincipal * DAILY_REDEEM_LIMIT_RATE) / BASIS_POINTS;

        // Check if redeem would exceed daily limit
        require(
            dailyRedeemedAmount + claimAmount <= dailyLimit,
            "Daily redeem limit exceeded, please try tomorrow"
        );

        // Update daily redeemed amount
        dailyRedeemedAmount += claimAmount;

        // Update bond status
        bond.principal = 0;
        bond.status = BondStatus.REDEEMED;

        // ╔═══════════════════════════════════════════════════════════════╗
        // ║         FIX: TOTAL_PRINCIPAL SYNC (AUDIT ISSUE #11)           ║
        // ╚═══════════════════════════════════════════════════════════════╝
        totalPrincipal -= claimAmount;

        // ╔═══════════════════════════════════════════════════════════════╗
        // ║          REDEEM PENALTY FEE (2% - 防止银行挤兑)                ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  Fee Purpose: Discourage bank runs + fund buyback & burn     ║
        // ║  - 2% penalty on redemption amount                            ║
        // ║  - Sent to Photosynthesis for IVY buyback & burn              ║
        // ╚═══════════════════════════════════════════════════════════════╝
        uint256 redeemFee = (claimAmount * REDEEM_FEE_RATE) / BASIS_POINTS;  // 2%
        uint256 netAmount = claimAmount - redeemFee;

        // Transfer net amount to user
        paymentToken.safeTransferFrom(rwaWallet, msg.sender, netAmount);

        // Transfer fee to Photosynthesis for buyback & burn (if configured)
        if (photosynthesis != address(0) && redeemFee > 0) {
            paymentToken.safeTransferFrom(rwaWallet, photosynthesis, redeemFee);
            emit RedeemFeeBurned(tokenId, msg.sender, redeemFee);
        }

        emit RedeemClaimed(tokenId, msg.sender, netAmount);
    }

    /**
     * @notice Restake to reactivate NFT mining (After redeem)
     * @param tokenId Bond NFT token ID
     *
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              NFT SECONDARY MARKET SUPPORT                     ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Scenario 1: Original owner restakes                          ║
     * ║  - User redeemed 4,000 USDT                                   ║
     * ║  - Decides to mine again                                      ║
     * ║  - Deposits 4,000 USDT → NFT resumes mining                   ║
     * ║                                                               ║
     * ║  Scenario 2: New owner buys NFT from secondary market         ║
     * ║  - User A redeems → NFT status = REDEEMED                     ║
     * ║  - User A sells NFT on OpenSea → User B buys                  ║
     * ║  - User B sees: originalBondPower = 5,000                     ║
     * ║  - User B deposits 4,000 USDT → Activates mining              ║
     * ║                                                               ║
     * ║  Requirement: Must deposit originalPrincipal amount           ║
     * ║  Effect: Restores originalBondPower                           ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    function restake(uint256 tokenId) external nonReentrant {
        require(_ownerOf(tokenId) == msg.sender, "Not bond owner");
        require(address(paymentToken) != address(0), "Payment token not set");

        BondInfo storage bond = bondData[tokenId];
        require(bond.status == BondStatus.REDEEMED, "Bond not redeemed");
        require(bond.originalPrincipal > 0, "Invalid original principal");

        uint256 restakeAmount = bond.originalPrincipal;

        // Transfer USDT from user
        paymentToken.safeTransferFrom(msg.sender, address(this), restakeAmount);

        // Send to RWA wallet (same as deposit flow)
        paymentToken.safeTransfer(rwaWallet, restakeAmount);

        // Restore bond to active state
        bond.principal = bond.originalPrincipal;
        bond.bondPower = bond.originalBondPower;
        bond.status = BondStatus.ACTIVE;
        bond.redeemRequestTime = 0;

        // Update global stats
        totalPrincipal += bond.originalPrincipal;
        totalBondPower += bond.originalBondPower;

        emit Restaked(tokenId, msg.sender, bond.originalPrincipal, bond.originalBondPower);
    }

    // ============ View Functions ============

    /**
     * @dev Get bond information by token ID
     * @param tokenId The Bond NFT token ID
     * @return depositTime Timestamp when bond was created
     * @return totalDeposited Total USDT deposited (display only)
     * @return principal Redeemable principal (40% RWA)
     * @return bondPower Current mining power (50% LP + compound bonuses)
     * @return compoundedAmount Total amount compounded
     */
    function getBondData(uint256 tokenId) external view returns (
        uint256 depositTime,
        uint256 totalDeposited,
        uint256 principal,
        uint256 bondPower,
        uint256 compoundedAmount
    ) {
        BondInfo memory bond = bondData[tokenId];
        return (
            bond.depositTime,
            bond.totalDeposited,
            bond.principal,
            bond.bondPower,
            bond.compoundedAmount
        );
    }

    /**
     * @dev Get total bond power for a user (sum of all their Bond NFTs)
     * @param user User address
     * @return Total bond power across all owned Bond NFTs
     */
    function getUserTotalBondPower(address user) external view returns (uint256) {
        uint256 balance = balanceOf(user);
        uint256 total = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            total += bondData[tokenId].bondPower;
        }
        
        return total;
    }
    
    /**
     * @dev Get total redeemable principal for a user (40% RWA portion)
     * @param user User address
     * @return Total redeemable principal across all owned Bond NFTs
     */
    function getUserTotalPrincipal(address user) external view returns (uint256) {
        uint256 balance = balanceOf(user);
        uint256 total = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            total += bondData[tokenId].principal;
        }
        
        return total;
    }
    
    /**
     * @dev Get total deposited for a user (for display purposes)
     * @param user User address
     * @return Total deposited across all owned Bond NFTs
     */
    function getUserTotalDeposited(address user) external view returns (uint256) {
        uint256 balance = balanceOf(user);
        uint256 total = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            total += bondData[tokenId].totalDeposited;
        }
        
        return total;
    }

    /**
     * @dev Get all bond token IDs owned by a user
     * @param user User address
     * @return Array of token IDs
     */
    function getUserBondIds(address user) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(user);
        uint256[] memory tokenIds = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(user, i);
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Get user's fund allocation breakdown (for UI display)
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║  IMPORTANT FOR FRONTEND:                                      ║
     * ║  - redeemablePrincipal = 40% of deposit (RWA, can redeem)    ║
     * ║  - miningPower = 50% of deposit (LP, for mining)             ║
     * ║  - donatedAmount = 10% of deposit (Reserve, non-redeemable)  ║
     * ║                                                               ║
     * ║  MUST display: "10% 为生态保险金，存入即捐赠，不可赎回"        ║
     * ╚═══════════════════════════════════════════════════════════════╝
     * 
     * @param user User address
     * @return totalDeposited Total amount deposited by user
     * @return redeemablePrincipal Amount redeemable (40% RWA)
     * @return miningPower Total bond power (50% LP + compound bonuses)
     * @return donatedAmount Amount donated to protocol (10% Reserve)
     */
    function getFundAllocation(address user) external view returns (
        uint256 totalDeposited,
        uint256 redeemablePrincipal,
        uint256 miningPower,
        uint256 donatedAmount
    ) {
        uint256 balance = balanceOf(user);
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            BondInfo memory bond = bondData[tokenId];
            totalDeposited += bond.totalDeposited;
            redeemablePrincipal += bond.principal;
            miningPower += bond.bondPower;
        }
        
        // Calculate donated amount (10% of total deposited)
        donatedAmount = (totalDeposited * DONATION_RATE) / BASIS_POINTS;
    }

    /**
     * @dev Check if user has any bonds
     * @param user User address
     * @return True if user owns at least one Bond NFT
     */
    function hasBond(address user) external view returns (bool) {
        return balanceOf(user) > 0;
    }

    /**
     * @dev Get contract statistics
     * @return _totalDeposits Total USDT deposited
     * @return _totalBondPower Total bond power (50% LP + compounds)
     * @return _totalBonds Total number of Bond NFTs minted
     * @return _totalPrincipal Total redeemable principal (40% RWA)
     * @return _totalDonated Total donated to protocol reserve (10%)
     * @return _totalCompoundBurned Total IVY burned through compound
     */
    function getStats() external view returns (
        uint256 _totalDeposits,
        uint256 _totalBondPower,
        uint256 _totalBonds,
        uint256 _totalPrincipal,
        uint256 _totalDonated,
        uint256 _totalCompoundBurned
    ) {
        return (totalDeposits, totalBondPower, totalBonds, totalPrincipal, totalDonated, totalCompoundBurned);
    }

    /**
     * @dev Get distribution wallet addresses
     */
    function getWallets() external view returns (
        address _rwaWallet,
        address _lpManager,
        address _reservePool
    ) {
        return (rwaWallet, lpManager, reservePool);
    }
    
    /**
     * @dev Legacy compatibility: Get bond power for a user
     * Used by IvyCore for mining calculations
     */
    function getBondPower(address user) external view returns (uint256) {
        uint256 balance = balanceOf(user);
        uint256 total = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            total += bondData[tokenId].bondPower;
        }
        
        return total;
    }
    
    // ============ VIP Compound Functions (Called by IvyCore) ============
    
    /**
     * @dev Add compound power to a Bond NFT (VIP Compound)
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              VIP COMPOUND - POWER INJECTION                   ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Called by IvyCore.compoundVested() to inject mining power    ║
     * ║  into a Bond NFT without any token transfer.                  ║
     * ║                                                               ║
     * ║  Flow:                                                        ║
     * ║  1. User calls IvyCore.compoundVested(tokenId)               ║
     * ║  2. IvyCore calculates pending IVY value in USDT             ║
     * ║  3. IvyCore calls this function to inject power              ║
     * ║  4. bondPower increases, principal stays the same            ║
     * ║                                                               ║
     * ║  CRITICAL: Only bondPower is increased, NOT principal!       ║
     * ║  This is pure mining power injection, no redeemable value.   ║
     * ╚═══════════════════════════════════════════════════════════════╝
     * 
     * @param tokenId The Bond NFT to add power to
     * @param addedPower The amount of bond power to add (in USDT value * 1.1)
     * 
     * Requirements:
     * - Caller must be IvyCore contract
     * - Token must exist
     */
    function addCompoundPower(uint256 tokenId, uint256 addedPower) external {
        // ╔═══════════════════════════════════════════════════════════════╗
        // ║    FIX: ACCESS CONTROL (AUDIT ROUND 2, PROBLEM #5)           ║
        // ╠═══════════════════════════════════════════════════════════════╣
        // ║  ✅ Fix #1: Check ivyCore is initialized (prevents attacks   ║
        // ║            before IvyCore is set)                            ║
        // ║  ✅ Fix #2: Single-call power limit (1M IVY) prevents        ║
        // ║            malicious/buggy IvyCore from adding unrealistic   ║
        // ║            power in single transaction                       ║
        // ╚═══════════════════════════════════════════════════════════════╝

        // ✅ FIX #1: Ensure IvyCore is properly initialized
        require(ivyCore != address(0), "IvyCore not initialized");
        require(msg.sender == ivyCore, "Only IvyCore can call");

        // ✅ FIX #2: Single-call power limit (1M IVY = 10^24 wei)
        // Prevents malicious/buggy IvyCore from adding unrealistic power
        uint256 MAX_SINGLE_CALL_POWER = 1_000_000 * 10**18;
        require(addedPower > 0, "Power must be > 0");
        require(addedPower <= MAX_SINGLE_CALL_POWER, "Exceeds single-call limit (1M IVY)");

        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        // Get bond owner for event
        address owner = _ownerOf(tokenId);

        // Update bond data - ONLY bondPower, NOT principal!
        BondInfo storage bond = bondData[tokenId];
        bond.bondPower += addedPower;

        // Update global stats
        totalBondPower += addedPower;

        emit CompoundPowerAdded(tokenId, owner, addedPower, bond.bondPower);
    }
    
    /**
     * @dev Get the owner of a token (for IvyCore to verify ownership)
     * @param tokenId The token ID to check
     * @return The owner address
     */
    function ownerOfBond(uint256 tokenId) external view returns (address) {
        return _ownerOf(tokenId);
    }
}
