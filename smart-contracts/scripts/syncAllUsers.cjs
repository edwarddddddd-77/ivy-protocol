const hre = require('hardhat');

async function main() {
    const IVY_CORE = '0xe740030549E04175E1Be30149a84Aa31ca928C40';

    // All users that need syncing
    const USERS = [
        '0x1140471923924D0dc15b6Df516c44212E9E59695',  // USER1
        '0x6CA2bA7b5876e43A41672138F9f969b73228F4A7',  // USER2
        '0x7e2DF46BbFFCd7C61b66a46858e58bC410FA1AAE',  // USER3
    ];

    const ivyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);

    console.log('=== Syncing All Users ===\n');

    for (const user of USERS) {
        console.log('Syncing:', user);
        try {
            const tx = await ivyCore.syncUser(user);
            await tx.wait();
            console.log('  ✓ Synced');
        } catch (e) {
            console.log('  ✗ Error:', e.message);
        }
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n=== Verification ===');
    const totalPoolBondPower = await ivyCore.totalPoolBondPower();
    console.log('Total Pool Bond Power:', hre.ethers.formatEther(totalPoolBondPower));

    // Check USER1's pending referral rewards
    const pendingReferral = await ivyCore.getPendingReferralRewards(USERS[0]);
    console.log('USER1 Pending Referral Rewards:', hre.ethers.formatEther(pendingReferral), 'IVY');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
