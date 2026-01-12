const hre = require('hardhat');

async function main() {
    const IVY_CORE = '0x6e043D17660D1BECc7034524Fc8E95b1BDc0A99B';
    const IVY_BOND = '0xdAbA15bd6355Fa502443cAFD3a35182Cc8cC39d6';
    const YOUR_ADDRESS = '0x1f9E611B492929b25565268f426396BF7C08EB26';

    console.log('=== Checking User Data ===\n');

    const ivyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);
    const ivyBond = await hre.ethers.getContractAt('IvyBond', IVY_BOND);

    // Get total supply of bonds to find users
    const totalSupply = await ivyBond.totalSupply();
    console.log('Total Bond NFTs:', totalSupply.toString());

    // Check each token
    for (let i = 0; i < Number(totalSupply); i++) {
        try {
            const tokenId = await ivyBond.tokenByIndex(i);
            const owner = await ivyBond.ownerOf(tokenId);
            const bondInfo = await ivyBond.getBondInfo(tokenId);
            
            console.log('\nToken ID:', tokenId.toString());
            console.log('  Owner:', owner);
            console.log('  Referrer:', bondInfo[4]); // referrer is index 4
            console.log('  Bond Power:', hre.ethers.formatEther(bondInfo[1])); // bondPower is index 1
            
            // Check if referrer is you
            if (bondInfo[4].toLowerCase() === YOUR_ADDRESS.toLowerCase()) {
                console.log('  *** THIS USER WAS REFERRED BY YOU! ***');
            }
        } catch (e) {
            console.log('Error with token', i, ':', e.message);
        }
    }

    // Also check IvyCore userInfo for referrer data
    console.log('\n=== Checking IvyCore User Info ===');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
