const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Checking GenesisNode setup...\n");

  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  const genesisNode = await hre.ethers.getContractAt("GenesisNode", addresses.GenesisNode);

  console.log("GenesisNode address:", addresses.GenesisNode);
  console.log("MockUSDT address:", addresses.MockUSDT);
  console.log("IvyBond address:", addresses.IvyBond);

  // Check all settings
  console.log("\n1. Payment Token:");
  const paymentToken = await genesisNode.paymentToken();
  console.log("   Current:", paymentToken);
  console.log("   Expected:", addresses.MockUSDT);
  console.log("   Status:", paymentToken.toLowerCase() === addresses.MockUSDT.toLowerCase() ? "✅ CORRECT" : "❌ WRONG");

  console.log("\n2. IvyBond Reference:");
  const ivyBond = await genesisNode.ivyBond();
  console.log("   Current:", ivyBond);
  console.log("   Expected:", addresses.IvyBond);
  console.log("   Status:", ivyBond.toLowerCase() === addresses.IvyBond.toLowerCase() ? "✅ CORRECT" : "❌ WRONG");

  console.log("\n3. Owner:");
  const owner = await genesisNode.owner();
  console.log("   Owner:", owner);

  console.log("\n4. Node Price:");
  const nodePrice = await genesisNode.NODE_PRICE();
  console.log("   Price:", hre.ethers.formatEther(nodePrice), "USDT");

  // Check if needs setup
  if (paymentToken === "0x0000000000000000000000000000000000000000") {
    console.log("\n❌ NEEDS SETUP: Payment token not set");
    console.log("Run: await genesisNode.setPaymentToken('" + addresses.MockUSDT + "')");
  }

  if (ivyBond === "0x0000000000000000000000000000000000000000") {
    console.log("\n❌ NEEDS SETUP: IvyBond not set");
    console.log("Run: await genesisNode.setIvyBond('" + addresses.IvyBond + "')");
  }

  if (paymentToken.toLowerCase() === addresses.MockUSDT.toLowerCase() &&
      ivyBond.toLowerCase() === addresses.IvyBond.toLowerCase()) {
    console.log("\n✅ GenesisNode is fully configured and ready!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
