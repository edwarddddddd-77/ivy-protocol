const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Fixing GenesisNode configuration...\n");

  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  const genesisNode = await hre.ethers.getContractAt("GenesisNode", addresses.GenesisNode);

  // Check current paymentToken
  console.log("Checking current paymentToken...");
  const currentToken = await genesisNode.paymentToken();
  console.log("Current paymentToken:", currentToken);
  console.log("Expected (MockUSDT):", addresses.MockUSDT);

  if (currentToken === "0x0000000000000000000000000000000000000000") {
    console.log("\n❌ Payment token NOT set! Setting it now...");

    const tx = await genesisNode.setPaymentToken(addresses.MockUSDT);
    console.log("Transaction hash:", tx.hash);

    await tx.wait();
    console.log("✅ Payment token set successfully!");

    // Verify
    const newToken = await genesisNode.paymentToken();
    console.log("\nVerification:");
    console.log("New paymentToken:", newToken);
    console.log("Match:", newToken.toLowerCase() === addresses.MockUSDT.toLowerCase() ? "✅" : "❌");
  } else {
    console.log("\n✅ Payment token already set correctly!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
