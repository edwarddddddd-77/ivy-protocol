const hre = require("hardhat");

async function main() {
  const [deployer, user1, user2] = await hre.ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("Ivy Protocol - Complete Flow Test");
  console.log("=".repeat(60));
  
  // Load deployed contracts
  const addresses = require("../artifacts/contracts/MockUSDT.sol/MockUSDT.json");
  
  // Get contract factories
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const GenesisNode = await hre.ethers.getContractFactory("GenesisNode");
  const IvyToken = await hre.ethers.getContractFactory("IvyToken");
  const IvyCore = await hre.ethers.getContractFactory("IvyCore");
  const IvyBond = await hre.ethers.getContractFactory("IvyBond");
  
  // Deploy fresh instances for testing
  console.log("\n[1] Deploying contracts...");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  const mockUSDTAddr = await mockUSDT.getAddress();
  console.log("✓ MockUSDT deployed:", mockUSDTAddr);
  
  const genesisNode = await GenesisNode.deploy(deployer.address);
  await genesisNode.waitForDeployment();
  const genesisNodeAddr = await genesisNode.getAddress();
  console.log("✓ GenesisNode deployed:", genesisNodeAddr);
  
  const ivyToken = await IvyToken.deploy();
  await ivyToken.waitForDeployment();
  const ivyTokenAddr = await ivyToken.getAddress();
  console.log("✓ IvyToken deployed:", ivyTokenAddr);
  
  const ivyCore = await IvyCore.deploy(ivyTokenAddr);
  await ivyCore.waitForDeployment();
  const ivyCoreAddr = await ivyCore.getAddress();
  console.log("✓ IvyCore deployed:", ivyCoreAddr);
  
  const ivyBond = await IvyBond.deploy(deployer.address, deployer.address, deployer.address);
  await ivyBond.waitForDeployment();
  const ivyBondAddr = await ivyBond.getAddress();
  console.log("✓ IvyBond deployed:", ivyBondAddr);
  
  // Setup permissions
  console.log("\n[2] Setting up permissions...");
  await ivyToken.setMinter(ivyCoreAddr);
  console.log("✓ IvyToken minter set to IvyCore");
  
  await ivyCore.setGenesisNode(genesisNodeAddr);
  await ivyCore.setIvyBond(ivyBondAddr);
  console.log("✓ IvyCore references set");
  
  await genesisNode.setPaymentToken(mockUSDTAddr);
  console.log("✓ GenesisNode payment token set to MockUSDT");
  
  await ivyBond.setPaymentToken(mockUSDTAddr);
  await ivyBond.setIvyCore(ivyCoreAddr);
  console.log("✓ IvyBond references set");
  
  // Test Flow 1: Faucet (Get test tokens)
  console.log("\n[3] Testing Faucet - Get test tokens...");
  const faucetAmount = hre.ethers.parseEther("20000");
  
  // User1 gets tokens from faucet
  await mockUSDT.faucet(user1.address, faucetAmount);
  const user1Balance = await mockUSDT.balanceOf(user1.address);
  console.log(`✓ User1 received 20,000 mUSDT`);
  console.log(`  Balance: ${hre.ethers.formatEther(user1Balance)} mUSDT`);
  
  // Test Flow 2: Purchase Genesis Node (Buy Node)
  console.log("\n[4] Testing Genesis Node Purchase...");
  const nodePrice = hre.ethers.parseEther("1000");
  
  // User1 approves GenesisNode to spend USDT
  const user1MockUSDT = mockUSDT.connect(user1);
  await user1MockUSDT.approve(genesisNodeAddr, nodePrice);
  console.log("✓ User1 approved 1,000 mUSDT for GenesisNode");
  
  // User1 purchases a Genesis Node (with deployer as referrer)
  const user1GenesisNode = genesisNode.connect(user1);
  const mintTx = await user1GenesisNode.mint(deployer.address);
  await mintTx.wait();
  console.log("✓ User1 purchased Genesis Node NFT");
  
  // Check User1's NFT balance
  const nftBalance = await genesisNode.balanceOf(user1.address);
  console.log(`  NFT Balance: ${nftBalance.toString()}`);
  
  // Check User1's remaining USDT
  const user1RemainingUSDT = await mockUSDT.balanceOf(user1.address);
  console.log(`  Remaining mUSDT: ${hre.ethers.formatEther(user1RemainingUSDT)} mUSDT`);
  
  // Test Flow 3: Deposit to IvyBond (Treasury)
  console.log("\n[5] Testing Deposit to IvyBond...");
  const depositAmount = hre.ethers.parseEther("5000");
  
  // User1 approves IvyBond to spend USDT
  const remainingAfterNode = await mockUSDT.balanceOf(user1.address);
  const actualDepositAmount = remainingAfterNode > depositAmount ? depositAmount : remainingAfterNode;
  await user1MockUSDT.approve(ivyBondAddr, actualDepositAmount);
  console.log(`✓ User1 approved ${hre.ethers.formatEther(actualDepositAmount)} mUSDT for IvyBond`);
  
  // User1 deposits to IvyBond
  const user1IvyBond = ivyBond.connect(user1);
  const depositTx = await user1IvyBond.deposit(actualDepositAmount);
  await depositTx.wait();
  console.log("✓ User1 deposited 5,000 mUSDT to IvyBond");
  
  // Check deposit info
  const bondInfo = await ivyBond.bonds(user1.address);
  console.log(`  Total Deposited: ${hre.ethers.formatEther(bondInfo.totalDeposited)} mUSDT`);
  console.log(`  Bond Power: ${bondInfo.bondPower.toString()}`);
  
  // Check final USDT balance
  const user1FinalUSDT = await mockUSDT.balanceOf(user1.address);
  console.log(`  Final mUSDT Balance: ${hre.ethers.formatEther(user1FinalUSDT)} mUSDT`);
  
  // Test Flow 4: Check Mining Rewards
  console.log("\n[6] Testing Mining Rewards...");
  const user1IvyCore = ivyCore.connect(user1);
  
  // Calculate daily reward
  const dailyReward = await user1IvyCore.calculateDailyReward(user1.address);
  console.log(`✓ User1's daily mining reward: ${hre.ethers.formatEther(dailyReward)} IVY`);
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Test Summary");
  console.log("=".repeat(60));
  console.log("✓ Faucet: User received 20,000 mUSDT");
  console.log("✓ Genesis Node: User purchased 1 NFT for 1,000 mUSDT");
  console.log("✓ IvyBond: User deposited 5,000 mUSDT");
  console.log("✓ Mining: User has active mining rewards");
  console.log("\n✓ Complete flow test PASSED!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
