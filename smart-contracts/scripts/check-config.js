import { ethers } from 'hardhat';

async function main() {
    const ivyBondAddr = '0x1C0C20aED3620693A04D267294f9Af4d451E5B68';
    
    const IvyBond = await ethers.getContractAt('IvyBond', ivyBondAddr);
    
    console.log('=== IvyBond Configuration ===');
    console.log('paymentToken:', await IvyBond.paymentToken());
    console.log('ivyToken:', await IvyBond.ivyToken());
    console.log('ivyCore:', await IvyBond.ivyCore());
    console.log('genesisNode:', await IvyBond.genesisNode());
    console.log('rwaWallet:', await IvyBond.rwaWallet());
    console.log('lpManager:', await IvyBond.lpManager());
    console.log('reservePool:', await IvyBond.reservePool());
    
    const minDeposit = await IvyBond.MIN_DEPOSIT();
    console.log('MIN_DEPOSIT:', ethers.formatUnits(minDeposit, 18), 'USDT');
}

main().catch(console.error);
