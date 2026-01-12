const hre = require('hardhat');

async function main() {
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';
    const YOUR_ADDRESS = '0x1f9E611B492929b25565268f426396BF7C08EB26';
    const USER1 = '0x1140471923924D0dc15b6Df516c44212E9E59695';
    const USER2 = '0x6CA2bA7b5876e43A41672138F9f969b73228F4A7';

    const genesisNode = await hre.ethers.getContractAt('GenesisNode', GENESIS_NODE);

    // Check who owns Genesis Node NFTs
    const totalSupply = await genesisNode.totalSupply();
    console.log('Total Genesis Node NFTs:', totalSupply.toString());

    for(let i = 0; i < Number(totalSupply); i++) {
        const tokenId = await genesisNode.tokenByIndex(i);
        const owner = await genesisNode.ownerOf(tokenId);
        console.log('Genesis Node Token', tokenId.toString(), 'owned by:', owner);
    }

    // Check direct referral counts for all addresses
    const yourCount = await genesisNode.directReferralCount(YOUR_ADDRESS);
    const user1Count = await genesisNode.directReferralCount(USER1);
    const user2Count = await genesisNode.directReferralCount(USER2);

    console.log('\nDirect Referral Counts:');
    console.log('YOUR_ADDRESS (0x1f9...):', yourCount.toString());
    console.log('USER1 (0x114...):', user1Count.toString());
    console.log('USER2 (0x6CA...):', user2Count.toString());

    // Check user info for all
    console.log('\n=== User Info in GenesisNode ===');
    for (const addr of [YOUR_ADDRESS, USER1, USER2]) {
        try {
            const info = await genesisNode.getUserInfo(addr);
            console.log('\nAddress:', addr);
            console.log('  Team Power:', hre.ethers.formatEther(info[0]));
            console.log('  Total Rewards:', hre.ethers.formatEther(info[1]));
            console.log('  Direct Downlines:', info[2].toString());
        } catch (e) {
            console.log('Error getting info for', addr, ':', e.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
