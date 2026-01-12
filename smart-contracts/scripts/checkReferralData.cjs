const hre = require('hardhat');

async function main() {
    const YOUR_ADDRESS = '0x1f9E611B492929b25565268f426396BF7C08EB26'; // 你的地址
    
    const IVY_CORE = '0x6e043D17660D1BECc7034524Fc8E95b1BDc0A99B';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';
    
    console.log('=== Checking Referral Data ===\n');
    
    // Check IvyCore referral data
    console.log('1. IvyCore Referral Data:');
    const ivyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);
    
    try {
        const directReferrals = await ivyCore.getDirectReferrals(YOUR_ADDRESS);
        console.log('   Direct Referrals Addresses:', directReferrals[0]);
        console.log('   Direct Referrals Count:', directReferrals[0].length);
        
        const referralSummary = await ivyCore.getUserReferralSummary(YOUR_ADDRESS);
        console.log('   Summary - Direct Count:', referralSummary[0].toString());
        console.log('   Summary - Total Team:', referralSummary[1].toString());
        console.log('   Summary - Total Rewards:', hre.ethers.formatEther(referralSummary[2]), 'IVY');
    } catch (e) {
        console.log('   Error reading IvyCore:', e.message);
    }
    
    // Check GenesisNode referral data
    console.log('\n2. GenesisNode Referral Data:');
    const genesisNode = await hre.ethers.getContractAt('GenesisNode', GENESIS_NODE);
    
    try {
        const userInfo = await genesisNode.getUserInfo(YOUR_ADDRESS);
        console.log('   Has Node:', userInfo[0]);
        console.log('   Token ID:', userInfo[1].toString());
        console.log('   Direct Downlines:', userInfo[2].toString());
        console.log('   Self Boost:', userInfo[3].toString(), 'bps');
        console.log('   Team Aura:', userInfo[4].toString(), 'bps');
    } catch (e) {
        console.log('   Error reading GenesisNode:', e.message);
    }
    
    // Check total pool power to see if there are other users
    console.log('\n3. Total Pool Data:');
    const totalPower = await ivyCore.totalPoolBondPower();
    console.log('   Total Pool Bond Power:', hre.ethers.formatEther(totalPower));
    
    // Get your power
    const miningStats = await ivyCore.getUserMiningStats(YOUR_ADDRESS);
    console.log('   Your Bond Power:', hre.ethers.formatEther(miningStats[0]));
    
    const otherPower = Number(hre.ethers.formatEther(totalPower)) - Number(hre.ethers.formatEther(miningStats[0]));
    console.log('   Other Users Power:', otherPower.toFixed(2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
