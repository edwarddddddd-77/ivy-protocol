const hre = require('hardhat');

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log('Deploying MockLPManager with account:', deployer.address);

    // Addresses from addresses.json
    const USDT_ADDRESS = '0x3c1fbf1F033EE19DA2870A5cd33cfFe5C27d30Fe';
    const IVY_BOND_ADDRESS = '0x1C0C20aED3620693A04D267294f9Af4d451E5B68';

    // Deploy MockLPManager
    console.log('\n1. Deploying MockLPManager...');
    const MockLPManager = await hre.ethers.getContractFactory('MockLPManager');
    const mockLPManager = await MockLPManager.deploy(USDT_ADDRESS);
    await mockLPManager.waitForDeployment();
    const mockLPManagerAddr = await mockLPManager.getAddress();
    console.log('   MockLPManager deployed to:', mockLPManagerAddr);

    // Configure MockLPManager
    console.log('\n2. Setting IvyBond on MockLPManager...');
    const tx1 = await mockLPManager.setIvyBond(IVY_BOND_ADDRESS);
    await tx1.wait();
    console.log('   IvyBond set successfully');

    // Update IvyBond's lpManager
    console.log('\n3. Updating IvyBond lpManager address...');
    const IvyBond = await hre.ethers.getContractAt('IvyBond', IVY_BOND_ADDRESS);

    // Get current wallets
    const rwaWallet = await IvyBond.rwaWallet();
    const reservePool = await IvyBond.reservePool();

    console.log('   Current rwaWallet:', rwaWallet);
    console.log('   Current reservePool:', reservePool);
    console.log('   New lpManager:', mockLPManagerAddr);

    const tx2 = await IvyBond.setWallets(rwaWallet, mockLPManagerAddr, reservePool);
    await tx2.wait();
    console.log('   IvyBond lpManager updated successfully');

    // Verify
    console.log('\n=== Verification ===');
    const newLpManager = await IvyBond.lpManager();
    console.log('IvyBond.lpManager():', newLpManager);
    console.log('Expected:', mockLPManagerAddr);
    console.log('Match:', newLpManager.toLowerCase() === mockLPManagerAddr.toLowerCase());

    console.log('\n=== Deployment Complete ===');
    console.log('MockLPManager:', mockLPManagerAddr);
    console.log('\nPlease update client/src/contracts/addresses.json with:');
    console.log(`  "MockLPManager": "${mockLPManagerAddr}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
