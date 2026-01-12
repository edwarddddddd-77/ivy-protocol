const hre = require('hardhat');

/**
 * Finish V2.0 configuration after partial deployment
 */

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log('=== Finishing V2.0 Configuration ===');
    console.log('Deployer:', deployer.address);

    // New contract addresses (from partial deployment)
    const NEW_IVY_CORE = '0xe740030549E04175E1Be30149a84Aa31ca928C40';
    const NEW_IVY_BOND = '0x43074789E0f1e671fD6f235E265862387474b4f1';

    // Existing addresses
    const IVY_TOKEN = '0xd93ee28F81d0759748d273eac805e0f5053D7703';
    const MOCK_LP_MANAGER = '0x3348db2875DAeC4b69bEb79a9e20E84A93E2DEFd';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';

    // Get contract instances
    const ivyCore = await hre.ethers.getContractAt('IvyCore', NEW_IVY_CORE);
    const ivyBond = await hre.ethers.getContractAt('IvyBond', NEW_IVY_BOND);
    const ivyToken = await hre.ethers.getContractAt('IvyToken', IVY_TOKEN);
    const lpManager = await hre.ethers.getContractAt('MockLPManager', MOCK_LP_MANAGER);

    // Check current state
    console.log('\n=== Current State ===');
    const currentIvyToken = await ivyBond.ivyToken().catch(() => 'not set');
    console.log('IvyBond.ivyToken:', currentIvyToken);

    const currentIvyCore = await ivyBond.ivyCore().catch(() => 'not set');
    console.log('IvyBond.ivyCore:', currentIvyCore);

    const currentGenesis = await ivyBond.genesisNode().catch(() => 'not set');
    console.log('IvyBond.genesisNode:', currentGenesis);

    const currentMinter = await ivyToken.minter();
    console.log('IvyToken.minter:', currentMinter);

    // Continue configuration with delays to avoid rate limiting
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Step 1: Set IvyToken on IvyBond (if not set)
    if (currentIvyToken === 'not set' || currentIvyToken === '0x0000000000000000000000000000000000000000') {
        console.log('\n1. Setting IvyToken on IvyBond...');
        const tx1 = await ivyBond.setIvyToken(IVY_TOKEN);
        await tx1.wait();
        console.log('   Done');
        await delay(2000);
    } else {
        console.log('\n1. IvyToken already set on IvyBond');
    }

    // Step 2: Set IvyCore on IvyBond (if not set)
    if (currentIvyCore === 'not set' || currentIvyCore === '0x0000000000000000000000000000000000000000') {
        console.log('\n2. Setting IvyCore on IvyBond...');
        const tx2 = await ivyBond.setIvyCore(NEW_IVY_CORE);
        await tx2.wait();
        console.log('   Done');
        await delay(2000);
    } else {
        console.log('\n2. IvyCore already set on IvyBond');
    }

    // Step 3: Set GenesisNode on IvyBond (if not set)
    if (currentGenesis === 'not set' || currentGenesis === '0x0000000000000000000000000000000000000000') {
        console.log('\n3. Setting GenesisNode on IvyBond...');
        const tx3 = await ivyBond.setGenesisNode(GENESIS_NODE);
        await tx3.wait();
        console.log('   Done');
        await delay(2000);
    } else {
        console.log('\n3. GenesisNode already set on IvyBond');
    }

    // Step 4: Update IvyToken minter (if needed)
    if (currentMinter.toLowerCase() !== NEW_IVY_CORE.toLowerCase()) {
        console.log('\n4. Updating IvyToken minter...');
        const tx4 = await ivyToken.setMinter(NEW_IVY_CORE);
        await tx4.wait();
        console.log('   Done');
        await delay(2000);
    } else {
        console.log('\n4. IvyToken minter already correct');
    }

    // Step 5: Update MockLPManager
    console.log('\n5. Updating MockLPManager...');
    try {
        const tx5 = await lpManager.setIvyBond(NEW_IVY_BOND);
        await tx5.wait();
        console.log('   Done');
    } catch (e) {
        console.log('   Skipped or error:', e.message);
    }

    // Final verification
    console.log('\n=== Final Verification ===');
    await delay(2000);

    const finalMinter = await ivyToken.minter();
    console.log('IvyToken.minter:', finalMinter, finalMinter.toLowerCase() === NEW_IVY_CORE.toLowerCase() ? '✓' : '✗');

    const finalIvyBond = await ivyCore.ivyBond();
    console.log('IvyCore.ivyBond:', finalIvyBond, finalIvyBond.toLowerCase() === NEW_IVY_BOND.toLowerCase() ? '✓' : '✗');

    const finalIvyCore = await ivyBond.ivyCore();
    console.log('IvyBond.ivyCore:', finalIvyCore, finalIvyCore.toLowerCase() === NEW_IVY_CORE.toLowerCase() ? '✓' : '✗');

    console.log('\n=== Configuration Complete ===');
    console.log('New IvyCore:', NEW_IVY_CORE);
    console.log('New IvyBond:', NEW_IVY_BOND);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
