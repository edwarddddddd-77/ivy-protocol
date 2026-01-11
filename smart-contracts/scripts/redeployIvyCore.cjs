const hre = require('hardhat');

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log('Redeploying IvyCore with account:', deployer.address);

    // Current addresses from addresses.json
    const IVY_TOKEN = '0xd93ee28F81d0759748d273eac805e0f5053D7703';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';
    const IVY_BOND = '0x1C0C20aED3620693A04D267294f9Af4d451E5B68';
    const MOCK_ORACLE = '0x92B2C824D9cE501734FD9f9C1076e3bf6944b3f5';

    // Deploy new IvyCore
    console.log('\n1. Deploying new IvyCore...');
    const IvyCore = await hre.ethers.getContractFactory('IvyCore');
    const ivyCore = await IvyCore.deploy(IVY_TOKEN);
    await ivyCore.waitForDeployment();
    const ivyCoreAddr = await ivyCore.getAddress();
    console.log('   New IvyCore deployed to:', ivyCoreAddr);

    // Configure IvyCore
    console.log('\n2. Setting GenesisNode...');
    const tx1 = await ivyCore.setGenesisNode(GENESIS_NODE);
    await tx1.wait();
    console.log('   GenesisNode set');

    console.log('\n3. Setting IvyBond...');
    const tx2 = await ivyCore.setIvyBond(IVY_BOND);
    await tx2.wait();
    console.log('   IvyBond set');

    console.log('\n4. Setting Oracle...');
    const tx3 = await ivyCore.setOracle(MOCK_ORACLE);
    await tx3.wait();
    console.log('   Oracle set');

    // Update IvyToken to recognize new IvyCore as minter
    console.log('\n5. Updating IvyToken minter...');
    const IvyToken = await hre.ethers.getContractAt('IvyToken', IVY_TOKEN);
    const tx4 = await IvyToken.setMinter(ivyCoreAddr);
    await tx4.wait();
    console.log('   IvyToken minter updated to new IvyCore');

    // Update IvyBond to recognize new IvyCore
    console.log('\n6. Updating IvyBond ivyCore address...');
    const IvyBond = await hre.ethers.getContractAt('IvyBond', IVY_BOND);
    const tx5 = await IvyBond.setIvyCore(ivyCoreAddr);
    await tx5.wait();
    console.log('   IvyBond ivyCore updated');

    // Verify
    console.log('\n=== Verification ===');
    const minter = await IvyToken.minter();
    console.log('IvyToken.minter():', minter);
    console.log('Expected:', ivyCoreAddr);
    console.log('Match:', minter.toLowerCase() === ivyCoreAddr.toLowerCase());

    console.log('\n=== Deployment Complete ===');
    console.log('New IvyCore:', ivyCoreAddr);
    console.log('\nPlease update client/src/contracts/addresses.json with:');
    console.log(`  "IvyCore": "${ivyCoreAddr}"`);
    console.log('\nNOTE: Users will need to re-sync their mining power on the new contract.');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
