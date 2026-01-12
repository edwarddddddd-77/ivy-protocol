const hre = require('hardhat');

/**
 * Finish V2.2 configuration after partial deployment
 */

async function main() {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const [deployer] = await hre.ethers.getSigners();
    console.log('=== Finishing V2.2 Configuration ===');
    console.log('Deployer:', deployer.address);

    // New contract addresses
    const NEW_IVY_BOND = '0x4301A2E67c800835BdBfF3cb385D3287Ac7B6B57';
    const NEW_IVY_CORE = '0xc8a3B7c788e1487067F4544D74A58b969526060b';

    // Existing addresses
    const IVY_TOKEN = '0xd93ee28F81d0759748d273eac805e0f5053D7703';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';
    const MOCK_ORACLE = '0x92B2C824D9cE501734FD9f9C1076e3bf6944b3f5';
    const MOCK_LP_MANAGER = '0x3348db2875DAeC4b69bEb79a9e20E84A93E2DEFd';

    const ivyCore = await hre.ethers.getContractAt('IvyCore', NEW_IVY_CORE);
    const ivyToken = await hre.ethers.getContractAt('IvyToken', IVY_TOKEN);
    const mockLPManager = await hre.ethers.getContractAt('MockLPManager', MOCK_LP_MANAGER);

    // Check what's already configured
    console.log('\n=== Checking Current State ===');

    const currentGenesisNode = await ivyCore.genesisNode().catch(() => 'not set');
    console.log('IvyCore.genesisNode:', currentGenesisNode);

    const currentIvyBond = await ivyCore.ivyBond().catch(() => 'not set');
    console.log('IvyCore.ivyBond:', currentIvyBond);

    const currentOracle = await ivyCore.oracle().catch(() => 'not set');
    console.log('IvyCore.oracle:', currentOracle);

    const currentMinter = await ivyToken.minter().catch(() => 'not set');
    console.log('IvyToken.minter:', currentMinter);

    // Continue configuration
    console.log('\n=== Configuring IvyCore ===');

    if (currentGenesisNode === '0x0000000000000000000000000000000000000000') {
        console.log('Setting GenesisNode...');
        const tx1 = await ivyCore.setGenesisNode(GENESIS_NODE);
        await tx1.wait();
        console.log('   - GenesisNode set');
        await delay(3000);
    } else {
        console.log('GenesisNode already set');
    }

    if (currentIvyBond === '0x0000000000000000000000000000000000000000') {
        console.log('Setting IvyBond...');
        const tx2 = await ivyCore.setIvyBond(NEW_IVY_BOND);
        await tx2.wait();
        console.log('   - IvyBond set');
        await delay(3000);
    } else {
        console.log('IvyBond already set');
    }

    if (currentOracle === '0x0000000000000000000000000000000000000000') {
        console.log('Setting Oracle...');
        const tx3 = await ivyCore.setOracle(MOCK_ORACLE);
        await tx3.wait();
        console.log('   - Oracle set');
        await delay(3000);
    } else {
        console.log('Oracle already set');
    }

    // Update IvyToken minter
    if (currentMinter.toLowerCase() !== NEW_IVY_CORE.toLowerCase()) {
        console.log('\n=== Updating IvyToken Minter ===');
        const tx4 = await ivyToken.setMinter(NEW_IVY_CORE);
        await tx4.wait();
        console.log('   - Minter updated');
        await delay(3000);
    } else {
        console.log('\nIvyToken minter already correct');
    }

    // Update MockLPManager
    console.log('\n=== Updating MockLPManager ===');
    try {
        const tx5 = await mockLPManager.setIvyBond(NEW_IVY_BOND);
        await tx5.wait();
        console.log('   - MockLPManager updated');
    } catch (e) {
        console.log('   MockLPManager update skipped:', e.message);
    }

    // Final verification
    console.log('\n=== Final Verification ===');
    await delay(2000);

    const finalGenesisNode = await ivyCore.genesisNode();
    console.log('IvyCore.genesisNode:', finalGenesisNode, finalGenesisNode === GENESIS_NODE ? '✓' : '✗');

    const finalIvyBond = await ivyCore.ivyBond();
    console.log('IvyCore.ivyBond:', finalIvyBond, finalIvyBond.toLowerCase() === NEW_IVY_BOND.toLowerCase() ? '✓' : '✗');

    const finalOracle = await ivyCore.oracle();
    console.log('IvyCore.oracle:', finalOracle, finalOracle === MOCK_ORACLE ? '✓' : '✗');

    const finalMinter = await ivyToken.minter();
    console.log('IvyToken.minter:', finalMinter, finalMinter.toLowerCase() === NEW_IVY_CORE.toLowerCase() ? '✓' : '✗');

    console.log('\n=== Configuration Complete ===');
    console.log('IvyBond V2.2:', NEW_IVY_BOND);
    console.log('IvyCore V2.2:', NEW_IVY_CORE);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
