const hre = require('hardhat');

/**
 * Upgrade IvyCore - Fix: getDirectReferrals now shows real-time rewards
 */

async function main() {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const [deployer] = await hre.ethers.getSigners();
    console.log('=== Upgrade IvyCore ===');
    console.log('Deployer:', deployer.address);

    // Existing addresses
    const IVY_TOKEN = '0xd93ee28F81d0759748d273eac805e0f5053D7703';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';
    const MOCK_ORACLE = '0x92B2C824D9cE501734FD9f9C1076e3bf6944b3f5';
    const IVY_BOND = '0x4301A2E67c800835BdBfF3cb385D3287Ac7B6B57';

    // Step 1: Deploy new IvyCore
    console.log('\n1. Deploying new IvyCore...');
    const IvyCore = await hre.ethers.getContractFactory('IvyCore');
    const ivyCore = await IvyCore.deploy(IVY_TOKEN);
    await ivyCore.waitForDeployment();
    const ivyCoreAddr = await ivyCore.getAddress();
    console.log('   New IvyCore:', ivyCoreAddr);
    await delay(3000);

    // Step 2: Configure IvyCore
    console.log('\n2. Configuring IvyCore...');

    let tx = await ivyCore.setGenesisNode(GENESIS_NODE);
    await tx.wait();
    console.log('   - GenesisNode set');
    await delay(2000);

    tx = await ivyCore.setIvyBond(IVY_BOND);
    await tx.wait();
    console.log('   - IvyBond set');
    await delay(2000);

    tx = await ivyCore.setOracle(MOCK_ORACLE);
    await tx.wait();
    console.log('   - Oracle set');
    await delay(2000);

    // Step 3: Update IvyToken minter
    console.log('\n3. Updating IvyToken minter...');
    const ivyToken = await hre.ethers.getContractAt('IvyToken', IVY_TOKEN);
    tx = await ivyToken.setMinter(ivyCoreAddr);
    await tx.wait();
    console.log('   - Minter updated');
    await delay(2000);

    // Step 4: Update IvyBond to use new IvyCore
    console.log('\n4. Upgrading IvyBond -> IvyCore...');
    const ivyBond = await hre.ethers.getContractAt('IvyBond', IVY_BOND);
    tx = await ivyBond.upgradeIvyCore(ivyCoreAddr);
    await tx.wait();
    console.log('   - IvyBond upgraded to new IvyCore');

    console.log('\n=== Upgrade Complete ===');
    console.log('New IvyCore:', ivyCoreAddr);
    console.log('\nUpdate addresses.json with:');
    console.log(`  "IvyCore": "${ivyCoreAddr}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
