const hre = require('hardhat');

/**
 * Sync known users to the new IvyCore contract
 */

async function main() {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    console.log('=== Syncing Users to New IvyCore ===');

    const IVY_CORE = '0x44e402586776f6343fB733B7029A0389F1186E8C';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';

    // Known users
    const USERS = [
        '0x1140471923924D0dc15b6Df516c44212E9E59695',
        '0x7e2DF46BbFFCd7C61b66a46858e58bC410FA1AAE',
        '0x1f9E611B492929b25565268f426396BF7C08EB26',
    ];

    const ivyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);
    const genesisNode = await hre.ethers.getContractAt('GenesisNode', GENESIS_NODE);

    console.log('\n=== Before Sync ===');
    for (const user of USERS) {
        const userInfo = await ivyCore.userInfo(user);
        const hasGenesis = await genesisNode.balanceOf(user).catch(() => 0);
        console.log(`${user.slice(0,10)}...:`);
        console.log(`  bondPower: ${hre.ethers.formatEther(userInfo.bondPower)}`);
        console.log(`  hasGenesis: ${Number(hasGenesis) > 0}`);
    }

    console.log('\n=== Syncing Users ===');
    for (const user of USERS) {
        try {
            console.log(`Syncing ${user.slice(0,10)}...`);
            const tx = await ivyCore.syncUser(user);
            await tx.wait();
            console.log(`  ✓ Synced`);
            await delay(2000);
        } catch (e) {
            console.log(`  ✗ Error: ${e.message}`);
        }
    }

    console.log('\n=== After Sync ===');
    for (const user of USERS) {
        const userInfo = await ivyCore.userInfo(user);
        const stats = await ivyCore.getUserMiningStats(user).catch(() => [0, 0, 0]);
        console.log(`${user.slice(0,10)}...:`);
        console.log(`  bondPower: ${hre.ethers.formatEther(userInfo.bondPower)}`);
        console.log(`  pendingIvy: ${hre.ethers.formatEther(stats[1])}`);
    }

    // Check referral relationships
    console.log('\n=== Referral Relationships ===');
    const user1 = USERS[0];
    const directRefs = await ivyCore.getDirectReferrals(user1);
    console.log(`${user1.slice(0,10)}... direct referrals: ${directRefs[0].length}`);
    for (let i = 0; i < directRefs[0].length; i++) {
        console.log(`  - ${directRefs[0][i].slice(0,10)}... power: ${hre.ethers.formatEther(directRefs[1][i])}`);
    }

    console.log('\n=== Sync Complete ===');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
