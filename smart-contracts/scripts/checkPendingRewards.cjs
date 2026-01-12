const hre = require('hardhat');

async function main() {
    const IVY_CORE = '0x6e043D17660D1BECc7034524Fc8E95b1BDc0A99B';
    const IVY_BOND = '0xdAbA15bd6355Fa502443cAFD3a35182Cc8cC39d6';
    const USER1 = '0x1140471923924D0dc15b6Df516c44212E9E59695';  // Your address
    const USER2 = '0x6CA2bA7b5876e43A41672138F9f969b73228F4A7';  // Referred user

    const ivyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);
    const ivyBond = await hre.ethers.getContractAt('IvyBond', IVY_BOND);

    console.log('=== Checking Pending Rewards ===\n');

    for (const [name, addr] of [['YOUR_ADDRESS', USER1], ['REFERRED_USER', USER2]]) {
        console.log(`${name}: ${addr}`);

        // Get pending IVY rewards
        try {
            const pendingIvy = await ivyCore.pendingIvy(addr);
            console.log(`  Pending IVY: ${hre.ethers.formatEther(pendingIvy)} IVY`);
        } catch (e) {
            console.log(`  Error getting pending IVY: ${e.message}`);
        }

        // Get bond token IDs for this user
        const balance = await ivyBond.balanceOf(addr);
        console.log(`  Bond NFTs owned: ${balance}`);

        if (balance > 0) {
            for (let i = 0; i < Number(balance); i++) {
                const tokenId = await ivyBond.tokenOfOwnerByIndex(addr, i);
                console.log(`\n  Token ID ${tokenId}:`);

                // Get bond data: [depositTime, totalDeposited, principal, bondPower, compoundedAmount]
                const bondData = await ivyBond.getBondData(tokenId);
                console.log(`    Bond Power: ${hre.ethers.formatEther(bondData[3])}`);
                console.log(`    Principal: ${hre.ethers.formatEther(bondData[2])} USDT`);
                const depositTime = Number(bondData[0]);
                if (depositTime > 0) {
                    console.log(`    Deposit Time: ${new Date(depositTime * 1000).toISOString()}`);
                }
            }
        }
        console.log('');
    }

    // Check IvyCore directReferrals
    console.log('=== IvyCore Direct Referrals ===');
    const directRefs = await ivyCore.getDirectReferrals(USER1);
    console.log(`Your direct referrals in IvyCore: ${directRefs[0].length}`);
    if (directRefs[0].length > 0) {
        console.log('Referrals:', directRefs[0]);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
