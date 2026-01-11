const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("=".repeat(70));
  console.log("  REDEPLOYING CONTRACTS WITH BUG FIX");
  console.log("=".repeat(70));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "BNB\n");

  // Wallet addresses (using deployer for testnet)
  const daoTreasury = deployer.address;
  const rwaWallet = deployer.address;
  const liquidityPool = deployer.address;
  const reservePool = deployer.address;
  const operationsWallet = deployer.address;
  const PANCAKE_ROUTER_TESTNET = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";

  // 1. Deploy MockUSDT
  console.log("1. Deploying MockUSDT...");
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  const mockUSDTAddr = await mockUSDT.getAddress();
  console.log("   ✅", mockUSDTAddr);

  // 2. Deploy MockOracle
  console.log("\n2. Deploying MockOracle...");
  const MockOracle = await hre.ethers.getContractFactory("MockOracle");
  const mockOracle = await MockOracle.deploy(hre.ethers.parseEther("1"));
  await mockOracle.waitForDeployment();
  const mockOracleAddr = await mockOracle.getAddress();
  console.log("   ✅", mockOracleAddr);

  // 3. Deploy GenesisNode
  console.log("\n3. Deploying GenesisNode...");
  const GenesisNode = await hre.ethers.getContractFactory("GenesisNode");
  const genesisNode = await GenesisNode.deploy(daoTreasury);
  await genesisNode.waitForDeployment();
  const genesisNodeAddr = await genesisNode.getAddress();
  console.log("   ✅", genesisNodeAddr);

  // 4. Deploy IvyToken
  console.log("\n4. Deploying IvyToken (pre-mint 30M to operations)...");
  const IvyToken = await hre.ethers.getContractFactory("IvyToken");
  const ivyToken = await IvyToken.deploy(operationsWallet);
  await ivyToken.waitForDeployment();
  const ivyTokenAddr = await ivyToken.getAddress();
  console.log("   ✅", ivyTokenAddr);

  // 5. Deploy IvyCore (WITH BUG FIX)
  console.log("\n5. Deploying IvyCore (WITH UNDERFLOW BUG FIX)...");
  const IvyCore = await hre.ethers.getContractFactory("IvyCore");
  const ivyCore = await IvyCore.deploy(ivyTokenAddr);
  await ivyCore.waitForDeployment();
  const ivyCoreAddr = await ivyCore.getAddress();
  console.log("   ✅", ivyCoreAddr);
  console.log("   🔧 FIX: Compound underflow bug fixed");

  // 6. Deploy IvyBond
  console.log("\n6. Deploying IvyBond...");
  const IvyBond = await hre.ethers.getContractFactory("IvyBond");
  const ivyBond = await IvyBond.deploy(rwaWallet, liquidityPool, reservePool);
  await ivyBond.waitForDeployment();
  const ivyBondAddr = await ivyBond.getAddress();
  console.log("   ✅", ivyBondAddr);

  // 7. Deploy DividendPool
  console.log("\n7. Deploying DividendPool...");
  const DividendPool = await hre.ethers.getContractFactory("DividendPool");
  const dividendPool = await DividendPool.deploy(mockUSDTAddr, ivyBondAddr);
  await dividendPool.waitForDeployment();
  const dividendPoolAddr = await dividendPool.getAddress();
  console.log("   ✅", dividendPoolAddr);

  // 8. Deploy Photosynthesis
  console.log("\n8. Deploying Photosynthesis...");
  const Photosynthesis = await hre.ethers.getContractFactory("Photosynthesis");
  const photosynthesis = await Photosynthesis.deploy(mockUSDTAddr, ivyTokenAddr, PANCAKE_ROUTER_TESTNET);
  await photosynthesis.waitForDeployment();
  const photosynthesisAddr = await photosynthesis.getAddress();
  console.log("   ✅", photosynthesisAddr);

  // 9. Setup Permissions
  console.log("\n9. Setting up permissions...");

  await ivyToken.setMinter(ivyCoreAddr);
  console.log("   ✅ IvyToken minter → IvyCore");

  await ivyToken.setOperationsWallet(operationsWallet);
  console.log("   ✅ IvyToken operations wallet set");

  await ivyToken.batchSetExcludedFromTax([ivyCoreAddr, ivyBondAddr, PANCAKE_ROUTER_TESTNET], true);
  console.log("   ✅ Tax exclusions set");

  await ivyCore.setGenesisNode(genesisNodeAddr);
  console.log("   ✅ IvyCore → GenesisNode");

  await ivyCore.setIvyBond(ivyBondAddr);
  console.log("   ✅ IvyCore → IvyBond");

  await ivyCore.setOracle(mockOracleAddr);
  console.log("   ✅ IvyCore → Oracle");

  await genesisNode.setPaymentToken(mockUSDTAddr);
  console.log("   ✅ GenesisNode payment token");

  await genesisNode.setIvyBond(ivyBondAddr);
  console.log("   ✅ GenesisNode → IvyBond");

  await ivyBond.setGenesisNode(genesisNodeAddr);
  console.log("   ✅ IvyBond → GenesisNode");

  await ivyBond.setPaymentToken(mockUSDTAddr);
  console.log("   ✅ IvyBond payment token");

  await ivyBond.setIvyCore(ivyCoreAddr);
  console.log("   ✅ IvyBond → IvyCore");

  await ivyBond.setIvyToken(ivyTokenAddr);
  console.log("   ✅ IvyBond → IvyToken");

  await dividendPool.setPhotosynthesis(photosynthesisAddr);
  console.log("   ✅ DividendPool → Photosynthesis");

  await photosynthesis.setDividendPool(dividendPoolAddr);
  console.log("   ✅ Photosynthesis → DividendPool");

  await photosynthesis.setPriceOracle(mockOracleAddr);
  console.log("   ✅ Photosynthesis → Oracle");

  await photosynthesis.setRwaWallet(rwaWallet);
  console.log("   ✅ Photosynthesis RWA wallet");

  await photosynthesis.setKeeper(deployer.address);
  console.log("   ✅ Photosynthesis keeper");

  // 10. Set IVY Price (CRITICAL for compound)
  console.log("\n10. Setting IVY price in Oracle...");
  await mockOracle.setAssetPrice(ivyTokenAddr, hre.ethers.parseEther("1"));
  console.log("   ✅ IVY price = 1.00 USDT");

  // 11. Save addresses
  console.log("\n11. Saving addresses to frontend...");
  const addresses = {
    MockOracle: mockOracleAddr,
    MockUSDT: mockUSDTAddr,
    GenesisNode: genesisNodeAddr,
    IvyToken: ivyTokenAddr,
    IvyCore: ivyCoreAddr,
    IvyBond: ivyBondAddr,
    DividendPool: dividendPoolAddr,
    Photosynthesis: photosynthesisAddr
  };

  const addressesPath = path.join(__dirname, "../../client/src/contracts/addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("   ✅ Saved to:", addressesPath);

  // 12. Save ABIs
  console.log("\n12. Saving ABIs...");
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
  console.log("   ✅ ABIs saved to:", abisPath);

  console.log("\n" + "=".repeat(70));
  console.log("  DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));
  console.log("\n📋 CONTRACT ADDRESSES:");
  console.log(JSON.stringify(addresses, null, 2));
  console.log("\n✅ All contracts deployed and configured");
  console.log("✅ IVY price set to $1.00");
  console.log("✅ Compound bug fixed!");
  console.log("\n💡 Next steps:");
  console.log("   1. Restart frontend dev server");
  console.log("   2. Test deposit → mining → compound flow");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
