const hre = require('hardhat');

async function main() {
    const IVY_CORE = '0xc77eC3843Bcb2246dB16751D27D2E85FcF8f50B2';
    const USER1 = '0x1140471923924D0dc15b6Df516c44212E9E59695';

    // Try to get contract code
    const code = await hre.ethers.provider.getCode(IVY_CORE);
    console.log('Contract code length:', code.length);
    console.log('Has code:', code !== '0x');

    if (code !== '0x') {
        const ivyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);

        // Try simple reads
        console.log('\n=== Basic Contract State ===');
        const totalPoolBondPower = await ivyCore.totalPoolBondPower();
        console.log('totalPoolBondPower:', hre.ethers.formatEther(totalPoolBondPower));

        const ivyToken = await ivyCore.ivyToken();
        console.log('ivyToken:', ivyToken);

        const genesisNode = await ivyCore.genesisNode();
        console.log('genesisNode:', genesisNode);

        // Try getUserReferralSummary
        console.log('\n=== User Referral Summary ===');
        try {
            const summary = await ivyCore.getUserReferralSummary(USER1);
            console.log('directReferralCount:', summary[0].toString());
            console.log('totalTeamSize:', summary[1].toString());
            console.log('totalReferralRewards:', hre.ethers.formatEther(summary[2]), 'IVY');
            console.log('rewardHistoryCount:', summary[3].toString());
            console.log('hasGenesisNode:', summary[4]);
        } catch (e) {
            console.log('Error calling getUserReferralSummary:', e.message);
        }

        // Check pending referral rewards
        console.log('\n=== Pending Referral Rewards ===');
        try {
            const pending = await ivyCore.getPendingReferralRewards(USER1);
            console.log('pendingReferralRewards:', hre.ethers.formatEther(pending), 'IVY');
        } catch (e) {
            console.log('Error:', e.message);
        }
    } else {
        console.log('Contract not deployed at this address!');
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
