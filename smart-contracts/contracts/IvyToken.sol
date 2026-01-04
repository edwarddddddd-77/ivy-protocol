// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IvyToken
 * @dev IVY Token with Transfer Tax (Whitepaper P10)
 * 
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║              TOKEN TAX MECHANISM (Whitepaper P10)             ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Total Tax: 0.2% on transfers/sells                           ║
 * ║  - 0.1% → Burn (0xdead)                                       ║
 * ║  - 0.1% → Operations Wallet                                   ║
 * ║                                                               ║
 * ║  Whitelist (No Tax):                                          ║
 * ║  - IvyBond (compound operations)                              ║
 * ║  - IvyCore (mining rewards)                                   ║
 * ║  - Uniswap Router (liquidity operations)                      ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
contract IvyToken is ERC20, Ownable {
    
    // ============ Tax Constants ============
    
    /// @notice Total tax rate: 0.2% = 20 basis points
    uint256 public constant TAX_RATE = 20;
    
    /// @notice Burn rate: 0.1% = 10 basis points
    uint256 public constant BURN_RATE = 10;
    
    /// @notice Operations rate: 0.1% = 10 basis points
    uint256 public constant OPS_RATE = 10;
    
    /// @notice Basis points denominator
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Dead address for burns
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // ============ Tokenomics Constants ============
    
    /// @notice Total supply cap: 100,000,000 IVY
    uint256 public constant TOTAL_SUPPLY_CAP = 100_000_000 * 10**18;
    
    /// @notice Pre-mint allocation for Marketing/Treasury: 30,000,000 IVY
    /// @dev This is minted at deployment to OperationsWallet, NOT through mining
    uint256 public constant PRE_MINT_AMOUNT = 30_000_000 * 10**18;
    
    /// @notice Mining allocation: 70,000,000 IVY (minted via IvyCore)
    uint256 public constant MINING_ALLOCATION = 70_000_000 * 10**18;
    
    // ============ State Variables ============
    
    /// @notice Minter address (IvyCore)
    address public minter;
    
    /// @notice Operations wallet for tax collection
    address public operationsWallet;
    
    /// @notice Addresses excluded from tax (whitelist)
    mapping(address => bool) public isExcludedFromTax;
    
    /// @notice Total IVY burned via tax
    uint256 public totalBurned;
    
    /// @notice Total IVY sent to operations via tax
    uint256 public totalOpsCollected;
    
    // ============ Events ============
    
    event TaxCollected(address indexed from, address indexed to, uint256 burnAmount, uint256 opsAmount);
    event ExcludedFromTax(address indexed account, bool excluded);
    event OperationsWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);
    
    // ============ Constructor ============
    
    /**
     * @dev Initialize IvyToken with pre-mint allocation
     * @param _operationsWallet Address to receive 30M pre-minted IVY (Marketing/Treasury)
     * 
     * ╔═══════════════════════════════════════════════════════════════╗
     * ║              TOKENOMICS DISTRIBUTION                          ║
     * ╠═══════════════════════════════════════════════════════════════╣
     * ║  Total Supply:     100,000,000 IVY (100M)                     ║
     * ║  Pre-mint:          30,000,000 IVY (30M) → OperationsWallet   ║
     * ║  Mining:            70,000,000 IVY (70M) → Via IvyCore        ║
     * ╚═══════════════════════════════════════════════════════════════╝
     */
    constructor(address _operationsWallet) ERC20("Ivy Protocol", "IVY") Ownable(msg.sender) {
        require(_operationsWallet != address(0), "Invalid operations wallet");
        
        // Set operations wallet
        operationsWallet = _operationsWallet;
        
        // Owner is excluded from tax by default
        isExcludedFromTax[msg.sender] = true;
        // Dead address excluded (no tax on burns)
        isExcludedFromTax[DEAD_ADDRESS] = true;
        // Operations wallet excluded from tax
        isExcludedFromTax[_operationsWallet] = true;
        
        // Pre-mint 30M IVY to Operations Wallet (Marketing/Treasury)
        // This allocation is NOT subject to PID algorithm or mining mechanics
        _mint(_operationsWallet, PRE_MINT_AMOUNT);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Set minter address (IvyCore)
     */
    function setMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Invalid minter");
        address oldMinter = minter;
        minter = _minter;
        // Auto-exclude minter from tax
        isExcludedFromTax[_minter] = true;
        emit MinterUpdated(oldMinter, _minter);
    }
    
    /**
     * @dev Set operations wallet for tax collection
     */
    function setOperationsWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid wallet");
        address oldWallet = operationsWallet;
        operationsWallet = _wallet;
        // Auto-exclude ops wallet from tax
        isExcludedFromTax[_wallet] = true;
        emit OperationsWalletUpdated(oldWallet, _wallet);
    }
    
    /**
     * @dev Set tax exclusion status for an address
     * @param account Address to update
     * @param excluded True to exclude from tax, false to include
     */
    function setExcludedFromTax(address account, bool excluded) external onlyOwner {
        require(account != address(0), "Invalid address");
        isExcludedFromTax[account] = excluded;
        emit ExcludedFromTax(account, excluded);
    }
    
    /**
     * @dev Batch set tax exclusion for multiple addresses
     * @param accounts Array of addresses
     * @param excluded True to exclude all from tax
     */
    function batchSetExcludedFromTax(address[] calldata accounts, bool excluded) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Invalid address");
            isExcludedFromTax[accounts[i]] = excluded;
            emit ExcludedFromTax(accounts[i], excluded);
        }
    }
    
    // ============ Minting Functions ============
    
    /**
     * @dev Mint new tokens (only callable by minter)
     * @notice Mining is capped at MINING_ALLOCATION (70M IVY)
     * @notice Total supply is capped at TOTAL_SUPPLY_CAP (100M IVY)
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Not minter");
        require(totalSupply() + amount <= TOTAL_SUPPLY_CAP, "Exceeds total supply cap");
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from caller
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Burn tokens from account (only callable by minter)
     */
    function burnFrom(address account, uint256 amount) external {
        require(msg.sender == minter, "Not minter");
        _burn(account, amount);
    }
    
    // ============ Transfer Override with Tax ============
    
    /**
     * @dev Override _update to implement transfer tax
     * 
     * Tax Logic:
     * - If sender OR recipient is excluded → No tax
     * - Otherwise → 0.2% tax (0.1% burn + 0.1% ops)
     * 
     * Note: Using _update instead of _transfer for OpenZeppelin v5 compatibility
     */
    function _update(address from, address to, uint256 amount) internal virtual override {
        // Skip tax for minting (from == 0) and burning (to == 0)
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            return;
        }
        
        // Skip tax if sender or recipient is excluded
        if (isExcludedFromTax[from] || isExcludedFromTax[to]) {
            super._update(from, to, amount);
            return;
        }
        
        // Calculate tax amounts
        uint256 burnAmount = (amount * BURN_RATE) / BASIS_POINTS;     // 0.1%
        uint256 opsAmount = (amount * OPS_RATE) / BASIS_POINTS;       // 0.1%
        uint256 transferAmount = amount - burnAmount - opsAmount;     // 99.8%
        
        // Execute transfers
        // 1. Send burn amount to dead address
        if (burnAmount > 0) {
            super._update(from, DEAD_ADDRESS, burnAmount);
            totalBurned += burnAmount;
        }
        
        // 2. Send ops amount to operations wallet
        if (opsAmount > 0 && operationsWallet != address(0)) {
            super._update(from, operationsWallet, opsAmount);
            totalOpsCollected += opsAmount;
        }
        
        // 3. Send remaining to recipient
        super._update(from, to, transferAmount);
        
        emit TaxCollected(from, to, burnAmount, opsAmount);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get tax stats
     */
    function getTaxStats() external view returns (
        uint256 _totalBurned,
        uint256 _totalOpsCollected,
        uint256 _taxRate,
        address _operationsWallet
    ) {
        _totalBurned = totalBurned;
        _totalOpsCollected = totalOpsCollected;
        _taxRate = TAX_RATE;
        _operationsWallet = operationsWallet;
    }
    
    /**
     * @dev Check if address is excluded from tax
     */
    function checkExcluded(address account) external view returns (bool) {
        return isExcludedFromTax[account];
    }
    
    /**
     * @dev Calculate tax for a given amount (for UI preview)
     */
    function calculateTax(uint256 amount) external pure returns (
        uint256 burnAmount,
        uint256 opsAmount,
        uint256 netAmount
    ) {
        burnAmount = (amount * BURN_RATE) / BASIS_POINTS;
        opsAmount = (amount * OPS_RATE) / BASIS_POINTS;
        netAmount = amount - burnAmount - opsAmount;
    }
}
