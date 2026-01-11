const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Already deployed contracts
const deployed = {
  MockUSDT: "0x3c1fbf1F033EE19DA2870A5cd33cfFe5C27d30Fe",
  MockOracle: "0x92B2C824D9cE501734FD9f9C1076e3bf6944b3f5",
  GenesisNode: "0x951e46DD61A308F8F919B59178818dc7ab83e685",
  IvyToken: "0xd93ee28F81d0759748d273eac805e0f5053D7703",
  IvyCore: "0x7cE47b9EdcD839Ea09fC176B700A172E4d691aF4",
  IvyBond: "0x1C0C20aED3620693A04D267294f9Af4d451E5B68"
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Continuing deployment...");
  console.log("Deployer:", deployer.address);

  const PANCAKE_ROUTER_TESTNET = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";

  // Deploy DividendPool
  console.log("\n7. Deploying DividendPool...");
  await sleep(3000); // Wait 3 seconds
  const DividendPool = await hre.ethers.getContractFactory("DividendPool");
  const dividendPool = await DividendPool.deploy(deployed.MockUSDT, deployed.IvyBond);
  await dividendPool.waitForDeployment();
  const dividendPoolAddr = await dividendPool.getAddress();
  console.log("   ✅", dividendPoolAddr);

  // Deploy Photosynthesis
  console.log("\n8. Deploying Photosynthesis...");
  await sleep(3000); // Wait 3 seconds
  const Photosynthesis = await hre.ethers.getContractFactory("Photosynthesis");
  const photosynthesis = await Photosynthesis.deploy(deployed.MockUSDT, deployed.IvyToken, PANCAKE_ROUTER_TESTNET);
  await photosynthesis.waitForDeployment();
  const photosynthesisAddr = await photosynthesis.getAddress();
  console.log("   ✅", photosynthesisAddr);

  // Complete addresses
  const addresses = {
    ...deployed,
    DividendPool: dividendPoolAddr,
    Photosynthesis: photosynthesisAddr
  };

  console.log("\n9. Setting up permissions...");
  const ivyToken = await hre.ethers.getContractAt("IvyToken", deployed.IvyToken);
  const ivyCore = await hre.ethers.getContractAt("IvyCore", deployed.IvyCore);
  const genesisNode = await hre.ethers.getContractAt("GenesisNode", deployed.GenesisNode);
  const ivyBond = await hre.ethers.getContractAt("IvyBond", deployed.IvyBond);
  const mockOracle = await hre.ethers.getContractAt("MockOracle", deployed.MockOracle);

  await sleep(2000);
  await ivyToken.setMinter(deployed.IvyCore);
  console.log("   ✅ IvyToken minter → IvyCore");

  await sleep(2000);
  await ivyToken.setOperationsWallet(deployer.address);
  console.log("   ✅ IvyToken operations wallet");

  await sleep(2000);
  await ivyToken.batchSetExcludedFromTax([deployed.IvyCore, deployed.IvyBond, PANCAKE_ROUTER_TESTNET], true);
  console.log("   ✅ Tax exclusions");

  await sleep(2000);
  await ivyCore.setGenesisNode(deployed.GenesisNode);
  console.log("   ✅ IvyCore → GenesisNode");

  await sleep(2000);
  await ivyCore.setIvyBond(deployed.IvyBond);
  console.log("   ✅ IvyCore → IvyBond");

  await sleep(2000);
  await ivyCore.setOracle(deployed.MockOracle);
  console.log("   ✅ IvyCore → Oracle");

  await sleep(2000);
  await genesisNode.setPaymentToken(deployed.MockUSDT);
  console.log("   ✅ GenesisNode payment token");

  await sleep(2000);
  await genesisNode.setIvyBond(deployed.IvyBond);
  console.log("   ✅ GenesisNode → IvyBond");

  await sleep(2000);
  await ivyBond.setGenesisNode(deployed.GenesisNode);
  console.log("   ✅ IvyBond → GenesisNode");

  await sleep(2000);
  await ivyBond.setPaymentToken(deployed.MockUSDT);
  console.log("   ✅ IvyBond payment token");

  await sleep(2000);
  await ivyBond.setIvyCore(deployed.IvyCore);
  console.log("   ✅ IvyBond → IvyCore");

  await sleep(2000);
  await ivyBond.setIvyToken(deployed.IvyToken);
  console.log("   ✅ IvyBond → IvyToken");

  await sleep(2000);
  await dividendPool.setPhotosynthesis(photosynthesisAddr);
  console.log("   ✅ DividendPool → Photosynthesis");

  await sleep(2000);
  await photosynthesis.setDividendPool(dividendPoolAddr);
  console.log("   ✅ Photosynthesis → DividendPool");

  await sleep(2000);
  await photosynthesis.setPriceOracle(deployed.MockOracle);
  console.log("   ✅ Photosynthesis → Oracle");

  await sleep(2000);
  await photosynthesis.setRwaWallet(deployer.address);
  console.log("   ✅ Photosynthesis RWA wallet");

  await sleep(2000);
  await photosynthesis.setKeeper(deployer.address);
  console.log("   ✅ Photosynthesis keeper");

  console.log("\n10. Setting IVY price...");
  await sleep(2000);
  await mockOracle.setAssetPrice(deployed.IvyToken, hre.ethers.parseEther("1"));
  console.log("   ✅ IVY price = 1.00 USDT");

  // Save addresses
  console.log("\n11. Saving files...");
  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("   ✅ Addresses saved");

  // Save ABIs
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  const contracts = ["IvyCore", "GenesisNode", "IvyToken", "MockOracle", "MockUSDT", "IvyBond", "DividendPool", "Photosynthesis"];
  const abis = {};

  contracts.forEach(contractName => {
    try {
      const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      abis[contractName] = artifact.abi;
      console.log(`   ✅ ${contractName}`);
    } catch (error) {
      console.log(`   ⚠️  ${contractName} ABI not found`);
    }
  });

  const abisPath = path.join(__dirname, "../../client/src/contracts/abis.json");
  fs.writeFileSync(abisPath, JSON.stringify(abis, null, 2));

  console.log("\n" + "=".repeat(70));
  console.log("  DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));
  console.log("\n📋 All Addresses:");
  console.log(JSON.stringify(addresses, null, 2));
  console.log("\n✅ All contracts deployed!");
  console.log("✅ All permissions configured!");
  console.log("✅ IVY price set to $1.00!");
  console.log("✅ Compound bug fixed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
