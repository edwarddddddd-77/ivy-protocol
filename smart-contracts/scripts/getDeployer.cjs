const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer Address:", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
