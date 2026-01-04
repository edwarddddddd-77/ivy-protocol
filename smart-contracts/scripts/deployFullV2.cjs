const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Wallet addresses (using deployer for testnet)
  const daoTreasury = deployer.address;
  const rwaWallet = deployer.address;      // 40% - Tranche A
  const liquidityPool = deployer.address;  // 50% - Tranche B
  const reservePool = deployer.address;    // 10% - Tranche C
  const operationsWallet = deployer.address;

  // PancakeSwap Router on BSC Testnet
  const PANCAKE_ROUTER_TESTNET = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";

  // 1. Deploy MockUSDT
  console.log("\n1. Deploying MockUSDT...");
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  const mockUSDTAddr = await mockUSDT.getAddress();
  console.log("MockUSDT deployed to:", mockUSDTAddr);

  // 2. Deploy MockOracle
  console.log("\n2. Deploying MockOracle...");
  const MockOracle = await hre.ethers.getContractFactory("MockOracle");
  const initialPrice = hre.ethers.parseEther("1"); // $1.00
  const mockOracle = await MockOracle.deploy(initialPrice);
  await mockOracle.waitForDeployment();
  const mockOracleAddr = await mockOracle.getAddress();
  console.log("MockOracle deployed to:", mockOracleAddr);

  // 3. Deploy GenesisNode
  console.log("\n3. Deploying GenesisNode...");
  const GenesisNode = await hre.ethers.getContractFactory("GenesisNode");
  const genesisNode = await GenesisNode.deploy(daoTreasury);
  await genesisNode.waitForDeployment();
  const genesisNodeAddr = await genesisNode.getAddress();
  console.log("GenesisNode deployed to:", genesisNodeAddr);

  // 4. Deploy IvyToken (with 30M pre-mint to operationsWallet)
  console.log("\n4. Deploying IvyToken...");
  console.log("   Pre-minting 30,000,000 IVY to Operations Wallet:", operationsWallet);
  const IvyToken = await hre.ethers.getContractFactory("IvyToken");
  const ivyToken = await IvyToken.deploy(operationsWallet);
  await ivyToken.waitForDeployment();
  const ivyTokenAddr = await ivyToken.getAddress();
  console.log("IvyToken deployed to:", ivyTokenAddr);
  console.log("   30M IVY pre-minted to:", operationsWallet);

  // 5. Deploy IvyCore
  console.log("\n5. Deploying IvyCore...");
  const IvyCore = await hre.ethers.getContractFactory("IvyCore");
  const ivyCore = await IvyCore.deploy(ivyTokenAddr);
  await ivyCore.waitForDeployment();
  const ivyCoreAddr = await ivyCore.getAddress();
  console.log("IvyCore deployed to:", ivyCoreAddr);

  // 6. Deploy IvyBond (ERC721 Bond NFT)
  console.log("\n6. Deploying IvyBond (ERC721 Bond NFT)...");
  const IvyBond = await hre.ethers.getContractFactory("IvyBond");
  const ivyBond = await IvyBond.deploy(rwaWallet, liquidityPool, reservePool);
  await ivyBond.waitForDeployment();
  const ivyBondAddr = await ivyBond.getAddress();
  console.log("IvyBond deployed to:", ivyBondAddr);

  // 7. Deploy DividendPool
  console.log("\n7. Deploying DividendPool...");
  const DividendPool = await hre.ethers.getContractFactory("DividendPool");
  const dividendPool = await DividendPool.deploy(mockUSDTAddr, ivyBondAddr);
  await dividendPool.waitForDeployment();
  const dividendPoolAddr = await dividendPool.getAddress();
  console.log("DividendPool deployed to:", dividendPoolAddr);

  // 8. Deploy Photosynthesis
  console.log("\n8. Deploying Photosynthesis...");
  const Photosynthesis = await hre.ethers.getContractFactory("Photosynthesis");
  const photosynthesis = await Photosynthesis.deploy(
    mockUSDTAddr,
    ivyTokenAddr,
    PANCAKE_ROUTER_TESTNET
  );
  await photosynthesis.waitForDeployment();
  const photosynthesisAddr = await photosynthesis.getAddress();
  console.log("Photosynthesis deployed to:", photosynthesisAddr);

  // 9. Setup Permissions
  console.log("\n9. Setting up permissions...");
  
  // IvyToken setup
  await ivyToken.setMinter(ivyCoreAddr);
  console.log("  - IvyToken minter set to IvyCore");
  await ivyToken.setOperationsWallet(operationsWallet);
  console.log("  - IvyToken operations wallet set");
  // Exclude core contracts from tax
  await ivyToken.batchSetExcludedFromTax([ivyCoreAddr, ivyBondAddr, PANCAKE_ROUTER_TESTNET], true);
  console.log("  - IvyToken tax exclusions set for IvyCore, IvyBond, PancakeRouter");
  
  // IvyCore setup
  await ivyCore.setGenesisNode(genesisNodeAddr);
  console.log("  - IvyCore GenesisNode reference set");
  await ivyCore.setIvyBond(ivyBondAddr);
  console.log("  - IvyCore IvyBond reference set");
  
  // GenesisNode setup
  await genesisNode.setPaymentToken(mockUSDTAddr);
  console.log("  - GenesisNode payment token set to MockUSDT");
  await genesisNode.setIvyBond(ivyBondAddr);
  console.log("  - GenesisNode IvyBond reference set");
  
  // IvyBond setup
  await ivyBond.setGenesisNode(genesisNodeAddr);
  console.log("  - IvyBond GenesisNode reference set");
  await ivyBond.setPaymentToken(mockUSDTAddr);
  console.log("  - IvyBond payment token set to MockUSDT");
  await ivyBond.setIvyCore(ivyCoreAddr);
  console.log("  - IvyBond IvyCore reference set");
  
  // DividendPool setup
  await dividendPool.setPhotosynthesis(photosynthesisAddr);
  console.log("  - DividendPool Photosynthesis reference set");
  
  // Photosynthesis setup
  await photosynthesis.setDividendPool(dividendPoolAddr);
  console.log("  - Photosynthesis DividendPool reference set");
  await photosynthesis.setPriceOracle(mockOracleAddr);
  console.log("  - Photosynthesis PriceOracle reference set");
  await photosynthesis.setRwaWallet(rwaWallet);
  console.log("  - Photosynthesis RWA wallet set");
  await photosynthesis.setKeeper(deployer.address);
  console.log("  - Photosynthesis keeper set to deployer");

  // 10. Save Contract Addresses for Frontend
  console.log("\n10. Saving addresses to frontend...");
  const fs = require("fs");
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
  
  const clientDir = "/home/ubuntu/ivy-protocol/client/src/contracts";
  if (!fs.existsSync(clientDir)){
      fs.mkdirSync(clientDir, { recursive: true });
  }
  
  fs.writeFileSync(
    `${clientDir}/addresses.json`,
    JSON.stringify(addresses, null, 2)
  );
  console.log("Contract addresses saved to client/src/contracts/addresses.json");

  // 11. Save ABIs
  console.log("\n11. Saving ABIs...");
  const artifactsDir = "/home/ubuntu/ivy-protocol/smart-contracts/artifacts/contracts";
  const contracts = ["IvyCore", "GenesisNode", "IvyToken", "MockOracle", "MockUSDT", "IvyBond", "DividendPool", "Photosynthesis"];
  
  const abis = {};
  contracts.forEach(contract => {
    try {
      const artifact = require(`${artifactsDir}/${contract}.sol/${contract}.json`);
      abis[contract] = artifact.abi;
      console.log(`  - ${contract} ABI saved`);
    } catch (e) {
      console.log(`  - Warning: Could not load ${contract} ABI`);
    }
  });

  fs.writeFileSync(
    `${clientDir}/abis.json`,
    JSON.stringify(abis, null, 2)
  );
  console.log("Contract ABIs saved to client/src/contracts/abis.json");

  console.log("\n" + "=".repeat(60));
  console.log("✓ DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\nDeployed Addresses:");
  console.log(JSON.stringify(addresses, null, 2));
  console.log("\nNetwork: BSC Testnet (Chain ID: 97)");
  console.log("Deployer:", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
