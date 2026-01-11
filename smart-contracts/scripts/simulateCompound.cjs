const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Simulate compound step by step to find where it fails
 */
async function main() {
  const userAddress = "0x1140471923924D0dc15b6Df516c44212E9E59695";
  const bondId = 0; // From previous check
  const compoundAmount = ethers.parseEther("100"); // Try 100 vIVY

  console.log("=".repeat(70));
  console.log("  SIMULATING COMPOUND TRANSACTION");
  console.log("=".repeat(70));
  console.log("User:", userAddress);
  console.log("Bond ID:", bondId);
  console.log("Amount:", ethers.formatEther(compoundAmount), "vIVY\n");

  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  const IvyCore = await ethers.getContractAt("IvyCore", addresses.IvyCore);
  const IvyBond = await ethers.getContractAt("IvyBond", addresses.IvyBond);
  const IvyToken = await ethers.getContractAt("IvyToken", addresses.IvyToken);
  const MockOracle = await ethers.getContractAt("MockOracle", addresses.MockOracle);

  console.log("Step 1: Check Ownership");
  const bondOwner = await IvyBond.ownerOfBond(bondId);
  console.log("  Bond owner:", bondOwner);
  console.log("  User:", userAddress);
  console.log("  Match:", bondOwner.toLowerCase() === userAddress.toLowerCase() ? "✅" : "❌");
  if (bondOwner.toLowerCase() !== userAddress.toLowerCase()) {
    console.log("  ❌ FAILED: Not bond owner");
    return;
  }

  console.log("\nStep 2: Check amount > 0");
  console.log("  Amount:", ethers.formatEther(compoundAmount));
  console.log("  Check:", compoundAmount > 0n ? "✅" : "❌");
  if (compoundAmount <=0n) {
    console.log("  ❌ FAILED: Amount must be > 0");
    return;
  }

  console.log("\nStep 3: Calculate Available vIVY");
  const userInfo = await IvyCore.userInfo(userAddress);
  const accIvyPerShare = await IvyCore.accIvyPerShare();
  const ACC_IVY_PRECISION = 10n ** 18n;

  const pending = (userInfo.bondPower * accIvyPerShare / ACC_IVY_PRECISION) - userInfo.rewardDebt;
  const totalAvailable = pending + userInfo.pendingVested;

  console.log("  Bond Power:", ethers.formatEther(userInfo.bondPower));
  console.log("  Reward Debt:", ethers.formatEther(userInfo.rewardDebt));
  console.log("  Pending Vested:", ethers.formatEther(userInfo.pendingVested));
  console.log("  Calculated Pending:", ethers.formatEther(pending));
  console.log("  Total Available:", ethers.formatEther(totalAvailable));
  console.log("  Compound Amount:", ethers.formatEther(compoundAmount));
  console.log("  Sufficient:", compoundAmount <= totalAvailable ? "✅" : "❌");
  if (compoundAmount > totalAvailable) {
    console.log("  ❌ FAILED: Insufficient vIVY balance");
    return;
  }

  console.log("\nStep 4: Check Mining Cap");
  const totalMinted = await IvyCore.totalMinted();
  const MINING_CAP = await IvyCore.MINING_CAP();
  const remaining = MINING_CAP - totalMinted;

  console.log("  Total Minted:", ethers.formatEther(totalMinted));
  console.log("  Mining Cap:", ethers.formatEther(MINING_CAP));
  console.log("  Remaining:", ethers.formatEther(remaining));
  console.log("  Check:", compoundAmount <= remaining ? "✅" : "❌");
  if (compoundAmount > remaining) {
    console.log("  ❌ FAILED: Mining cap reached");
    return;
  }

  console.log("\nStep 5: Check Minter Role");
  const minter = await IvyToken.minter();
  console.log("  Current minter:", minter);
  console.log("  IvyCore:", addresses.IvyCore);
  console.log("  Check:", minter.toLowerCase() === addresses.IvyCore.toLowerCase() ? "✅" : "❌");
  if (minter.toLowerCase() !== addresses.IvyCore.toLowerCase()) {
    console.log("  ❌ FAILED: IvyCore is not minter");
    return;
  }

  console.log("\nStep 6: Check Oracle Price");
  const ivyPrice = await MockOracle.getAssetPrice(addresses.IvyToken);
  console.log("  IVY Price:", ethers.formatEther(ivyPrice), "USDT");
  console.log("  Check:", ivyPrice > 0n ? "✅" : "❌");
  if (ivyPrice == 0n) {
    console.log("  ❌ FAILED: Oracle price is zero");
    return;
  }

  console.log("\nStep 7: Calculate Power");
  const valueInUSDT = (compoundAmount * ivyPrice) / (10n ** 18n);
  const powerToAdd = (valueInUSDT * 110n) / 100n;
  console.log("  Value in USDT:", ethers.formatEther(valueInUSDT));
  console.log("  Power to add (with 10% bonus):", ethers.formatEther(powerToAdd));

  console.log("\nStep 8: Check addCompoundPower access");
  const ivyCoreInBond = await IvyBond.ivyCore();
  console.log("  IvyCore in IvyBond:", ivyCoreInBond);
  console.log("  Expected:", addresses.IvyCore);
  console.log("  Check:", ivyCoreInBond.toLowerCase() === addresses.IvyCore.toLowerCase() ? "✅" : "❌");
  if (ivyCoreInBond.toLowerCase() !== addresses.IvyCore.toLowerCase()) {
    console.log("  ❌ FAILED: IvyCore not set in IvyBond");
    return;
  }

  console.log("\nStep 9: Check power limit (1M IVY max per call)");
  const MAX_SINGLE_CALL_POWER = ethers.parseEther("1000000");
  console.log("  Power to add:", ethers.formatEther(powerToAdd));
  console.log("  Max allowed:", ethers.formatEther(MAX_SINGLE_CALL_POWER));
  console.log("  Check:", powerToAdd <= MAX_SINGLE_CALL_POWER ? "✅" : "❌");
  if (powerToAdd > MAX_SINGLE_CALL_POWER) {
    console.log("  ❌ FAILED: Exceeds single-call limit (1M IVY)");
    return;
  }

  console.log("\n" + "=".repeat(70));
  console.log("  ALL CHECKS PASSED! ✅");
  console.log("=".repeat(70));
  console.log("\n💡 Compound should work with these parameters:");
  console.log("   - Bond ID:", bondId);
  console.log("   - Amount:", ethers.formatEther(compoundAmount), "vIVY");
  console.log("\n💡 If it still fails, try:");
  console.log("   1. Increase gas limit to 500,000");
  console.log("   2. Try smaller amount first (e.g., 10 vIVY)");
  console.log("   3. Check wallet has enough BNB for gas");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error.message);
    process.exit(1);
  });
