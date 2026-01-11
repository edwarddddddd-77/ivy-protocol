const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Fix IvyToken minter role
 * IvyCore needs to be the minter to enable compound functionality
 */
async function main() {
  console.log("Checking and fixing IvyToken minter role...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Read addresses from JSON file
  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  console.log("\nContract Addresses:");
  console.log("- IvyToken:", addresses.IvyToken);
  console.log("- IvyCore:", addresses.IvyCore);

  // Get IvyToken contract
  const IvyToken = await ethers.getContractAt("IvyToken", addresses.IvyToken);

  // Check current minter
  const currentMinter = await IvyToken.minter();
  console.log("\n📋 Current minter:", currentMinter);
  console.log("✅ Expected minter (IvyCore):", addresses.IvyCore);

  if (currentMinter.toLowerCase() === addresses.IvyCore.toLowerCase()) {
    console.log("\n✅ Minter is already correctly set!");
    return;
  }

  console.log("\n⚠️  Minter is NOT set correctly!");
  console.log("Setting IvyCore as minter...");

  // Set IvyCore as minter
  const tx = await IvyToken.setMinter(addresses.IvyCore);
  console.log("Transaction hash:", tx.hash);

  await tx.wait();
  console.log("✅ Minter set successfully!");

  // Verify
  const newMinter = await IvyToken.minter();
  console.log("\n🔍 Verification:");
  console.log("- New minter:", newMinter);
  console.log("- Expected:", addresses.IvyCore);
  console.log("- Match:", newMinter.toLowerCase() === addresses.IvyCore.toLowerCase() ? "✅ YES" : "❌ NO");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
