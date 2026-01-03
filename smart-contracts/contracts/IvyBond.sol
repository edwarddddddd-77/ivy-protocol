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
 * ║  - Principal amount (50% of deposit)                          ║
 * ║  - Bond power (mining weight)                                 ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                    FUND DISTRIBUTION                          ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Tranche A (40%) → RWA Wallet    (Treasury Bonds)             ║
 * ║  Tranche B (50%) → Liquidity Pool (Mining Principal)          ║
 * ║  Tranche C (10%) → Reserve Pool  (Protocol Reserve)           ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  ONLY Tranche B (50%) is recorded as bondData.principal       ║
 * ║  and used for mining power calculation!                       ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                 COMPOUND MECHANISM                            ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Whitepaper: "复投部分的资金给予 10% 的算力加成"                ║
 * ║  Formula: newBondPower = oldBondPower + (amount * 110 / 100)  ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
contract IvyBond is ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Constants ============
    
    /// @notice Distribution rates in basis points (10000 = 100%)
    uint256 public constant RWA_RATE = 4000;         // 40% - Tranche A
    uint256 public constant LIQUIDITY_RATE = 5000;   // 50% - Tranche B (Mining)
    uint256 public constant RESERVE_RATE = 1000;     // 10% - Tranche C
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Compound bonus rate (110% = 10% bonus)
    uint256 public constant COMPOUND_BONUS = 110;
    uint256 public constant COMPOUND_BASE = 100;
    
    /// @notice Minimum deposit amount (10 USDT)
    uint256 public constant MIN_DEPOSIT = 10 * 10**18;

    // ============ State Variables ============
    
    /// @notice Payment token (USDT)
    IERC20 public paymentToken;
    
    /// @notice Distribution wallets
    address public rwaWallet;        // 40% - Tranche A
    address public liquidityPool;    // 50% - Tranche B
    address public reservePool;      // 10% - Tranche C
    
    /// @notice IvyCore contract address (for reward calculations)
    address public ivyCore;
    
    /// @notice GenesisNode contract address (for referral binding)
    address public genesisNode;
    
    /// @notice Token ID counter
    uint256 private _nextTokenId;
    
    /// @notice Base URI for token metadata
    string private _baseTokenURI;
    
    /**
     * @notice Bond NFT Data Structure
     * @dev Each NFT represents a unique deposit with its own properties
     * 
     * Whitepaper Quote: "用户并未直接买到现货，而是拿到了一张 Bond NFT... 
     *                   这张 NFT 就像一台锁仓矿机..."
     */
    struct BondInfo {
        uint256 depositTime;         // Timestamp when bond was created
        uint256 totalDeposited;      // Total USDT deposited (for display)
        uint256 principal;           // Mining principal (50% of deposit) - Tranche B
        uint256 bondPower;           // Mining power (principal + compound bonuses)
        uint256 compoundedAmount;    // Total amount compounded into this bond
    }
    
    /// @notice Bond data mapping: tokenId => BondInfo
    /// @dev MUST use tokenId-based mapping, NOT address-based (per whitepaper)
    mapping(uint256 => BondInfo) public bondData;
    
    /// @notice Global stats
    uint256 public totalDeposits;
    uint256 public totalBondPower;
    uint256 public totalBonds;

    // ============ Events ============
    
    event BondMinted(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 depositAmount,
        uint256 principal,
        uint256 bondPower,
        uint256 toRWA,
        uint256 toLiquidity,
        uint256 toReserve
    );
    
    event BondCompounded(
        uint256 indexed tokenId,
        uint256 amount,
        uint256 bonusPower,
        uint256 newBondPower
    );
    
    event WalletsUpdated(
        address rwaWallet,
        address liquidityPool,
        address reservePool
    );
    
    event IvyCoreSet(address indexed ivyCore);
    event GenesisNodeSet(address indexed genesisNode);
    event ReferrerBound(address indexed user, address indexed referrer);

    // ============ Constructor ============
    
    /**
     * @dev Initialize the IvyBond NFT contract
     * @param _rwaWallet Address for RWA wallet (40% - Tranche A)
     * @param _liquidityPool Address for liquidity pool (50% - Tranche B)
     * @param _reservePool Address for reserve pool (10% - Tranche C)
     */
    constructor(
        address _rwaWallet,
        address _liquidityPool,
        address _reservePool
    ) ERC721("Ivy Bond NFT", "IVY-BOND") Ownable(msg.sender) {
        require(_rwaWallet != address(0), "Invalid RWA wallet");
        require(_liquidityPool != address(0), "Invalid liquidity pool");
        require(_reservePool != address(0), "Invalid reserve pool");
        
        rwaWallet = _rwaWallet;
        liquidityPool = _liquidityPool;
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
        address _rwaWallet,
        address _liquidityPool,
        address _reservePool
    ) external onlyOwner {
        require(_rwaWallet != address(0), "Invalid RWA wallet");
        require(_liquidityPool != address(0), "Invalid liquidity pool");
        require(_reservePool != address(0), "Invalid reserve pool");
        
        rwaWallet = _rwaWallet;
        liquidityPool = _liquidityPool;
        reservePool = _reservePool;
        
        emit WalletsUpdated(_rwaWallet, _liquidityPool, _reservePool);
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
     * ║                 DEPOSIT FLOW (Whitepaper V2.5)                ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  1. User deposits N USDT                                      ║
     * ║  2. Split funds:                                              ║
     * ║     - 40% (N * 0.4) → RWA Wallet (Tranche A)                 ║
     * ║     - 50% (N * 0.5) → Liquidity Pool (Tranche B)             ║
     * ║     - 10% (N * 0.1) → Reserve Pool (Tranche C)               ║
     * ║  3. Mint Bond NFT with:                                       ║
     * ║     - principal = N * 50% (ONLY Tranche B)                   ║
     * ║     - bondPower = principal (initial, no bonus)              ║
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
        
        // Calculate split amounts (Whitepaper V2.5 compliant)
        uint256 toRWA = (amount * RWA_RATE) / BASIS_POINTS;           // 40% - Tranche A
        uint256 toLiquidity = (amount * LIQUIDITY_RATE) / BASIS_POINTS; // 50% - Tranche B
        uint256 toReserve = (amount * RESERVE_RATE) / BASIS_POINTS;   // 10% - Tranche C
        
        // Execute the 40/50/10 split
        paymentToken.safeTransfer(rwaWallet, toRWA);
        paymentToken.safeTransfer(liquidityPool, toLiquidity);
        paymentToken.safeTransfer(reservePool, toReserve);
        
        // Mint Bond NFT
        uint256 tokenId = _nextTokenId++;
        _safeMint(user, tokenId);
        
        // Record bond data
        // CRITICAL: principal = 50% of deposit (ONLY Tranche B)
        uint256 principal = toLiquidity;  // 50% of deposit
        uint256 bondPower = principal;    // Initial bond power = principal (no bonus)
        
        bondData[tokenId] = BondInfo({
            depositTime: block.timestamp,
            totalDeposited: amount,
            principal: principal,
            bondPower: bondPower,
            compoundedAmount: 0
        });
        
        // Update global stats
        totalDeposits += amount;
        totalBondPower += bondPower;
        totalBonds++;
        
        emit BondMinted(user, tokenId, amount, principal, bondPower, toRWA, toLiquidity, toReserve);
        
        return tokenId;
    }

    /**
     * @dev Compound mining rewards into a Bond NFT
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              COMPOUND MECHANISM (Whitepaper V2.5)             ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Whitepaper Quote:                                            ║
     * ║  "将挖矿产出的 VIVY 复投进 Bond NFT...                         ║
     * ║   系统仅对复投部分的资金给予 10% 的算力加成"                    ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Formula: newBondPower = oldBondPower + (amount * 110 / 100)  ║
     * ║  Example: Compound 1000 → Gain 1100 bond power                ║
     * ╚═══════════════════════════════════════════════════════════════╝
     * 
     * @param tokenId The Bond NFT to compound into
     * @param amount Amount of USDT equivalent to compound
     */
    function compound(uint256 tokenId, uint256 amount) external nonReentrant {
        require(_ownerOf(tokenId) == msg.sender, "Not bond owner");
        require(amount > 0, "Amount must be > 0");
        require(address(paymentToken) != address(0), "Payment token not set");
        
        // Transfer USDT from user (compound requires actual funds)
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Split compound funds same as deposit (40/50/10)
        uint256 toRWA = (amount * RWA_RATE) / BASIS_POINTS;
        uint256 toLiquidity = (amount * LIQUIDITY_RATE) / BASIS_POINTS;
        uint256 toReserve = (amount * RESERVE_RATE) / BASIS_POINTS;
        
        paymentToken.safeTransfer(rwaWallet, toRWA);
        paymentToken.safeTransfer(liquidityPool, toLiquidity);
        paymentToken.safeTransfer(reservePool, toReserve);
        
        // Calculate bonus power (110% of the 50% principal portion)
        // Whitepaper: "复投部分的资金给予 10% 的算力加成"
        uint256 principalPortion = toLiquidity;  // 50% of compound amount
        uint256 bonusPower = (principalPortion * COMPOUND_BONUS) / COMPOUND_BASE;
        
        // Update bond data
        BondInfo storage bond = bondData[tokenId];
        
        bond.totalDeposited += amount;
        bond.principal += principalPortion;
        bond.bondPower += bonusPower;
        bond.compoundedAmount += amount;
        
        // Update global stats
        totalDeposits += amount;
        totalBondPower += bonusPower;
        
        emit BondCompounded(tokenId, amount, bonusPower, bond.bondPower);
    }

    // ============ View Functions ============

    /**
     * @dev Get bond information by token ID
     * @param tokenId The Bond NFT token ID
     * @return depositTime Timestamp when bond was created
     * @return totalDeposited Total USDT deposited
     * @return principal Mining principal (50% of deposit)
     * @return bondPower Current mining power
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
     * @dev Get total principal for a user (sum of all their Bond NFTs)
     * @param user User address
     * @return Total principal across all owned Bond NFTs
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
     * @dev Get total deposited for a user (sum of all their Bond NFTs)
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
     * @param user User address
     * @return totalDeposited Total amount deposited by user
     * @return miningPrincipal Amount allocated to mining (50% - Tranche B)
     * @return rwaAssets Amount allocated to RWA (40% - Tranche A)
     * @return reserveAmount Amount allocated to reserve (10% - Tranche C)
     * @return effectiveMiningPower Total bond power (with compound bonuses)
     */
    function getFundAllocation(address user) external view returns (
        uint256 totalDeposited,
        uint256 miningPrincipal,
        uint256 rwaAssets,
        uint256 reserveAmount,
        uint256 effectiveMiningPower
    ) {
        uint256 balance = balanceOf(user);
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            BondInfo memory bond = bondData[tokenId];
            totalDeposited += bond.totalDeposited;
            miningPrincipal += bond.principal;
            effectiveMiningPower += bond.bondPower;
        }
        
        // Calculate RWA and Reserve from total deposited
        rwaAssets = (totalDeposited * RWA_RATE) / BASIS_POINTS;
        reserveAmount = (totalDeposited * RESERVE_RATE) / BASIS_POINTS;
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
     * @return _totalBondPower Total bond power
     * @return _totalBonds Total number of Bond NFTs minted
     */
    function getStats() external view returns (
        uint256 _totalDeposits,
        uint256 _totalBondPower,
        uint256 _totalBonds
    ) {
        return (totalDeposits, totalBondPower, totalBonds);
    }

    /**
     * @dev Get distribution wallet addresses
     */
    function getWallets() external view returns (
        address _rwaWallet,
        address _liquidityPool,
        address _reservePool
    ) {
        return (rwaWallet, liquidityPool, reservePool);
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
}
