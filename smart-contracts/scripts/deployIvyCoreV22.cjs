const hre = require('hardhat');

/**
 * Deploy V2.2 - Whitepaper Compliant Power Calculation
 *
 * Changes:
 * - Genesis Node 10% boost applies ONLY to deposit power
 * - Compound 10% bonus is separate (no double boost)
 * - Formula: effective = depositPower × (1 + genesisBoost) + compoundPower
 *
 * Example:
 * - Deposit 65,000 USDT → depositPower = 32,500
 * - Genesis 10% boost → 32,500 × 1.1 = 35,750
 * - Compound 300 IVY × 1.1 → compoundPower = 330
 * - Effective = 35,750 + 330 = 36,080
 */

async function main() {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const [deployer] = await hre.ethers.getSigners();
    console.log('=== Deploy V2.2 (Whitepaper Compliant Power) ===');
    console.log('Deployer:', deployer.address);

    // Existing addresses
    const IVY_TOKEN = '0xd93ee28F81d0759748d273eac805e0f5053D7703';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';
    const MOCK_ORACLE = '0x92B2C824D9cE501734FD9f9C1076e3bf6944b3f5';
    const MOCK_USDT = '0x3c1fbf1F033EE19DA2870A5cd33cfFe5C27d30Fe';
    const MOCK_LP_MANAGER = '0x3348db2875DAeC4b69bEb79a9e20E84A93E2DEFd';

    // Step 1: Deploy new IvyBond (with getDepositPower function)
    console.log('\n1. Deploying IvyBond V2.2...');
    const IvyBond = await hre.ethers.getContractFactory('IvyBond');
    const ivyBond = await IvyBond.deploy(deployer.address, MOCK_LP_MANAGER, deployer.address);
    await ivyBond.waitForDeployment();
    const ivyBondAddr = await ivyBond.getAddress();
    console.log('   IvyBond V2.2:', ivyBondAddr);
    await delay(3000);

    // Step 2: Deploy new IvyCore
    console.log('\n2. Deploying IvyCore V2.2...');
    const IvyCore = await hre.ethers.getContractFactory('IvyCore');
    const ivyCore = await IvyCore.deploy(IVY_TOKEN);
    await ivyCore.waitForDeployment();
    const ivyCoreAddr = await ivyCore.getAddress();
    console.log('   IvyCore V2.2:', ivyCoreAddr);
    await delay(3000);

    // Step 3: Configure IvyBond
    console.log('\n3. Configuring IvyBond...');

    let tx = await ivyBond.setPaymentToken(MOCK_USDT);
    await tx.wait();
    console.log('   - PaymentToken set');
    await delay(2000);

    tx = await ivyBond.setIvyToken(IVY_TOKEN);
    await tx.wait();
    console.log('   - IvyToken set');
    await delay(2000);

    tx = await ivyBond.setIvyCore(ivyCoreAddr);
    await tx.wait();
    console.log('   - IvyCore set');
    await delay(2000);

    tx = await ivyBond.setGenesisNode(GENESIS_NODE);
    await tx.wait();
    console.log('   - GenesisNode set');
    await delay(2000);

    // Step 4: Configure IvyCore
    console.log('\n4. Configuring IvyCore...');

    tx = await ivyCore.setGenesisNode(GENESIS_NODE);
    await tx.wait();
    console.log('   - GenesisNode set');
    await delay(2000);

    tx = await ivyCore.setIvyBond(ivyBondAddr);
    await tx.wait();
    console.log('   - IvyBond set');
    await delay(2000);

    tx = await ivyCore.setOracle(MOCK_ORACLE);
    await tx.wait();
    console.log('   - Oracle set');
    await delay(2000);

    // Step 5: Update IvyToken minter
    console.log('\n5. Updating IvyToken minter...');
    const ivyToken = await hre.ethers.getContractAt('IvyToken', IVY_TOKEN);
    tx = await ivyToken.setMinter(ivyCoreAddr);
    await tx.wait();
    console.log('   - Minter updated');
    await delay(2000);

    // Step 6: Update MockLPManager
    console.log('\n6. Updating MockLPManager...');
    const MockLPManager = await hre.ethers.getContractAt('MockLPManager', MOCK_LP_MANAGER);
    tx = await MockLPManager.setIvyBond(ivyBondAddr);
    await tx.wait();
    console.log('   - MockLPManager updated');

    // Final verification
    console.log('\n=== Deployment Complete ===');
    console.log('IvyBond V2.2:', ivyBondAddr);
    console.log('IvyCore V2.2:', ivyCoreAddr);
    console.log('\nUpdate addresses.json with:');
    console.log(`  "IvyBond": "${ivyBondAddr}"`);
    console.log(`  "IvyCore": "${ivyCoreAddr}"`);
    console.log('\nWhitepaper Compliant Power Calculation:');
    console.log('  - depositPower × (1 + genesisBoost) + compoundPower');
    console.log('  - Genesis 10% only on deposits, compound has its own 10%');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
