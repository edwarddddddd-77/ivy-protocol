const hre = require('hardhat');
async function main() {
    const IVY_CORE = '0xc77eC3843Bcb2246dB16751D27D2E85FcF8f50B2';
    const IVY_BOND_NEW = '0x970Abf4e24705d0Fd92E94743B972A1B5586E796';
    const IVY_BOND_OLD = '0x43074789E0f1e671fD6f235E265862387474b4f1';
    
    const USER1 = '0x1140471923924D0dc15b6Df516c44212E9E59695';
    
    const ivyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);
    const ivyBondNew = await hre.ethers.getContractAt('IvyBond', IVY_BOND_NEW);
    const ivyBondOld = await hre.ethers.getContractAt('IvyBond', IVY_BOND_OLD);
    
    console.log('=== IvyCore State ===');
    console.log('totalPoolBondPower:', hre.ethers.formatEther(await ivyCore.totalPoolBondPower()));
    
    console.log('\n=== USER1 in New IvyBond ===');
    try {
        const bondIdsNew = await ivyBondNew.getUserBondIds(USER1);
        console.log('Bond IDs in new IvyBond:', bondIdsNew.length);
    } catch(e) {
        console.log('Error:', e.message);
    }
    
    console.log('\n=== USER1 in Old IvyBond ===');
    try {
        const bondIdsOld = await ivyBondOld.getUserBondIds(USER1);
        console.log('Bond IDs in old IvyBond:', bondIdsOld.length);
        if (bondIdsOld.length > 0) {
            const fundAlloc = await ivyBondOld.getFundAllocation(USER1);
            console.log('Old bond power:', hre.ethers.formatEther(fundAlloc[2]));
        }
    } catch(e) {
        console.log('Error:', e.message);
    }
    
    console.log('\n=== USER1 in IvyCore ===');
    const userInfo = await ivyCore.userInfo(USER1);
    console.log('bondPower in IvyCore:', hre.ethers.formatEther(userInfo.bondPower));
}
main().catch(console.error);
