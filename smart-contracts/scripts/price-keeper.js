/**
 * Price Keeper Bot - Automatically updates IvyCore prices from Oracle
 *
 * Usage:
 *   node scripts/price-keeper.js
 *
 * Environment variables required:
 *   - KEEPER_PRIVATE_KEY: Private key of the keeper wallet
 *   - BSC_RPC_URL: BSC mainnet RPC endpoint
 *   - IVY_CORE_ADDRESS: Deployed IvyCore contract address
 */

import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const CONFIG = {
  // Update interval (1 hour = 3600000 ms)
  UPDATE_INTERVAL: 3600000,

  // Gas settings
  GAS_LIMIT: 500000,
  MAX_FEE_PER_GAS: ethers.parseUnits("5", "gwei"), // Max 5 gwei

  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 30000, // 30 seconds
};

class PriceKeeper {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.ivyCore = null;
    this.isRunning = false;
  }

  /**
   * Initialize keeper
   */
  async initialize() {
    console.log("🤖 Initializing Price Keeper...");
    console.log("=".repeat(70));

    // Check environment variables
    if (!process.env.KEEPER_PRIVATE_KEY) {
      throw new Error("❌ KEEPER_PRIVATE_KEY not set in .env");
    }
    if (!process.env.IVY_CORE_ADDRESS) {
      throw new Error("❌ IVY_CORE_ADDRESS not set in .env");
    }

    // Connect to BSC
    const network = await ethers.provider.getNetwork();
    console.log(`📡 Connected to network: ${network.name} (chainId: ${network.chainId})`);

    // Setup wallet
    this.wallet = new ethers.Wallet(process.env.KEEPER_PRIVATE_KEY, ethers.provider);
    const balance = await ethers.provider.getBalance(this.wallet.address);

    console.log(`\n👛 Keeper Wallet:`);
    console.log(`   Address: ${this.wallet.address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} BNB`);

    if (balance < ethers.parseEther("0.01")) {
      console.warn(`\n⚠️  WARNING: Low BNB balance (${ethers.formatEther(balance)} BNB)`);
      console.warn(`   Please fund the keeper wallet for gas fees`);
    }

    // Load IvyCore contract
    const IvyCore = await ethers.getContractFactory("IvyCore");
    this.ivyCore = IvyCore.attach(process.env.IVY_CORE_ADDRESS).connect(this.wallet);

    console.log(`\n📄 IvyCore Contract: ${await this.ivyCore.getAddress()}`);

    // Check contract status
    const testMode = await this.ivyCore.testMode();
    const oracleAddress = await this.ivyCore.oracle();

    console.log(`\n⚙️  Contract Status:`);
    console.log(`   Test Mode: ${testMode ? "✅ Enabled (Testnet)" : "❌ Disabled (Mainnet)"}`);
    console.log(`   Oracle: ${oracleAddress}`);

    if (testMode) {
      console.warn(`\n⚠️  WARNING: Contract is in TEST MODE`);
      console.warn(`   Price keeper will update prices from Oracle, but manual updates are also allowed`);
    }

    if (oracleAddress === ethers.ZeroAddress) {
      throw new Error("❌ Oracle not set in IvyCore contract");
    }

    console.log("\n✅ Initialization complete");
    console.log("=".repeat(70));
  }

  /**
   * Update prices from Oracle
   */
  async updatePrices(retryCount = 0) {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] 🔄 Updating prices from Oracle...`);

    try {
      // Get current prices (for logging)
      const currentPrice = await this.ivyCore.currentPrice();
      const testMode = await this.ivyCore.testMode();

      console.log(`   Current price: $${ethers.formatEther(currentPrice)}`);
      console.log(`   Mode: ${testMode ? "Test" : "Mainnet"}`);

      // Call updatePrices (parameters ignored in mainnet mode)
      const tx = await this.ivyCore.updatePrices(0, 0, 0, {
        gasLimit: CONFIG.GAS_LIMIT,
        maxFeePerGas: CONFIG.MAX_FEE_PER_GAS,
      });

      console.log(`   📤 Transaction sent: ${tx.hash}`);
      console.log(`   ⏳ Waiting for confirmation...`);

      const receipt = await tx.wait();

      // Get updated prices
      const newPrice = await this.ivyCore.currentPrice();
      const ma30Price = await this.ivyCore.ma30Price();
      const price1hAgo = await this.ivyCore.price1hAgo();

      console.log(`   ✅ Transaction confirmed (block ${receipt.blockNumber})`);
      console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`\n   📊 Updated Prices:`);
      console.log(`      Current: $${ethers.formatEther(newPrice)}`);
      console.log(`      MA30: $${ethers.formatEther(ma30Price)}`);
      console.log(`      1h ago: $${ethers.formatEther(price1hAgo)}`);

      // Calculate price change
      if (currentPrice > 0n) {
        const changePercent = ((newPrice - currentPrice) * 10000n) / currentPrice;
        const changeStr = changePercent >= 0n ? `+${changePercent}` : `${changePercent}`;
        console.log(`      Change: ${changeStr / 100n}.${Math.abs(Number(changePercent % 100n))}%`);
      }

      return true;

    } catch (error) {
      console.error(`   ❌ Update failed: ${error.message}`);

      // Retry logic
      if (retryCount < CONFIG.MAX_RETRIES) {
        console.log(`   🔄 Retrying in ${CONFIG.RETRY_DELAY / 1000}s... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
        await this.sleep(CONFIG.RETRY_DELAY);
        return this.updatePrices(retryCount + 1);
      } else {
        console.error(`   ❌ Max retries reached. Skipping this update.`);
        return false;
      }
    }
  }

  /**
   * Start keeper loop
   */
  async start() {
    this.isRunning = true;
    console.log(`\n🚀 Price Keeper started`);
    console.log(`   Update interval: ${CONFIG.UPDATE_INTERVAL / 1000 / 60} minutes`);
    console.log(`   Press Ctrl+C to stop\n`);
    console.log("=".repeat(70));

    // Initial update
    await this.updatePrices();

    // Schedule periodic updates
    while (this.isRunning) {
      await this.sleep(CONFIG.UPDATE_INTERVAL);
      if (this.isRunning) {
        await this.updatePrices();
      }
    }
  }

  /**
   * Stop keeper
   */
  stop() {
    console.log("\n🛑 Stopping Price Keeper...");
    this.isRunning = false;
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const keeper = new PriceKeeper();

  try {
    await keeper.initialize();

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      keeper.stop();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      keeper.stop();
      process.exit(0);
    });

    await keeper.start();

  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run keeper
main().catch(error => {
  console.error(error);
  process.exit(1);
});

export { PriceKeeper };
