const hre = require('hardhat');

async function main() {
    const MOCK_LP_MANAGER = '0x3348db2875DAeC4b69bEb79a9e20E84A93E2DEFd';
    const NEW_IVY_BOND = '0xdAbA15bd6355Fa502443cAFD3a35182Cc8cC39d6';

    console.log('Updating MockLPManager.ivyBond...');
    const MockLPManager = await hre.ethers.getContractAt('MockLPManager', MOCK_LP_MANAGER);
    const tx = await MockLPManager.setIvyBond(NEW_IVY_BOND);
    await tx.wait();
    console.log('MockLPManager.ivyBond updated to:', NEW_IVY_BOND);

    const ivyBond = await MockLPManager.ivyBond();
    console.log('Verified MockLPManager.ivyBond():', ivyBond);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
