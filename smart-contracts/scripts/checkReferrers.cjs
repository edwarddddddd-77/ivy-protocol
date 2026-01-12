const hre = require('hardhat');

async function main() {
    const IVY_CORE = '0x6e043D17660D1BECc7034524Fc8E95b1BDc0A99B';
    const IVY_BOND = '0xdAbA15bd6355Fa502443cAFD3a35182Cc8cC39d6';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';
    const YOUR_ADDRESS = '0x1f9E611B492929b25565268f426396BF7C08EB26';

    console.log('=== Checking Referrer Data ===\n');
    console.log('Your Address:', YOUR_ADDRESS);

    const ivyBond = await hre.ethers.getContractAt('IvyBond', IVY_BOND);
    const genesisNode = await hre.ethers.getContractAt('GenesisNode', GENESIS_NODE);
    const ivyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);

    // Get total supply of bonds to find users
    const totalSupply = await ivyBond.totalSupply();
    console.log('\nTotal Bond NFTs:', totalSupply.toString());

    // Check each token owner
    const users = [];
    for (let i = 0; i < Number(totalSupply); i++) {
        try {
            const tokenId = await ivyBond.tokenByIndex(i);
            const owner = await ivyBond.ownerOf(tokenId);
            users.push(owner);

            const bondData = await ivyBond.getBondData(tokenId);
            console.log('\nToken ID:', tokenId.toString());
            console.log('  Owner:', owner);
            console.log('  Bond Power:', hre.ethers.formatEther(bondData[3]));
        } catch (e) {
            console.log('Error with token', i, ':', e.message);
        }
    }

    // Check referrers in GenesisNode
    console.log('\n=== GenesisNode Referrer Data ===');
    const uniqueUsers = [...new Set(users)];

    for (const user of uniqueUsers) {
        const referrer = await genesisNode.referrers(user);
        console.log('\nUser:', user);
        console.log('  Referrer in GenesisNode:', referrer);

        if (referrer.toLowerCase() === YOUR_ADDRESS.toLowerCase()) {
            console.log('  *** REFERRED BY YOU! ***');
        }

        // Also check IvyCore userInfo
        const coreUserInfo = await ivyCore.userInfo(user);
        console.log('  Referrer in IvyCore:', coreUserInfo.referrer);
        console.log('  Bond Power in IvyCore:', hre.ethers.formatEther(coreUserInfo.bondPower));
    }

    // Check your directReferralCount in GenesisNode
    console.log('\n=== Your Referral Stats ===');
    const yourDirectCount = await genesisNode.directReferralCount(YOUR_ADDRESS);
    console.log('Your Direct Referral Count (GenesisNode):', yourDirectCount.toString());

    // Check your userInfo in GenesisNode
    const yourInfo = await genesisNode.getUserInfo(YOUR_ADDRESS);
    console.log('Your Direct Downlines (GenesisNode userInfo):', yourInfo[2].toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
