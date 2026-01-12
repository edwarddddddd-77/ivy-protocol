const hre = require('hardhat');

/**
 * V2.0 Deployment Script - Real-time Referral Rewards
 *
 * This script redeploys IvyCore (with real-time referral) and IvyBond.
 *
 * Changes in V2.0:
 * - Referral rewards accumulate in real-time (not just on harvest)
 * - Referrers can harvest/compound their rewards independently
 * - Mining rewards tracked in totalRewardsEarned
 */

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log('=== V2.0 Deployment: Real-time Referral Rewards ===');
    console.log('Deployer:', deployer.address);
    console.log('');

    // Existing addresses (from addresses.json)
    const IVY_TOKEN = '0xd93ee28F81d0759748d273eac805e0f5053D7703';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';
    const MOCK_ORACLE = '0x92B2C824D9cE501734FD9f9C1076e3bf6944b3f5';
    const MOCK_USDT = '0x3c1fbf1F033EE19DA2870A5cd33cfFe5C27d30Fe';
    const MOCK_LP_MANAGER = '0x3348db2875DAeC4b69bEb79a9e20E84A93E2DEFd';

    // Wallets (using deployer for testnet)
    const RWA_WALLET = deployer.address;
    const RESERVE_POOL = deployer.address;

    // ========== STEP 1: Deploy new IvyCore ==========
    console.log('1. Deploying new IvyCore V2.0...');
    const IvyCore = await hre.ethers.getContractFactory('IvyCore');
    const ivyCore = await IvyCore.deploy(IVY_TOKEN);
    await ivyCore.waitForDeployment();
    const ivyCoreAddr = await ivyCore.getAddress();
    console.log('   IvyCore deployed to:', ivyCoreAddr);

    // ========== STEP 2: Deploy new IvyBond ==========
    console.log('\n2. Deploying new IvyBond...');
    const IvyBond = await hre.ethers.getContractFactory('IvyBond');
    const ivyBond = await IvyBond.deploy(RWA_WALLET, MOCK_LP_MANAGER, RESERVE_POOL);
    await ivyBond.waitForDeployment();
    const ivyBondAddr = await ivyBond.getAddress();
    console.log('   IvyBond deployed to:', ivyBondAddr);

    // ========== STEP 3: Configure IvyCore ==========
    console.log('\n3. Configuring IvyCore...');

    let tx = await ivyCore.setGenesisNode(GENESIS_NODE);
    await tx.wait();
    console.log('   - GenesisNode set');

    tx = await ivyCore.setIvyBond(ivyBondAddr);
    await tx.wait();
    console.log('   - IvyBond set');

    tx = await ivyCore.setOracle(MOCK_ORACLE);
    await tx.wait();
    console.log('   - Oracle set');

    // ========== STEP 4: Configure IvyBond ==========
    console.log('\n4. Configuring IvyBond...');

    tx = await ivyBond.setPaymentToken(MOCK_USDT);
    await tx.wait();
    console.log('   - PaymentToken (USDT) set');

    tx = await ivyBond.setIvyToken(IVY_TOKEN);
    await tx.wait();
    console.log('   - IvyToken set');

    tx = await ivyBond.setIvyCore(ivyCoreAddr);
    await tx.wait();
    console.log('   - IvyCore set');

    tx = await ivyBond.setGenesisNode(GENESIS_NODE);
    await tx.wait();
    console.log('   - GenesisNode set');

    // ========== STEP 5: Update IvyToken minter ==========
    console.log('\n5. Updating IvyToken minter...');
    const IvyToken = await hre.ethers.getContractAt('IvyToken', IVY_TOKEN);
    tx = await IvyToken.setMinter(ivyCoreAddr);
    await tx.wait();
    console.log('   - IvyToken minter updated to new IvyCore');

    // ========== STEP 6: Update MockLPManager ==========
    console.log('\n6. Updating MockLPManager...');
    const MockLPManager = await hre.ethers.getContractAt('MockLPManager', MOCK_LP_MANAGER);
    tx = await MockLPManager.setIvyBond(ivyBondAddr);
    await tx.wait();
    console.log('   - MockLPManager.ivyBond updated');

    // ========== Verification ==========
    console.log('\n=== Verification ===');

    const verifyMinter = await IvyToken.minter();
    console.log('IvyToken.minter():', verifyMinter, verifyMinter.toLowerCase() === ivyCoreAddr.toLowerCase() ? '✓' : '✗');

    const verifyIvyBond = await ivyCore.ivyBond();
    console.log('IvyCore.ivyBond():', verifyIvyBond, verifyIvyBond.toLowerCase() === ivyBondAddr.toLowerCase() ? '✓' : '✗');

    const verifyIvyCore = await ivyBond.ivyCore();
    console.log('IvyBond.ivyCore():', verifyIvyCore, verifyIvyCore.toLowerCase() === ivyCoreAddr.toLowerCase() ? '✓' : '✗');

    // ========== Summary ==========
    console.log('\n=== Deployment Complete ===');
    console.log('New IvyCore:', ivyCoreAddr);
    console.log('New IvyBond:', ivyBondAddr);
    console.log('\nUpdate client/src/contracts/addresses.json:');
    console.log(JSON.stringify({
        "IvyCore": ivyCoreAddr,
        "IvyBond": ivyBondAddr
    }, null, 2));
    console.log('\nNOTE: Existing bonds on the old contract will not be migrated.');
    console.log('Users need to create new bonds on the new contract.');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
