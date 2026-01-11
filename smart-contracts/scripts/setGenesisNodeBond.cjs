const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Setting IvyBond reference in GenesisNode...\n");

  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  const genesisNode = await hre.ethers.getContractAt("GenesisNode", addresses.GenesisNode);

  console.log("GenesisNode:", addresses.GenesisNode);
  console.log("IvyBond:", addresses.IvyBond);

  const tx = await genesisNode.setIvyBond(addresses.IvyBond);
  console.log("\nTransaction hash:", tx.hash);
  console.log("Waiting for confirmation...");

  await tx.wait();
  console.log("✅ Transaction confirmed!");

  // Verify
  const ivyBond = await genesisNode.ivyBond();
  console.log("\nVerification:");
  console.log("IvyBond set to:", ivyBond);
  console.log("Expected:", addresses.IvyBond);
  console.log("Match:", ivyBond.toLowerCase() === addresses.IvyBond.toLowerCase() ? "✅" : "❌");

  if (ivyBond.toLowerCase() === addresses.IvyBond.toLowerCase()) {
    console.log("\n🎉 GenesisNode is now fully configured!");
    console.log("You can now mint Genesis Node NFTs!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
