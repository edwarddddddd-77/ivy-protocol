const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

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
  const initialPrice = hre.ethers.parseEther("100"); // $100
  const mockOracle = await MockOracle.deploy(initialPrice);
  await mockOracle.waitForDeployment();
  const mockOracleAddr = await mockOracle.getAddress();
  console.log("MockOracle deployed to:", mockOracleAddr);

  // 3. Deploy GenesisNode
  console.log("\n3. Deploying GenesisNode...");
  const GenesisNode = await hre.ethers.getContractFactory("GenesisNode");
  const daoTreasury = deployer.address;
  const genesisNode = await GenesisNode.deploy(daoTreasury);
  await genesisNode.waitForDeployment();
  const genesisNodeAddr = await genesisNode.getAddress();
  console.log("GenesisNode deployed to:", genesisNodeAddr);

  // 4. Deploy IvyToken
  console.log("\n4. Deploying IvyToken...");
  const IvyToken = await hre.ethers.getContractFactory("IvyToken");
  const ivyToken = await IvyToken.deploy();
  await ivyToken.waitForDeployment();
  const ivyTokenAddr = await ivyToken.getAddress();
  console.log("IvyToken deployed to:", ivyTokenAddr);

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
  // Constructor params: rwaWallet, liquidityPool, reservePool
  const rwaWallet = deployer.address;      // 40% - Tranche A
  const liquidityPool = deployer.address;  // 50% - Tranche B
  const reservePool = deployer.address;    // 10% - Tranche C
  
  const ivyBond = await IvyBond.deploy(
    rwaWallet,
    liquidityPool,
    reservePool
  );
  await ivyBond.waitForDeployment();
  const ivyBondAddr = await ivyBond.getAddress();
  console.log("IvyBond deployed to:", ivyBondAddr);

  // 7. Setup Permissions
  console.log("\n7. Setting up permissions...");
  await ivyToken.setMinter(ivyCoreAddr);
  console.log("IvyToken minter set to IvyCore");
  
  // 7b. Set IvyCore references
  await ivyCore.setGenesisNode(genesisNodeAddr);
  console.log("IvyCore GenesisNode reference set");
  await ivyCore.setIvyBond(ivyBondAddr);
  console.log("IvyCore IvyBond reference set");
  
  // 7d. Set GenesisNode payment token
  await genesisNode.setPaymentToken(mockUSDTAddr);
  console.log("GenesisNode payment token set to MockUSDT");
  
  // 7e. Set GenesisNode IvyBond reference (for deposit referral binding)
  await genesisNode.setIvyBond(ivyBondAddr);
  console.log("GenesisNode IvyBond reference set");
  
  // 7f. Set IvyBond GenesisNode reference (for referral binding on deposit)
  await ivyBond.setGenesisNode(genesisNodeAddr);
  console.log("IvyBond GenesisNode reference set");
  
  // 7c. Set IvyBond references
  await ivyBond.setPaymentToken(mockUSDTAddr);
  console.log("IvyBond payment token set to MockUSDT");
  await ivyBond.setIvyCore(ivyCoreAddr);
  console.log("IvyBond IvyCore reference set");

  // 8. Save Contract Addresses for Frontend
  console.log("\n8. Saving addresses to frontend...");
  const fs = require("fs");
  const addresses = {
    MockOracle: mockOracleAddr,
    MockUSDT: mockUSDTAddr,
    GenesisNode: genesisNodeAddr,
    IvyToken: ivyTokenAddr,
    IvyCore: ivyCoreAddr,
    IvyBond: ivyBondAddr
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

  // 9. Save ABIs
  console.log("\n9. Saving ABIs...");
  const artifactsDir = "/home/ubuntu/ivy-protocol/smart-contracts/artifacts/contracts";
  const contracts = ["IvyCore", "GenesisNode", "IvyToken", "MockOracle", "MockUSDT", "IvyBond"];
  
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

  console.log("\n✓ Deployment complete!");
  console.log("\nDeployed Addresses:");
  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
