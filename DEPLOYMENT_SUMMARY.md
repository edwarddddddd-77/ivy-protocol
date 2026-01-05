# Ivy Protocol - BSC Testnet Deployment Summary

**Date:** 2026-01-06
**Network:** BSC Testnet (Chain ID: 97)
**Deployer Address:** `0x1f9E611B492929b25565268f426396BF7C08EB26`
**Deployer Balance:** 0.31 BNB

---

## Deployed Contract Addresses

| Contract | Address | BSCScan Link |
|----------|---------|--------------|
| **MockUSDT** | `0xdF07B56606fF2625d6dAE0AfcE27bfd5836e5B64` | [View](https://testnet.bscscan.com/address/0xdF07B56606fF2625d6dAE0AfcE27bfd5836e5B64) |
| **MockOracle** | `0x05431db855Be3b1597e9344b0F0127b40DBB16C3` | [View](https://testnet.bscscan.com/address/0x05431db855Be3b1597e9344b0F0127b40DBB16C3) |
| **GenesisNode** | `0x2E2b5E602D6a2F6DB616aFe7c7a9bF522aD9Cb70` | [View](https://testnet.bscscan.com/address/0x2E2b5E602D6a2F6DB616aFe7c7a9bF522aD9Cb70) |
| **IvyToken** | `0x83cEbd8b7DDd6536FB05CB19D5DF97fa94867f98` | [View](https://testnet.bscscan.com/address/0x83cEbd8b7DDd6536FB05CB19D5DF97fa94867f98) |
| **IvyCore** | `0xf607EEf5390298D66F5B6Ef22C81515Add90B06b` | [View](https://testnet.bscscan.com/address/0xf607EEf5390298D66F5B6Ef22C81515Add90B06b) |
| **IvyBond** | `0x8C3e30B1d21Bd2a89d16613f546dD384FCD1d029` | [View](https://testnet.bscscan.com/address/0x8C3e30B1d21Bd2a89d16613f546dD384FCD1d029) |
| **DividendPool** | `0xAD40B6F238FdD52cA73DC9bc420e046237CD582A` | [View](https://testnet.bscscan.com/address/0xAD40B6F238FdD52cA73DC9bc420e046237CD582A) |
| **Photosynthesis** | `0x48133Dcc12F53359e0413E4C3A1C73D91Ad26F94` | [View](https://testnet.bscscan.com/address/0x48133Dcc12F53359e0413E4C3A1C73D91Ad26F94) |

---

## Initial Configuration

### Wallet Addresses (All set to deployer for testnet)
- **DAO Treasury:** `0x1f9E611B492929b25565268f426396BF7C08EB26`
- **RWA Wallet (40%):** `0x1f9E611B492929b25565268f426396BF7C08EB26`
- **Liquidity Pool (50%):** `0x1f9E611B492929b25565268f426396BF7C08EB26`
- **Reserve Pool (10%):** `0x1f9E611B492929b25565268f426396BF7C08EB26`
- **Operations Wallet:** `0x1f9E611B492929b25565268f426396BF7C08EB26`

### PancakeSwap Router
- **Address:** `0xD99D1c33F9fC3444f8101754aBC46c52416550D1`

### Initial State
- **IVY Pre-mint:** 30,000,000 IVY minted to Operations Wallet
- **Initial IVY Price:** 1 USDT (set in MockOracle)
- **Tax Rate:** 0.2% (0.1% burn + 0.1% operations)
- **Golden Pivot:** 21,000,000 IVY

---

## Manual Verification Instructions

Due to network connectivity issues with BSCScan API, contracts need to be verified manually. Here are the verification commands:

### 1. MockUSDT
```bash
npx hardhat verify --network bscTestnet 0xdF07B56606fF2625d6dAE0AfcE27bfd5836e5B64
```

### 2. MockOracle
```bash
npx hardhat verify --network bscTestnet 0x05431db855Be3b1597e9344b0F0127b40DBB16C3 "1000000000000000000"
```

### 3. GenesisNode
```bash
npx hardhat verify --network bscTestnet 0x2E2b5E602D6a2F6DB616aFe7c7a9bF522aD9Cb70 "0x1f9E611B492929b25565268f426396BF7C08EB26"
```

### 4. IvyToken
```bash
npx hardhat verify --network bscTestnet 0x83cEbd8b7DDd6536FB05CB19D5DF97fa94867f98 "0x1f9E611B492929b25565268f426396BF7C08EB26"
```

### 5. IvyCore
```bash
npx hardhat verify --network bscTestnet 0xf607EEf5390298D66F5B6Ef22C81515Add90B06b "0x83cEbd8b7DDd6536FB05CB19D5DF97fa94867f98"
```

### 6. IvyBond
```bash
npx hardhat verify --network bscTestnet 0x8C3e30B1d21Bd2a89d16613f546dD384FCD1d029 "0x1f9E611B492929b25565268f426396BF7C08EB26" "0x1f9E611B492929b25565268f426396BF7C08EB26" "0x1f9E611B492929b25565268f426396BF7C08EB26"
```

### 7. DividendPool
```bash
npx hardhat verify --network bscTestnet 0xAD40B6F238FdD52cA73DC9bc420e046237CD582A "0xdF07B56606fF2625d6dAE0AfcE27bfd5836e5B64" "0x8C3e30B1d21Bd2a89d16613f546dD384FCD1d029"
```

### 8. Photosynthesis
```bash
npx hardhat verify --network bscTestnet 0x48133Dcc12F53359e0413E4C3A1C73D91Ad26F94 "0xdF07B56606fF2625d6dAE0AfcE27bfd5836e5B64" "0x83cEbd8b7DDd6536FB05CB19D5DF97fa94867f98" "0xD99D1c33F9fC3444f8101754aBC46c52416550D1"
```

---

## Alternative: Manual Verification via BSCScan UI

If CLI verification continues to fail, you can verify manually through the BSCScan website:

1. Visit https://testnet.bscscan.com/
2. Navigate to each contract address
3. Click "Contract" tab → "Verify and Publish"
4. Select:
   - Compiler Type: Solidity (Single file)
   - Compiler Version: v0.8.20
   - License Type: MIT
5. Copy the contract source code from `contracts/` folder
6. Submit for verification

---

## Key Features Implemented

### 21M Golden Pivot Mechanism
- **Before 21M supply:** Burns active (0.1% tax → burn, yields → buyback & burn)
- **After 21M supply:** Burns stopped (0.1% tax → operations wallet, yields → dividends)

### Redemption System
- **Lock Period:** 180 days from deposit
- **Redeemable Amount:** 40% RWA principal only (interest not returned)
- **Function:** `IvyBond.redeem(tokenId)`

### Dividend Distribution
- **Recipients:** Bond NFT holders (pro-rata by power)
- **Sources:** RWA interest, Reserve interest, InstantCashOut penalty (post-21M)
- **Calculation:** Power = 50% LP portion of deposit

### Pre-mint Distribution
- **Total:** 30M IVY (currently in Operations Wallet)
- **Split:** 15M DAO + 10M Airdrop + 5M Liquidity
- **Function:** `IvyToken.distributePreMint(daoWallet, airdropWallet, liquidityWallet)` (one-time only)

---

## Next Steps

1. **Verify Contracts:** Run verification commands when BSCScan API is accessible
2. **Update Frontend:** Contract addresses already saved to `client/src/contracts/addresses.json`
3. **Test Core Functions:**
   - Deposit USDT → Mint Bond NFT
   - Claim mining rewards
   - Test instant cash-out (50% penalty)
   - Test redeem after 180 days
   - Process RWA yield (buyback vs dividends)
4. **Distribute Pre-mint:** Call `distributePreMint()` when ready to split 30M IVY

---

## Important Notes

- **Security:** Private key exposed in `.env` - rotate before mainnet
- **RWA Wallet:** Currently set to deployer - should be separate secure wallet
- **Price Oracle:** Using MockOracle for testnet - switch to Chainlink for mainnet
- **USDT:** Using MockUSDT for testnet - use real USDT for mainnet

---

## Contract Interaction Examples

### Deposit & Mint Bond NFT
```javascript
// Approve USDT
await mockUSDT.approve(ivyCoreAddress, amount);

// Deposit (creates Bond NFT)
await ivyCore.deposit(amount, referrer);
```

### Claim Mining Rewards
```javascript
await ivyCore.claim();
```

### Check Dividend Balance
```javascript
const pending = await dividendPool.pendingDividend(userAddress);
```

### Claim Dividends
```javascript
await dividendPool.claimDividend();
```

### Process RWA Yield (Keeper only)
```javascript
// Approve USDT from RWA wallet first
await mockUSDT.approve(photosynthesisAddress, amount);

// Process yield (auto-routes based on market condition)
await photosynthesis.processRwaYield(amount);
```

---

## Troubleshooting

### If verification fails:
1. Check internet connection
2. Verify BSCScan API key is correct
3. Try again later (BSCScan API may be temporarily down)
4. Use manual verification through BSCScan UI

### If transactions fail:
1. Check account has enough BNB for gas
2. Verify contract addresses are correct
3. Check approvals are set correctly
4. Review transaction error message on BSCScan

---

**Deployment Status:** ✅ Successful
**Verification Status:** ⏳ Pending (network timeout - retry later)
