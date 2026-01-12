const hre = require('hardhat');
async function main() {
    const IVY_CORE = '0xc77eC3843Bcb2246dB16751D27D2E85FcF8f50B2';
    const IVY_BOND = '0x970Abf4e24705d0Fd92E94743B972A1B5586E796';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';
    const USER1 = '0x1140471923924D0dc15b6Df516c44212E9E59695';
    
    const ivyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);
    const ivyBond = await hre.ethers.getContractAt('IvyBond', IVY_BOND);
    const genesisNode = await hre.ethers.getContractAt('GenesisNode', GENESIS_NODE);
    
    console.log('=== USER1 Power Analysis ===\n');
    
    // 1. Check bond power in IvyBond
    const fundAlloc = await ivyBond.getFundAllocation(USER1);
    const bondPowerFromBond = Number(hre.ethers.formatEther(fundAlloc[2]));
    console.log('1. IvyBond.getFundAllocation[2] (miningPower):', bondPowerFromBond, 'USDT');
    
    // 2. Check bond power synced to IvyCore
    const userInfo = await ivyCore.userInfo(USER1);
    const bondPowerInCore = Number(hre.ethers.formatEther(userInfo.bondPower));
    console.log('2. IvyCore.userInfo.bondPower:', bondPowerInCore, 'Power');
    
    // 3. Check Genesis Node boost
    const totalBoost = await genesisNode.getTotalBoost(USER1);
    const boostPercent = Number(totalBoost) / 100;
    console.log('3. GenesisNode boost:', boostPercent, '%');
    
    // 4. Calculate expected effective power
    const expectedEffective = bondPowerInCore * (1 + boostPercent / 100);
    console.log('\n=== Calculation ===');
    console.log('Expected Effective Power:', bondPowerInCore, '×', (1 + boostPercent/100), '=', expectedEffective.toFixed(2));
    
    // 5. Check individual bond NFTs
    console.log('\n=== Bond NFT Details ===');
    const bondIds = await ivyBond.getUserBondIds(USER1);
    console.log('Total Bond NFTs:', bondIds.length);
    
    let totalBondPower = 0;
    for (let i = 0; i < bondIds.length; i++) {
        const bondId = bondIds[i];
        const bondInfo = await ivyBond.bonds(bondId);
        const power = Number(hre.ethers.formatEther(bondInfo.bondPower));
        totalBondPower += power;
        console.log(`  Bond #${bondId}: ${power} Power (deposited: ${hre.ethers.formatEther(bondInfo.depositAmount)} USDT)`);
    }
    console.log('Total from all bonds:', totalBondPower, 'Power');
}
main().catch(console.error);
