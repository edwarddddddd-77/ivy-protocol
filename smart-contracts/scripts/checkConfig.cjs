const hre = require('hardhat');
async function main() {
    const ivyCore = await hre.ethers.getContractAt('IvyCore', '0xc77eC3843Bcb2246dB16751D27D2E85FcF8f50B2');
    const ivyBond = await ivyCore.ivyBond();
    console.log('IvyCore.ivyBond:', ivyBond);
    console.log('Expected new IvyBond: 0x970Abf4e24705d0Fd92E94743B972A1B5586E796');
    console.log('Old IvyBond: 0x43074789E0f1e671fD6f235E265862387474b4f1');
}
main().catch(console.error);
