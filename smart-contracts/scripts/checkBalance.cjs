const hre = require('hardhat');

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log('Deployer:', deployer.address);
    console.log('Balance:', hre.ethers.formatEther(balance), 'BNB');
    console.log('Need: ~0.05 BNB for IvyCore deployment');
}

main();
