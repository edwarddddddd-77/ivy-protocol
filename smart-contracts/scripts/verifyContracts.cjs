const hre = require('hardhat');

async function main() {
    console.log('=== Verifying Contract Configuration ===\n');

    const IVY_CORE = '0x6e043D17660D1BECc7034524Fc8E95b1BDc0A99B';
    const IVY_BOND = '0xdAbA15bd6355Fa502443cAFD3a35182Cc8cC39d6';
    const IVY_TOKEN = '0xd93ee28F81d0759748d273eac805e0f5053D7703';
    const MOCK_LP_MANAGER = '0x3348db2875DAeC4b69bEb79a9e20E84A93E2DEFd';

    // Check IvyCore
    console.log('IvyCore:', IVY_CORE);
    const ivyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);
    const ivyCoreIvyBond = await ivyCore.ivyBond();
    console.log('  -> ivyBond:', ivyCoreIvyBond);
    console.log('  -> Expected:', IVY_BOND);
    console.log('  -> Match:', ivyCoreIvyBond.toLowerCase() === IVY_BOND.toLowerCase() ? '✅' : '❌');

    // Check IvyBond
    console.log('\nIvyBond:', IVY_BOND);
    const ivyBond = await hre.ethers.getContractAt('IvyBond', IVY_BOND);
    const ivyBondIvyCore = await ivyBond.ivyCore();
    console.log('  -> ivyCore:', ivyBondIvyCore);
    console.log('  -> Expected:', IVY_CORE);
    console.log('  -> Match:', ivyBondIvyCore.toLowerCase() === IVY_CORE.toLowerCase() ? '✅' : '❌');

    // Check IvyToken minter
    console.log('\nIvyToken:', IVY_TOKEN);
    const ivyToken = await hre.ethers.getContractAt('IvyToken', IVY_TOKEN);
    const minter = await ivyToken.minter();
    console.log('  -> minter:', minter);
    console.log('  -> Expected:', IVY_CORE);
    console.log('  -> Match:', minter.toLowerCase() === IVY_CORE.toLowerCase() ? '✅' : '❌');

    // Check MockLPManager
    console.log('\nMockLPManager:', MOCK_LP_MANAGER);
    const lpManager = await hre.ethers.getContractAt('MockLPManager', MOCK_LP_MANAGER);
    const lpIvyBond = await lpManager.ivyBond();
    console.log('  -> ivyBond:', lpIvyBond);
    console.log('  -> Expected:', IVY_BOND);
    console.log('  -> Match:', lpIvyBond.toLowerCase() === IVY_BOND.toLowerCase() ? '✅' : '❌');

    console.log('\n=== All contracts verified ===');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
