const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Debug why user has no bondPower in IvyCore
 */
async function main() {
  const userAddress = "0x1140471923924D0dc15b6Df516c44212E9E59695";

  console.log("=".repeat(70));
  console.log("  DEBUGGING USER BOND POWER");
  console.log("=".repeat(70));
  console.log("User:", userAddress);

  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  const IvyCore = await ethers.getContractAt("IvyCore", addresses.IvyCore);
  const IvyBond = await ethers.getContractAt("IvyBond", addresses.IvyBond);

  console.log("\n" + "=".repeat(70));
  console.log("  1. CHECK BOND POWER IN IVYBOND");
  console.log("=".repeat(70));

  const bondPowerInBond = await IvyBond.getBondPower(userAddress);
  console.log("Bond Power in IvyBond:", ethers.formatEther(bondPowerInBond), "USDT");

  console.log("\n" + "=".repeat(70));
  console.log("  2. CHECK USER INFO IN IVYCORE");
  console.log("=".repeat(70));

  const userInfo = await IvyCore.userInfo(userAddress);
  console.log("Bond Power in IvyCore:", ethers.formatEther(userInfo.bondPower), "USDT");
  console.log("Pending Vested:", ethers.formatEther(userInfo.pendingVested), "vIVY");
  console.log("Reward Debt:", ethers.formatEther(userInfo.rewardDebt));

  console.log("\n" + "=".repeat(70));
  console.log("  3. CHECK POOL STATUS");
  console.log("=".repeat(70));

  const totalPoolBondPower = await IvyCore.totalPoolBondPower();
  const accIvyPerShare = await IvyCore.accIvyPerShare();

  console.log("Total Pool Power:", ethers.formatEther(totalPoolBondPower), "USDT");
  console.log("Acc IVY Per Share:", accIvyPerShare.toString());

  console.log("\n" + "=".repeat(70));
  console.log("  DIAGNOSIS");
  console.log("=".repeat(70));

  if (bondPowerInBond > 0n && userInfo.bondPower == 0n) {
    console.log("❌ PROBLEM FOUND!");
    console.log("✅ User has Bond Power in IvyBond:", ethers.formatEther(bondPowerInBond));
    console.log("❌ But Bond Power in IvyCore is 0!");
    console.log("\n💡 SOLUTION: User needs to call syncUser() or deposit again");
    console.log("   This will sync the bond power from IvyBond to IvyCore");
  } else if (userInfo.bondPower > 0n) {
    console.log("✅ User has Bond Power in IvyCore:", ethers.formatEther(userInfo.bondPower));
    console.log("✅ Rewards should be accumulating");

    // Calculate theoretical pending
    const ACC_IVY_PRECISION = 10n ** 18n;
    const theoreticalPending = (userInfo.bondPower * accIvyPerShare / ACC_IVY_PRECISION) - userInfo.rewardDebt;
    console.log("\n💡 Theoretical pending (if synced):", ethers.formatEther(theoreticalPending), "vIVY");
  } else {
    console.log("❌ User has no Bond Power in either contract!");
    console.log("❌ User needs to deposit first");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error.message);
    process.exit(1);
  });
