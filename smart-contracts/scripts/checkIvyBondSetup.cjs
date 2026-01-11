const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Checking IvyBond setup...\n");

  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  const ivyBond = await hre.ethers.getContractAt("IvyBond", addresses.IvyBond);

  console.log("IvyBond address:", addresses.IvyBond);
  console.log("Expected references:");
  console.log("  MockUSDT:", addresses.MockUSDT);
  console.log("  GenesisNode:", addresses.GenesisNode);
  console.log("  IvyCore:", addresses.IvyCore);
  console.log("  IvyToken:", addresses.IvyToken);

  // Check all settings
  console.log("\n1. Payment Token:");
  const paymentToken = await ivyBond.paymentToken();
  console.log("   Current:", paymentToken);
  console.log("   Expected:", addresses.MockUSDT);
  console.log("   Status:", paymentToken.toLowerCase() === addresses.MockUSDT.toLowerCase() ? "✅" : "❌");

  console.log("\n2. GenesisNode:");
  const genesisNode = await ivyBond.genesisNode();
  console.log("   Current:", genesisNode);
  console.log("   Expected:", addresses.GenesisNode);
  console.log("   Status:", genesisNode.toLowerCase() === addresses.GenesisNode.toLowerCase() ? "✅" : "❌");

  console.log("\n3. IvyCore:");
  const ivyCore = await ivyBond.ivyCore();
  console.log("   Current:", ivyCore);
  console.log("   Expected:", addresses.IvyCore);
  console.log("   Status:", ivyCore.toLowerCase() === addresses.IvyCore.toLowerCase() ? "✅" : "❌");

  console.log("\n4. IvyToken:");
  const ivyToken = await ivyBond.ivyToken();
  console.log("   Current:", ivyToken);
  console.log("   Expected:", addresses.IvyToken);
  console.log("   Status:", ivyToken.toLowerCase() === addresses.IvyToken.toLowerCase() ? "✅" : "❌");

  console.log("\n5. Owner:");
  const owner = await ivyBond.owner();
  console.log("   Owner:", owner);

  // Summary
  console.log("\n" + "=".repeat(60));
  const allCorrect =
    paymentToken.toLowerCase() === addresses.MockUSDT.toLowerCase() &&
    genesisNode.toLowerCase() === addresses.GenesisNode.toLowerCase() &&
    ivyCore.toLowerCase() === addresses.IvyCore.toLowerCase() &&
    ivyToken.toLowerCase() === addresses.IvyToken.toLowerCase();

  if (allCorrect) {
    console.log("✅ IvyBond is fully configured!");
  } else {
    console.log("❌ IvyBond needs configuration!");
    console.log("\nMissing configurations:");
    if (paymentToken === "0x0000000000000000000000000000000000000000") {
      console.log("  - setPaymentToken('" + addresses.MockUSDT + "')");
    }
    if (genesisNode === "0x0000000000000000000000000000000000000000") {
      console.log("  - setGenesisNode('" + addresses.GenesisNode + "')");
    }
    if (ivyCore === "0x0000000000000000000000000000000000000000") {
      console.log("  - setIvyCore('" + addresses.IvyCore + "')");
    }
    if (ivyToken === "0x0000000000000000000000000000000000000000") {
      console.log("  - setIvyToken('" + addresses.IvyToken + "')");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
