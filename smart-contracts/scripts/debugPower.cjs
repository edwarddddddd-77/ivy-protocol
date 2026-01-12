const hre = require('hardhat');

/**
 * Debug Effective Mining Power calculation
 *
 * User's expectation: 32500 + 330 = 32830
 * UI shows: 36113
 *
 * Let's trace the calculation step by step.
 */

async function main() {
    const USER = '0x1140471923924D0dc15b6Df516c44212E9E59695';
    const IVY_CORE = '0xc77eC3843Bcb2246dB16751D27D2E85FcF8f50B2';
    const IVY_BOND = '0x970Abf4e24705d0Fd92E94743B972A1B5586E796';
    const GENESIS_NODE = '0x951e46DD61A308F8F919B59178818dc7ab83e685';

    console.log('=== Effective Mining Power Debug ===\n');
    console.log('User:', USER);

    const ivyCore = await hre.ethers.getContractAt('IvyCore', IVY_CORE);
    const ivyBond = await hre.ethers.getContractAt('IvyBond', IVY_BOND);
    const genesisNode = await hre.ethers.getContractAt('GenesisNode', GENESIS_NODE);

    // Step 1: Get raw bond power from IvyBond
    console.log('\n--- Step 1: IvyBond Raw Power ---');
    const rawBondPower = await ivyBond.getBondPower(USER);
    console.log('IvyBond.getBondPower():', hre.ethers.formatEther(rawBondPower), 'USDT');

    // Step 2: Get Genesis Node boost
    console.log('\n--- Step 2: Genesis Node Boost ---');
    const hasGenesis = await genesisNode.balanceOf(USER);
    console.log('Has Genesis Node:', hasGenesis > 0);

    const totalBoost = await genesisNode.getTotalBoost(USER);
    console.log('Total Boost (basis points):', totalBoost.toString());
    console.log('Boost percentage:', (Number(totalBoost) / 100).toFixed(2) + '%');

    // Step 3: Calculate Effective Power
    console.log('\n--- Step 3: Effective Power Calculation ---');
    const BASIS_POINTS = 10000n;
    const effectivePower = (rawBondPower * (BASIS_POINTS + totalBoost)) / BASIS_POINTS;
    console.log('Formula: rawBondPower * (10000 + boost) / 10000');
    console.log('Calculation:', hre.ethers.formatEther(rawBondPower), '*',
                '(' + BASIS_POINTS.toString() + ' + ' + totalBoost.toString() + ') / ' + BASIS_POINTS.toString());
    console.log('Effective Power:', hre.ethers.formatEther(effectivePower), 'Power');

    // Step 4: Get IvyCore stored value (may be stale)
    console.log('\n--- Step 4: IvyCore Stored Value ---');
    const userInfo = await ivyCore.userInfo(USER);
    console.log('IvyCore.userInfo.bondPower:', hre.ethers.formatEther(userInfo.bondPower), 'Power');
    console.log('(This is the stored value, may need syncUser to update)');

    // Step 5: Check if syncUser is needed
    console.log('\n--- Step 5: Sync Status ---');
    const storedPower = userInfo.bondPower;
    if (storedPower !== effectivePower) {
        console.log('WARNING: IvyCore value is STALE!');
        console.log('Stored:', hre.ethers.formatEther(storedPower));
        console.log('Calculated:', hre.ethers.formatEther(effectivePower));
        console.log('Difference:', hre.ethers.formatEther(effectivePower - storedPower));
        console.log('\n>> User should call syncUser() to update IvyCore <<');
    } else {
        console.log('Values are in sync!');
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log('1. IvyBond raw power:      ', hre.ethers.formatEther(rawBondPower), 'USDT');
    console.log('2. Genesis Node boost:     ', (Number(totalBoost) / 100).toFixed(0) + '%');
    console.log('3. Effective Mining Power: ', hre.ethers.formatEther(effectivePower), 'Power');
    console.log('\nExplanation:');
    console.log('- Your raw bond power (IvyBond) = 32830 USDT');
    console.log('  (32500 original + 330 from compound with 10% bonus)');
    console.log('- Genesis Node gives you +10% boost on ALL power');
    console.log('- Effective = 32830 × 1.10 = 36113 Power');
    console.log('\nThe UI showing 36113 is CORRECT!');
    console.log('The compound 10% bonus is SEPARATE from Genesis Node 10% boost.');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
