const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("Account:", signer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "BNB");
}

main().catch(console.error);
