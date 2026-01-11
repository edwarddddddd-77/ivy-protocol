const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Check user's ability to compound
 * Diagnose why compound transaction might fail
 */
async function main() {
  // User address from the failed transaction
  const userAddress = "0x1140471923924D0dc15b6Df516c44212E9E59695";

  console.log("=".repeat(70));
  console.log("  DIAGNOSING COMPOUND FAILURE FOR USER");
  console.log("=".repeat(70));
  console.log("User:", userAddress);

  // Read addresses from JSON file
  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  // Get contracts
  const IvyCore = await ethers.getContractAt("IvyCore", addresses.IvyCore);
  const IvyBond = await ethers.getContractAt("IvyBond", addresses.IvyBond);

  console.log("\n" + "=".repeat(70));
  console.log("  1. CHECKING USER'S BOND NFTs");
  console.log("=".repeat(70));

  const bondIds = await IvyBond.getUserBondIds(userAddress);
  console.log("Bond NFT count:", bondIds.length);

  if (bondIds.length === 0) {
    console.log("❌ USER HAS NO BOND NFTs!");
    console.log("Cannot compound without a Bond NFT");
    return;
  }

  console.log("Bond NFT IDs:", bondIds.map(id => id.toString()).join(", "));

  // Check ownership of first bond
  const firstBondId = bondIds[0];
  const bondOwner = await IvyBond.ownerOfBond(firstBondId);
  console.log("\nFirst Bond (#" + firstBondId + ") owner:", bondOwner);
  console.log("Expected:", userAddress);
  console.log("Ownership:", bondOwner.toLowerCase() === userAddress.toLowerCase() ? "✅ CORRECT" : "❌ WRONG");

  console.log("\n" + "=".repeat(70));
  console.log("  2. CHECKING USER'S vIVY BALANCE");
  console.log("=".repeat(70));

  const miningStats = await IvyCore.getUserMiningStats(userAddress);
  const bondPower = miningStats[0];
  const pendingReward = miningStats[1];
  const totalVested = miningStats[2];
  const totalClaimed = miningStats[3];
  const claimableNow = miningStats[4];

  console.log("Bond Power:", ethers.formatEther(bondPower), "USDT");
  console.log("Pending Reward (vIVY):", ethers.formatEther(pendingReward), "vIVY");
  console.log("Total Vested:", ethers.formatEther(totalVested), "IVY");
  console.log("Total Claimed:", ethers.formatEther(totalClaimed), "IVY");
  console.log("Claimable Now:", ethers.formatEther(claimableNow), "IVY");

  if (pendingReward == 0n) {
    console.log("\n❌ USER HAS NO vIVY TO COMPOUND!");
    console.log("User needs to wait for mining rewards to accumulate");
    return;
  }

  console.log("\n" + "=".repeat(70));
  console.log("  3. CHECKING POOL STATUS");
  console.log("=".repeat(70));

  // Get pool info
  const totalPoolBondPower = await IvyCore.totalPoolBondPower();
  const accIvyPerShare = await IvyCore.accIvyPerShare();
  const lastRewardBlock = await IvyCore.lastRewardBlock();
  const currentBlock = await ethers.provider.getBlockNumber();

  console.log("Total Pool Power:", ethers.formatEther(totalPoolBondPower), "USDT");
  console.log("Accumulated IVY per Share:", accIvyPerShare.toString());
  console.log("Last Reward Block:", lastRewardBlock.toString());
  console.log("Current Block:", currentBlock);
  console.log("Blocks since update:", currentBlock - Number(lastRewardBlock));

  console.log("\n" + "=".repeat(70));
  console.log("  4. CHECKING USER INFO DETAILS");
  console.log("=".repeat(70));

  const userInfo = await IvyCore.userInfo(userAddress);
  console.log("User Bond Power:", ethers.formatEther(userInfo.bondPower), "USDT");
  console.log("Reward Debt:", ethers.formatEther(userInfo.rewardDebt), "IVY");
  console.log("Pending Vested:", ethers.formatEther(userInfo.pendingVested), "vIVY");
  console.log("Total Vested:", ethers.formatEther(userInfo.totalVested), "IVY");
  console.log("Total Claimed:", ethers.formatEther(userInfo.totalClaimed), "IVY");
  console.log("Vesting Start Time:", userInfo.vestingStartTime.toString());

  // Calculate available vIVY
  const ACC_IVY_PRECISION = 10n ** 18n;
  const calculatedPending = (userInfo.bondPower * accIvyPerShare / ACC_IVY_PRECISION) - userInfo.rewardDebt;
  const totalAvailable = calculatedPending + userInfo.pendingVested;

  console.log("\nCalculated Pending (from formula):", ethers.formatEther(calculatedPending), "vIVY");
  console.log("Total Available vIVY:", ethers.formatEther(totalAvailable), "vIVY");

  console.log("\n" + "=".repeat(70));
  console.log("  5. CHECKING MINING CAP");
  console.log("=".repeat(70));

  const totalMinted = await IvyCore.totalMinted();
  const MINING_CAP = await IvyCore.MINING_CAP();

  console.log("Total Minted:", ethers.formatEther(totalMinted), "IVY");
  console.log("Mining Cap:", ethers.formatEther(MINING_CAP), "IVY");
  console.log("Remaining:", ethers.formatEther(MINING_CAP - totalMinted), "IVY");

  if (totalMinted >= MINING_CAP) {
    console.log("❌ MINING CAP REACHED!");
    console.log("Cannot compound anymore");
    return;
  }

  console.log("\n" + "=".repeat(70));
  console.log("  DIAGNOSIS SUMMARY");
  console.log("=".repeat(70));

  console.log("✅ User has Bond NFTs:", bondIds.length);
  console.log("✅ User owns Bond #" + firstBondId);
  console.log("✅ User has vIVY:", ethers.formatEther(totalAvailable), "vIVY");
  console.log("✅ Mining cap not reached");

  console.log("\n💡 User should be able to compound!");
  console.log("💡 If still failing, the issue might be:");
  console.log("   1. User selected wrong Bond ID (not owned by them)");
  console.log("   2. Compound amount exceeds available vIVY");
  console.log("   3. Gas limit too low");
  console.log("   4. Network congestion");

  // Suggest a safe compound amount
  const safeAmount = totalAvailable > 0n ? totalAvailable / 2n : 0n;
  console.log("\n💡 Try compounding:", ethers.formatEther(safeAmount), "vIVY");
  console.log("   Using Bond ID:", firstBondId.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
