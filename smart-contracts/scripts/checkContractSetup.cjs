const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Check all contract configurations and permissions
 * This script verifies the entire compound flow is properly set up
 */
async function main() {
  console.log("=".repeat(60));
  console.log("  CHECKING CONTRACT SETUP FOR COMPOUND FUNCTIONALITY");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\nUsing account:", deployer.address);

  // Read addresses from JSON file
  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  console.log("\n" + "=".repeat(60));
  console.log("  CONTRACT ADDRESSES");
  console.log("=".repeat(60));
  console.log("IvyToken  :", addresses.IvyToken);
  console.log("IvyCore   :", addresses.IvyCore);
  console.log("IvyBond   :", addresses.IvyBond);
  console.log("MockOracle:", addresses.MockOracle);

  // Get contracts
  const IvyToken = await ethers.getContractAt("IvyToken", addresses.IvyToken);
  const IvyCore = await ethers.getContractAt("IvyCore", addresses.IvyCore);
  const IvyBond = await ethers.getContractAt("IvyBond", addresses.IvyBond);
  const MockOracle = await ethers.getContractAt("MockOracle", addresses.MockOracle);

  console.log("\n" + "=".repeat(60));
  console.log("  1. CHECKING IVYTOKEN MINTER ROLE");
  console.log("=".repeat(60));
  const minter = await IvyToken.minter();
  console.log("Current minter:", minter);
  console.log("Expected (IvyCore):", addresses.IvyCore);
  const minterCorrect = minter.toLowerCase() === addresses.IvyCore.toLowerCase();
  console.log("Status:", minterCorrect ? "✅ CORRECT" : "❌ WRONG");

  console.log("\n" + "=".repeat(60));
  console.log("  2. CHECKING IVYBOND IVYCORE ADDRESS");
  console.log("=".repeat(60));
  const ivyCoreInBond = await IvyBond.ivyCore();
  console.log("IvyCore in IvyBond:", ivyCoreInBond);
  console.log("Expected:", addresses.IvyCore);
  const ivyCoreCorrect = ivyCoreInBond.toLowerCase() === addresses.IvyCore.toLowerCase();
  console.log("Status:", ivyCoreCorrect ? "✅ CORRECT" : "❌ WRONG");

  console.log("\n" + "=".repeat(60));
  console.log("  3. CHECKING ORACLE PRICE FOR IVY");
  console.log("=".repeat(60));
  const ivyPrice = await MockOracle.getAssetPrice(addresses.IvyToken);
  console.log("IVY Price:", ethers.formatEther(ivyPrice), "USDT");
  const priceCorrect = ivyPrice > 0;
  console.log("Status:", priceCorrect ? "✅ CORRECT" : "❌ WRONG (Must be > 0)");

  console.log("\n" + "=".repeat(60));
  console.log("  4. CHECKING IVYCORE REFERENCES");
  console.log("=".repeat(60));
  const tokenInCore = await IvyCore.ivyToken();
  const bondInCore = await IvyCore.ivyBond();
  const oracleInCore = await IvyCore.oracle();

  console.log("IvyToken in IvyCore:", tokenInCore);
  console.log("Expected:", addresses.IvyToken);
  const tokenRefCorrect = tokenInCore.toLowerCase() === addresses.IvyToken.toLowerCase();
  console.log("Status:", tokenRefCorrect ? "✅ CORRECT" : "❌ WRONG");

  console.log("\nIvyBond in IvyCore:", bondInCore);
  console.log("Expected:", addresses.IvyBond);
  const bondRefCorrect = bondInCore.toLowerCase() === addresses.IvyBond.toLowerCase();
  console.log("Status:", bondRefCorrect ? "✅ CORRECT" : "❌ WRONG");

  console.log("\nOracle in IvyCore:", oracleInCore);
  console.log("Expected:", addresses.MockOracle);
  const oracleRefCorrect = oracleInCore.toLowerCase() === addresses.MockOracle.toLowerCase();
  console.log("Status:", oracleRefCorrect ? "✅ CORRECT" : "❌ WRONG");

  console.log("\n" + "=".repeat(60));
  console.log("  SUMMARY");
  console.log("=".repeat(60));
  const allCorrect = minterCorrect && ivyCoreCorrect && priceCorrect &&
                      tokenRefCorrect && bondRefCorrect && oracleRefCorrect;

  if (allCorrect) {
    console.log("✅ ALL CONFIGURATIONS CORRECT!");
    console.log("✅ Compound functionality should work properly");
  } else {
    console.log("❌ SOME CONFIGURATIONS ARE WRONG!");
    console.log("❌ Compound functionality will fail");
    console.log("\nIssues to fix:");
    if (!minterCorrect) console.log("  - IvyToken minter role");
    if (!ivyCoreCorrect) console.log("  - IvyBond ivyCore address");
    if (!priceCorrect) console.log("  - Oracle IVY price");
    if (!tokenRefCorrect) console.log("  - IvyCore token reference");
    if (!bondRefCorrect) console.log("  - IvyCore bond reference");
    if (!oracleRefCorrect) console.log("  - IvyCore oracle reference");
  }

  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
