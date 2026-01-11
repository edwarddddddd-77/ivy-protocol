const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Sync user rewards to update pool and make vIVY available for compound
 */
async function main() {
  const userAddress = "0x1140471923924D0dc15b6Df516c44212E9E59695";

  console.log("=".repeat(70));
  console.log("  SYNCING USER REWARDS");
  console.log("=".repeat(70));
  console.log("User:", userAddress);

  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  // Get signer (need to be the user or any account that can call syncUser)
  const [deployer] = await ethers.getSigners();
  console.log("Caller:", deployer.address);

  const IvyCore = await ethers.getContractAt("IvyCore", addresses.IvyCore);

  // Check pending rewards BEFORE sync
  console.log("\n📊 BEFORE SYNC:");
  const pendingBefore = await IvyCore.pendingIvy(userAddress);
  console.log("Pending vIVY (view):", ethers.formatEther(pendingBefore));

  const userInfoBefore = await IvyCore.userInfo(userAddress);
  console.log("Pending Vested (storage):", ethers.formatEther(userInfoBefore.pendingVested));
  console.log("Reward Debt:", ethers.formatEther(userInfoBefore.rewardDebt));

  // Call syncUser to update pool and user rewards
  console.log("\n⚙️  Calling syncUser()...");
  const tx = await IvyCore.syncUser(userAddress);
  console.log("Transaction hash:", tx.hash);

  console.log("Waiting for confirmation...");
  await tx.wait();
  console.log("✅ Sync complete!");

  // Check pending rewards AFTER sync
  console.log("\n📊 AFTER SYNC:");
  const pendingAfter = await IvyCore.pendingIvy(userAddress);
  console.log("Pending vIVY (view):", ethers.formatEther(pendingAfter));

  const userInfoAfter = await IvyCore.userInfo(userAddress);
  console.log("Pending Vested (storage):", ethers.formatEther(userInfoAfter.pendingVested));
  console.log("Reward Debt:", ethers.formatEther(userInfoAfter.rewardDebt));

  console.log("\n" + "=".repeat(70));
  console.log("  RESULT");
  console.log("=".repeat(70));
  const increase = userInfoAfter.pendingVested - userInfoBefore.pendingVested;
  console.log("✅ vIVY increased by:", ethers.formatEther(increase));
  console.log("✅ User can now compound up to:", ethers.formatEther(userInfoAfter.pendingVested), "vIVY");
  console.log("\n💡 Now try the compound function again!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ ERROR:", error.message);
    process.exit(1);
  });
