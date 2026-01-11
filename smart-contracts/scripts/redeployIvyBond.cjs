const hre = require('hardhat');

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log('Redeploying IvyBond with account:', deployer.address);

    // Current addresses
    const MOCK_USDT = '0x3c1fbf1F033EE19DA2870A5cd33cfFe5C27d30Fe';
    const MOCK_LP_MANAGER = '0x3348db2875DAeC4b69bEb79a9e20E84A93E2DEFd';
    const IVY_TOKEN = '0xd93ee28F81d0759748d273eac805e0f5053D7703';
    const IVY_CORE = '0x6e043D17660D1BECc7034524Fc8E95b1BDc0A99B';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';

    // Wallet addresses (using deployer for testnet)
    const RWA_WALLET = deployer.address;
    const RESERVE_POOL = deployer.address;

    // 1. Deploy new IvyBond
    console.log('\n1. Deploying new IvyBond...');
    const IvyBond = await hre.ethers.getContractFactory('IvyBond');
    const ivyBond = await IvyBond.deploy(RWA_WALLET, MOCK_LP_MANAGER, RESERVE_POOL);
    await ivyBond.waitForDeployment();
    const ivyBondAddr = await ivyBond.getAddress();
    console.log('   New IvyBond deployed to:', ivyBondAddr);

    // 2. Configure IvyBond
    console.log('\n2. Setting PaymentToken (USDT)...');
    let tx = await ivyBond.setPaymentToken(MOCK_USDT);
    await tx.wait();
    console.log('   PaymentToken set');

    console.log('\n3. Setting IvyToken...');
    tx = await ivyBond.setIvyToken(IVY_TOKEN);
    await tx.wait();
    console.log('   IvyToken set');

    console.log('\n4. Setting IvyCore...');
    tx = await ivyBond.setIvyCore(IVY_CORE);
    await tx.wait();
    console.log('   IvyCore set');

    console.log('\n5. Setting GenesisNode...');
    tx = await ivyBond.setGenesisNode(GENESIS_NODE);
    await tx.wait();
    console.log('   GenesisNode set');

    // 3. Update IvyCore to point to new IvyBond
    console.log('\n6. Updating IvyCore.ivyBond...');
    const IvyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);
    tx = await IvyCore.setIvyBond(ivyBondAddr);
    await tx.wait();
    console.log('   IvyCore.ivyBond updated');

    // 4. Update MockLPManager to point to new IvyBond
    console.log('\n7. Updating MockLPManager.ivyBond...');
    const MockLPManager = await hre.ethers.getContractAt('MockLPManager', MOCK_LP_MANAGER);
    tx = await MockLPManager.setIvyBond(ivyBondAddr);
    await tx.wait();
    console.log('   MockLPManager.ivyBond updated');

    // Verify
    console.log('\n=== Verification ===');
    const ivyCoreIvyBond = await IvyCore.ivyBond();
    console.log('IvyCore.ivyBond():', ivyCoreIvyBond);

    const lpManagerIvyBond = await MockLPManager.ivyBond();
    console.log('MockLPManager.ivyBond():', lpManagerIvyBond);

    const bondIvyCore = await ivyBond.ivyCore();
    console.log('IvyBond.ivyCore():', bondIvyCore);

    console.log('\n=== Deployment Complete ===');
    console.log('New IvyBond:', ivyBondAddr);
    console.log('\nPlease update client/src/contracts/addresses.json with:');
    console.log(`  "IvyBond": "${ivyBondAddr}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
