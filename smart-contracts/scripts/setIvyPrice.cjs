const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Set IVY token price in MockOracle
 * This is required for compound functionality to work
 */
async function main() {
  console.log("Setting IVY price in MockOracle...");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Read addresses from JSON file
  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  // Get MockOracle contract
  const MockOracle = await ethers.getContractAt("MockOracle", addresses.MockOracle);
  console.log("MockOracle address:", addresses.MockOracle);
  console.log("IvyToken address:", addresses.IvyToken);

  // Set IVY price to $1.00 (1e18)
  const ivyPrice = ethers.parseEther("1.0"); // $1.00
  console.log("Setting IVY price to:", ethers.formatEther(ivyPrice), "USDT");

  const tx = await MockOracle.setAssetPrice(addresses.IvyToken, ivyPrice);
  console.log("Transaction hash:", tx.hash);

  await tx.wait();
  console.log("✅ IVY price set successfully!");

  // Verify the price
  const verifyPrice = await MockOracle.getAssetPrice(addresses.IvyToken);
  console.log("Verified IVY price:", ethers.formatEther(verifyPrice), "USDT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
