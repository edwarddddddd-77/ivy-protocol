// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GenesisNode
 * @dev ERC721 NFT Contract - Identity Layer of Ivy Protocol
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                    GENESIS NODE SPECS                         ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Max Supply:     1,386 (Hard Cap)                             ║
 * ║  Price:          1,000 USDT                                   ║
 * ║  Fund Flow:      100% → TeamOpsWallet (NO SPLIT)              ║
 * ║  Self Boost:     10% (1000 basis points)                      ║
 * ║  Team Aura:      2% (200 basis points)                        ║
 * ╚═══════════════════════════════════════════════════════════════╝
 * 
 * This contract handles:
 * - NFT minting with USDT payment
 * - Referral relationship binding
 * - Boost calculations for mining rewards
 */
contract GenesisNode is ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Constants ============
    
    /// @notice Maximum supply of Genesis Nodes (HARD CAP)
    uint256 public constant MAX_SUPPLY = 1386;
    
    /// @notice Price per Genesis Node in USDT (1000 USDT with 18 decimals)
    uint256 public constant NODE_PRICE = 1000 * 10**18;
    
    /// @notice Self boost for NFT holders (10% = 1000 basis points)
    uint256 public constant SELF_BOOST = 1000;  // 10%
    
    /// @notice Team aura boost for downline (2% = 200 basis points)
    uint256 public constant TEAM_AURA = 200;    // 2%
    
    /// @notice Basis points denominator
    uint256 public constant BASIS_POINTS = 10000;

    // ============ State Variables ============
    
    /// @notice Payment token (USDT)
    IERC20 public paymentToken;
    
    /// @notice Team operations wallet - receives 100% of sales
    address public teamOpsWallet;
    
    /// @notice Token ID counter
    uint256 private _nextTokenId;
    
    /// @notice Base URI for token metadata
    string private _baseTokenURI;
    
    /// @notice Referral relationships: user => referrer (upline)
    mapping(address => address) public referrers;
    
    /// @notice Direct referral count: referrer => count of direct downlines
    mapping(address => uint256) public directReferralCount;
    
    /// @notice Total sales volume
    uint256 public totalSalesVolume;

    // ============ Events ============
    
    event NodeMinted(
        address indexed buyer, 
        uint256 indexed tokenId, 
        address indexed referrer, 
        uint256 price
    );
    event ReferrerBound(address indexed user, address indexed referrer);
    event PaymentTokenSet(address indexed token);
    event TeamOpsWalletSet(address indexed wallet);
    event BaseURISet(string baseURI);

    // ============ Constructor ============
    
    /**
     * @dev Initialize the Genesis Node contract
     * @param _teamOpsWallet Address to receive 100% of sales proceeds
     */
    constructor(address _teamOpsWallet) 
        ERC721("Ivy Genesis Node", "IVY-NODE") 
        Ownable(msg.sender) 
    {
        require(_teamOpsWallet != address(0), "Invalid TeamOps wallet");
        teamOpsWallet = _teamOpsWallet;
    }

    // ============ Admin Functions ============
    
    /**
     * @dev Set the payment token address (USDT)
     * @param _paymentToken Address of the ERC20 token to accept as payment
     */
    function setPaymentToken(address _paymentToken) external onlyOwner {
        require(_paymentToken != address(0), "Invalid token address");
        paymentToken = IERC20(_paymentToken);
        emit PaymentTokenSet(_paymentToken);
    }

    /**
     * @dev Update the TeamOps wallet address
     * @param _teamOpsWallet New wallet address
     */
    function setTeamOpsWallet(address _teamOpsWallet) external onlyOwner {
        require(_teamOpsWallet != address(0), "Invalid wallet address");
        teamOpsWallet = _teamOpsWallet;
        emit TeamOpsWalletSet(_teamOpsWallet);
    }

    /**
     * @dev Set the base URI for token metadata
     * @param baseURI New base URI
     */
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURISet(baseURI);
    }

    /**
     * @dev Admin function to manually set referrer (for migration/correction)
     * @param user User address
     * @param referrer Referrer address
     */
    function setReferrer(address user, address referrer) external onlyOwner {
        require(referrers[user] == address(0), "Referrer already set");
        require(referrer != user, "Cannot self-refer");
        referrers[user] = referrer;
        directReferralCount[referrer]++;
        emit ReferrerBound(user, referrer);
    }
    
    /// @notice IvyBond contract address (authorized to bind referrers)
    address public ivyBond;
    
    /**
     * @dev Set the IvyBond contract address (authorized to bind referrers on deposit)
     * @param _ivyBond Address of the IvyBond contract
     */
    function setIvyBond(address _ivyBond) external onlyOwner {
        require(_ivyBond != address(0), "Invalid IvyBond address");
        ivyBond = _ivyBond;
    }
    
    /**
     * @dev Bind referrer from IvyBond deposit (called by IvyBond contract)
     * This allows users who skip NFT purchase to still have referral relationships
     * @param user User address
     * @param referrer Referrer address
     */
    function bindReferrerFromBond(address user, address referrer) external {
        require(msg.sender == ivyBond, "Only IvyBond can call");
        require(referrers[user] == address(0), "Referrer already set");
        require(referrer != user, "Cannot self-refer");
        require(referrer != address(0), "Invalid referrer");
        
        referrers[user] = referrer;
        directReferralCount[referrer]++;
        emit ReferrerBound(user, referrer);
    }

    // ============ Core Functions ============

    /**
     * @dev Internal function to return base URI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Mint a Genesis Node NFT
     * 
     * Flow:
     * 1. Check max supply not exceeded
     * 2. Check payment token is set
     * 3. Transfer USDT from buyer to contract
     * 4. Transfer 100% to TeamOpsWallet (NO SPLIT)
     * 5. Bind referrer relationship (if first time and valid)
     * 6. Mint NFT to buyer
     * 
     * @param referrer Address of the referrer (can be address(0) for no referrer)
     */
    function mint(address referrer) external nonReentrant {
        require(_nextTokenId < MAX_SUPPLY, "Max supply reached");
        require(address(paymentToken) != address(0), "Payment token not set");
        
        address buyer = msg.sender;
        
        // Step 1: Transfer USDT from buyer
        paymentToken.safeTransferFrom(buyer, address(this), NODE_PRICE);
        
        // Step 2: Transfer 100% to TeamOpsWallet (NO SPLIT - per spec)
        paymentToken.safeTransfer(teamOpsWallet, NODE_PRICE);
        
        // Step 3: Bind referrer (only if not already bound and valid)
        if (referrers[buyer] == address(0) && referrer != address(0) && referrer != buyer) {
            referrers[buyer] = referrer;
            directReferralCount[referrer]++;
            emit ReferrerBound(buyer, referrer);
        }
        
        // Step 4: Mint NFT
        uint256 tokenId = _nextTokenId++;
        _safeMint(buyer, tokenId);
        
        // Update stats
        totalSalesVolume += NODE_PRICE;
        
        emit NodeMinted(buyer, tokenId, referrer, NODE_PRICE);
    }

    // ============ View Functions - Boost Calculations ============

    /**
     * @dev Get self boost for a user (10% if holds NFT, 0 otherwise)
     * @param user User address
     * @return Boost in basis points (1000 = 10%)
     */
    function getSelfBoost(address user) external view returns (uint256) {
        return balanceOf(user) > 0 ? SELF_BOOST : 0;
    }

    /**
     * @dev Get team aura boost from upline
     * If user's referrer holds a Genesis Node, user gets +2% boost
     * @param user User address
     * @return Boost in basis points (200 = 2%)
     */
    function getTeamAura(address user) external view returns (uint256) {
        address upline = referrers[user];
        if (upline == address(0)) return 0;
        return balanceOf(upline) > 0 ? TEAM_AURA : 0;
    }

    /**
     * @dev Get total boost for a user (selfBoost + teamAura)
     * @param user User address
     * @return Total boost in basis points
     */
    function getTotalBoost(address user) external view returns (uint256) {
        uint256 selfBoost = balanceOf(user) > 0 ? SELF_BOOST : 0;
        
        address upline = referrers[user];
        uint256 teamAura = 0;
        if (upline != address(0) && balanceOf(upline) > 0) {
            teamAura = TEAM_AURA;
        }
        
        return selfBoost + teamAura;
    }

    /**
     * @dev Get referrer (upline) of a user
     * @param user User address
     * @return Referrer address
     */
    function getReferrer(address user) external view returns (address) {
        return referrers[user];
    }

    /**
     * @dev Check if user has a referrer bound
     * @param user User address
     * @return True if referrer is bound
     */
    function hasReferrer(address user) external view returns (bool) {
        return referrers[user] != address(0);
    }

    /**
     * @dev Get user info for frontend display
     * @param user User address
     * @return nftBalance Number of NFTs held
     * @return referrer Referrer address
     * @return directDownlines Number of direct referrals
     * @return selfBoost Self boost in basis points
     * @return teamAura Team aura boost in basis points
     * @return totalBoost Total boost in basis points
     */
    function getUserInfo(address user) external view returns (
        uint256 nftBalance,
        address referrer,
        uint256 directDownlines,
        uint256 selfBoost,
        uint256 teamAura,
        uint256 totalBoost
    ) {
        nftBalance = balanceOf(user);
        referrer = referrers[user];
        directDownlines = directReferralCount[user];
        selfBoost = nftBalance > 0 ? SELF_BOOST : 0;
        
        if (referrer != address(0) && balanceOf(referrer) > 0) {
            teamAura = TEAM_AURA;
        }
        
        totalBoost = selfBoost + teamAura;
    }

    /**
     * @dev Get contract stats
     * @return currentSupply Current number of minted NFTs
     * @return maxSupply Maximum supply (1386)
     * @return price Price per NFT in USDT
     * @return totalVolume Total sales volume
     */
    function getContractStats() external view returns (
        uint256 currentSupply,
        uint256 maxSupply,
        uint256 price,
        uint256 totalVolume
    ) {
        return (_nextTokenId, MAX_SUPPLY, NODE_PRICE, totalSalesVolume);
    }

    /**
     * @dev Check if user has approved enough tokens for minting
     * @param user User address
     * @return True if approved amount >= NODE_PRICE
     */
    function hasApprovedMint(address user) external view returns (bool) {
        if (address(paymentToken) == address(0)) return false;
        return paymentToken.allowance(user, address(this)) >= NODE_PRICE;
    }
}
