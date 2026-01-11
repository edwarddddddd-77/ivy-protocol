const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(70));
  console.log("  FULL SYSTEM CHECK - ALL CONTRACTS");
  console.log("=".repeat(70));

  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  console.log("\n📋 Contract Addresses:");
  Object.entries(addresses).forEach(([name, addr]) => {
    console.log(`   ${name.padEnd(15)}: ${addr}`);
  });

  // Get all contracts
  const mockOracle = await hre.ethers.getContractAt("MockOracle", addresses.MockOracle);
  const ivyToken = await hre.ethers.getContractAt("IvyToken", addresses.IvyToken);
  const ivyCore = await hre.ethers.getContractAt("IvyCore", addresses.IvyCore);
  const genesisNode = await hre.ethers.getContractAt("GenesisNode", addresses.GenesisNode);
  const ivyBond = await hre.ethers.getContractAt("IvyBond", addresses.IvyBond);
  const dividendPool = await hre.ethers.getContractAt("DividendPool", addresses.DividendPool);
  const photosynthesis = await hre.ethers.getContractAt("Photosynthesis", addresses.Photosynthesis);

  let allGood = true;

  // ==================== MockOracle ====================
  console.log("\n" + "=".repeat(70));
  console.log("1. MockOracle");
  console.log("=".repeat(70));

  const ivyPrice = await mockOracle.getAssetPrice(addresses.IvyToken);
  console.log("IVY Price:", hre.ethers.formatEther(ivyPrice), "USDT");
  if (ivyPrice == 0n) {
    console.log("❌ IVY price is 0!");
    allGood = false;
  } else {
    console.log("✅ IVY price set correctly");
  }

  // ==================== IvyToken ====================
  console.log("\n" + "=".repeat(70));
  console.log("2. IvyToken");
  console.log("=".repeat(70));

  const minter = await ivyToken.minter();
  console.log("Minter:", minter);
  console.log("Expected (IvyCore):", addresses.IvyCore);
  if (minter.toLowerCase() !== addresses.IvyCore.toLowerCase()) {
    console.log("❌ Minter is wrong!");
    allGood = false;
  } else {
    console.log("✅ Minter set correctly");
  }

  const totalSupply = await ivyToken.totalSupply();
  console.log("Total Supply:", hre.ethers.formatEther(totalSupply), "IVY");

  // ==================== IvyCore ====================
  console.log("\n" + "=".repeat(70));
  console.log("3. IvyCore");
  console.log("=".repeat(70));

  const coreToken = await ivyCore.ivyToken();
  console.log("ivyToken:", coreToken);
  console.log("Expected:", addresses.IvyToken);
  if (coreToken.toLowerCase() !== addresses.IvyToken.toLowerCase()) {
    console.log("❌ ivyToken wrong!");
    allGood = false;
  } else {
    console.log("✅ ivyToken correct");
  }

  const coreBond = await ivyCore.ivyBond();
  console.log("ivyBond:", coreBond);
  console.log("Expected:", addresses.IvyBond);
  if (coreBond.toLowerCase() !== addresses.IvyBond.toLowerCase()) {
    console.log("❌ ivyBond wrong!");
    allGood = false;
  } else {
    console.log("✅ ivyBond correct");
  }

  const coreOracle = await ivyCore.oracle();
  console.log("oracle:", coreOracle);
  console.log("Expected:", addresses.MockOracle);
  if (coreOracle.toLowerCase() !== addresses.MockOracle.toLowerCase()) {
    console.log("❌ oracle wrong!");
    allGood = false;
  } else {
    console.log("✅ oracle correct");
  }

  const coreGenesisNode = await ivyCore.genesisNode();
  console.log("genesisNode:", coreGenesisNode);
  console.log("Expected:", addresses.GenesisNode);
  if (coreGenesisNode.toLowerCase() !== addresses.GenesisNode.toLowerCase()) {
    console.log("❌ genesisNode wrong!");
    allGood = false;
  } else {
    console.log("✅ genesisNode correct");
  }

  // ==================== GenesisNode ====================
  console.log("\n" + "=".repeat(70));
  console.log("4. GenesisNode");
  console.log("=".repeat(70));

  const gnPaymentToken = await genesisNode.paymentToken();
  console.log("paymentToken:", gnPaymentToken);
  console.log("Expected (MockUSDT):", addresses.MockUSDT);
  if (gnPaymentToken.toLowerCase() !== addresses.MockUSDT.toLowerCase()) {
    console.log("❌ paymentToken wrong!");
    allGood = false;
  } else {
    console.log("✅ paymentToken correct");
  }

  const gnIvyBond = await genesisNode.ivyBond();
  console.log("ivyBond:", gnIvyBond);
  console.log("Expected:", addresses.IvyBond);
  if (gnIvyBond.toLowerCase() !== addresses.IvyBond.toLowerCase()) {
    console.log("❌ ivyBond wrong!");
    allGood = false;
  } else {
    console.log("✅ ivyBond correct");
  }

  // ==================== IvyBond ====================
  console.log("\n" + "=".repeat(70));
  console.log("5. IvyBond");
  console.log("=".repeat(70));

  const bondPaymentToken = await ivyBond.paymentToken();
  console.log("paymentToken:", bondPaymentToken);
  console.log("Expected (MockUSDT):", addresses.MockUSDT);
  if (bondPaymentToken.toLowerCase() !== addresses.MockUSDT.toLowerCase()) {
    console.log("❌ paymentToken wrong!");
    allGood = false;
  } else {
    console.log("✅ paymentToken correct");
  }

  const bondGenesisNode = await ivyBond.genesisNode();
  console.log("genesisNode:", bondGenesisNode);
  console.log("Expected:", addresses.GenesisNode);
  if (bondGenesisNode.toLowerCase() !== addresses.GenesisNode.toLowerCase()) {
    console.log("❌ genesisNode wrong!");
    allGood = false;
  } else {
    console.log("✅ genesisNode correct");
  }

  const bondIvyCore = await ivyBond.ivyCore();
  console.log("ivyCore:", bondIvyCore);
  console.log("Expected:", addresses.IvyCore);
  if (bondIvyCore.toLowerCase() !== addresses.IvyCore.toLowerCase()) {
    console.log("❌ ivyCore wrong!");
    allGood = false;
  } else {
    console.log("✅ ivyCore correct");
  }

  const bondIvyToken = await ivyBond.ivyToken();
  console.log("ivyToken:", bondIvyToken);
  console.log("Expected:", addresses.IvyToken);
  if (bondIvyToken.toLowerCase() !== addresses.IvyToken.toLowerCase()) {
    console.log("❌ ivyToken wrong!");
    allGood = false;
  } else {
    console.log("✅ ivyToken correct");
  }

  // ==================== DividendPool ====================
  console.log("\n" + "=".repeat(70));
  console.log("6. DividendPool");
  console.log("=".repeat(70));

  const dpPhotosynthesis = await dividendPool.photosynthesis();
  console.log("photosynthesis:", dpPhotosynthesis);
  console.log("Expected:", addresses.Photosynthesis);
  if (dpPhotosynthesis.toLowerCase() !== addresses.Photosynthesis.toLowerCase()) {
    console.log("❌ photosynthesis wrong!");
    allGood = false;
  } else {
    console.log("✅ photosynthesis correct");
  }

  // ==================== Photosynthesis ====================
  console.log("\n" + "=".repeat(70));
  console.log("7. Photosynthesis");
  console.log("=".repeat(70));

  const psDividendPool = await photosynthesis.dividendPool();
  console.log("dividendPool:", psDividendPool);
  console.log("Expected:", addresses.DividendPool);
  if (psDividendPool.toLowerCase() !== addresses.DividendPool.toLowerCase()) {
    console.log("❌ dividendPool wrong!");
    allGood = false;
  } else {
    console.log("✅ dividendPool correct");
  }

  const psOracle = await photosynthesis.priceOracle();
  console.log("priceOracle:", psOracle);
  console.log("Expected:", addresses.MockOracle);
  if (psOracle.toLowerCase() !== addresses.MockOracle.toLowerCase()) {
    console.log("❌ priceOracle wrong!");
    allGood = false;
  } else {
    console.log("✅ priceOracle correct");
  }

  // ==================== SUMMARY ====================
  console.log("\n" + "=".repeat(70));
  console.log("  FINAL SUMMARY");
  console.log("=".repeat(70));

  if (allGood) {
    console.log("✅✅✅ ALL CONTRACTS FULLY CONFIGURED!");
    console.log("✅ System is ready for testing");
    console.log("\n💡 You can now:");
    console.log("   1. Mint Bond NFTs (deposit USDT)");
    console.log("   2. Mint Genesis Node NFTs (1000 USDT)");
    console.log("   3. Mine IVY rewards");
    console.log("   4. Compound vIVY");
    console.log("   5. Harvest and withdraw");
  } else {
    console.log("❌ SOME CONFIGURATIONS ARE MISSING!");
    console.log("❌ Please check the errors above");
  }

  console.log("=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error.message);
    process.exit(1);
  });
