const hre = require('hardhat');

async function main() {
    // New contract addresses
    const IVY_CORE = '0xe740030549E04175E1Be30149a84Aa31ca928C40';
    const IVY_BOND = '0x43074789E0f1e671fD6f235E265862387474b4f1';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';

    // User addresses
    const USER1 = '0x1140471923924D0dc15b6Df516c44212E9E59695';  // Main referrer
    const USER2 = '0x6CA2bA7b5876e43A41672138F9f969b73228F4A7';  // Referred 1
    const USER3 = '0x7e2DF46BbFFCd7C61b66a46858e58bC410FA1AAE';  // Referred 2

    const ivyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);
    const ivyBond = await hre.ethers.getContractAt('IvyBond', IVY_BOND);
    const genesisNode = await hre.ethers.getContractAt('GenesisNode', GENESIS_NODE);

    console.log('=== V2.0 Diagnosis ===\n');

    // Check total pool bond power
    const totalPoolBondPower = await ivyCore.totalPoolBondPower();
    console.log('Total Pool Bond Power:', hre.ethers.formatEther(totalPoolBondPower));

    // Check IvyBond total
    const bondTotalPower = await ivyBond.totalBondPower();
    console.log('IvyBond Total Power:', hre.ethers.formatEther(bondTotalPower));

    // Check each user
    for (const [name, addr] of [['USER1 (Referrer)', USER1], ['USER2 (Referred)', USER2], ['USER3 (Referred)', USER3]]) {
        console.log(`\n--- ${name}: ${addr} ---`);

        // Bond NFTs
        const bondBalance = await ivyBond.balanceOf(addr);
        console.log('Bond NFTs:', bondBalance.toString());

        if (bondBalance > 0) {
            const bondPower = await ivyBond.getBondPower(addr);
            console.log('Bond Power (from IvyBond):', hre.ethers.formatEther(bondPower));
        }

        // IvyCore userInfo
        const userInfo = await ivyCore.userInfo(addr);
        console.log('Bond Power (in IvyCore):', hre.ethers.formatEther(userInfo.bondPower));
        console.log('Pending Vested:', hre.ethers.formatEther(userInfo.pendingVested));

        // Pending IVY
        const pendingIvy = await ivyCore.pendingIvy(addr);
        console.log('Pending IVY:', hre.ethers.formatEther(pendingIvy));

        // Pending Referral Rewards
        const pendingReferral = await ivyCore.getPendingReferralRewards(addr);
        console.log('Pending Referral Rewards:', hre.ethers.formatEther(pendingReferral));

        // Total Rewards Earned
        const totalEarned = await ivyCore.totalRewardsEarned(addr);
        console.log('Total Rewards Earned:', hre.ethers.formatEther(totalEarned));

        // GenesisNode referral data
        const directCount = await genesisNode.directReferralCount(addr);
        console.log('Direct Referral Count (GenesisNode):', directCount.toString());

        const referrer = await genesisNode.getReferrer(addr);
        console.log('Referrer:', referrer);

        // IvyCore direct referrals
        const directRefs = await ivyCore.getDirectReferrals(addr);
        console.log('Direct Referrals (IvyCore):', directRefs[0].length, 'addresses');
        if (directRefs[0].length > 0) {
            console.log('  Addresses:', directRefs[0]);
        }
    }

    // Check referral summary for USER1
    console.log('\n=== USER1 Referral Summary (from IvyCore) ===');
    const summary = await ivyCore.getUserReferralSummary(USER1);
    console.log('Direct Referral Count:', summary[0].toString());
    console.log('Total Team Size:', summary[1].toString());
    console.log('Total Referral Rewards:', hre.ethers.formatEther(summary[2]));
    console.log('Reward History Count:', summary[3].toString());
    console.log('Has Genesis Node:', summary[4]);

    // Check team stats
    console.log('\n=== USER1 Team Stats ===');
    const teamStats = await ivyCore.getTeamStats(USER1);
    console.log('Total Members:', teamStats[0].toString());
    console.log('Total Bond Power:', hre.ethers.formatEther(teamStats[1]));
    console.log('Active Members:', teamStats[2].toString());
    console.log('Direct Count:', teamStats[3].toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
