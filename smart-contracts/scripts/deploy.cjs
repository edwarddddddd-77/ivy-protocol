const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy MockOracle
  const MockOracle = await hre.ethers.getContractFactory("MockOracle");
  const initialPrice = hre.ethers.parseEther("100"); // $100
  const mockOracle = await MockOracle.deploy(initialPrice);
  await mockOracle.waitForDeployment();
  console.log("MockOracle deployed to:", await mockOracle.getAddress());

  // 2. Deploy GenesisNode
  const GenesisNode = await hre.ethers.getContractFactory("GenesisNode");
  const daoTreasury = deployer.address; // Use deployer as DAO for demo
  const genesisNode = await GenesisNode.deploy(daoTreasury);
  await genesisNode.waitForDeployment();
  console.log("GenesisNode deployed to:", await genesisNode.getAddress());

  // 3. Deploy IvyToken
  const IvyToken = await hre.ethers.getContractFactory("IvyToken");
  const ivyToken = await IvyToken.deploy();
  await ivyToken.waitForDeployment();
  console.log("IvyToken deployed to:", await ivyToken.getAddress());

  // 4. Deploy IvyCore
  const IvyCore = await hre.ethers.getContractFactory("IvyCore");
  const ivyCore = await IvyCore.deploy(
    await genesisNode.getAddress(),
    await mockOracle.getAddress(),
    await ivyToken.getAddress()
  );
  await ivyCore.waitForDeployment();
  console.log("IvyCore deployed to:", await ivyCore.getAddress());

  // 5. Setup Permissions
  // Transfer minting rights to IvyCore
  await ivyToken.setMinter(await ivyCore.getAddress());
  console.log("IvyToken minter set to IvyCore");

  // 6. Save Contract Addresses for Frontend
  const fs = require("fs");
  const addresses = {
    MockOracle: await mockOracle.getAddress(),
    GenesisNode: await genesisNode.getAddress(),
    IvyToken: await ivyToken.getAddress(),
    IvyCore: await ivyCore.getAddress(),
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

  // 7. Save ABIs
  const artifactsDir = "/home/ubuntu/ivy-protocol/smart-contracts/artifacts/contracts";
  const contracts = ["IvyCore", "GenesisNode", "IvyToken", "MockOracle"];
  
  const abis = {};
  contracts.forEach(contract => {
    const artifact = require(`${artifactsDir}/${contract}.sol/${contract}.json`);
    abis[contract] = artifact.abi;
  });

  fs.writeFileSync(
    `${clientDir}/abis.json`,
    JSON.stringify(abis, null, 2)
  );
  console.log("Contract ABIs saved to client/src/contracts/abis.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
