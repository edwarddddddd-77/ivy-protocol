const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function sleep(ms) {
  console.log(`Waiting ${ms/1000}s to avoid rate limit...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("Fixing IvyBond configuration...\n");

  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  const ivyBond = await hre.ethers.getContractAt("IvyBond", addresses.IvyBond);

  console.log("IvyBond:", addresses.IvyBond);
  console.log("MockUSDT:", addresses.MockUSDT);
  console.log("GenesisNode:", addresses.GenesisNode);

  // 1. Set Payment Token
  console.log("\n1. Setting Payment Token...");
  await sleep(3000);
  try {
    const tx1 = await ivyBond.setPaymentToken(addresses.MockUSDT);
    console.log("   Transaction hash:", tx1.hash);
    await tx1.wait();
    console.log("   ✅ Payment token set!");
  } catch (error) {
    console.log("   ⚠️  Error:", error.message);
  }

  // 2. Set GenesisNode
  console.log("\n2. Setting GenesisNode...");
  await sleep(3000);
  try {
    const tx2 = await ivyBond.setGenesisNode(addresses.GenesisNode);
    console.log("   Transaction hash:", tx2.hash);
    await tx2.wait();
    console.log("   ✅ GenesisNode set!");
  } catch (error) {
    console.log("   ⚠️  Error:", error.message);
  }

  // 3. Verify
  console.log("\n3. Verification...");
  await sleep(2000);

  const paymentToken = await ivyBond.paymentToken();
  const genesisNode = await ivyBond.genesisNode();

  console.log("\nPayment Token:");
  console.log("  Current:", paymentToken);
  console.log("  Expected:", addresses.MockUSDT);
  console.log("  Status:", paymentToken.toLowerCase() === addresses.MockUSDT.toLowerCase() ? "✅" : "❌");

  console.log("\nGenesisNode:");
  console.log("  Current:", genesisNode);
  console.log("  Expected:", addresses.GenesisNode);
  console.log("  Status:", genesisNode.toLowerCase() === addresses.GenesisNode.toLowerCase() ? "✅" : "❌");

  if (paymentToken.toLowerCase() === addresses.MockUSDT.toLowerCase() &&
      genesisNode.toLowerCase() === addresses.GenesisNode.toLowerCase()) {
    console.log("\n🎉 IvyBond is now fully configured!");
    console.log("✅ You can now mint Bond NFTs!");
  } else {
    console.log("\n⚠️  Some configurations may have failed. Please retry.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
