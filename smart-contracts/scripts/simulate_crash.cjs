const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Load addresses
  const addresses = JSON.parse(fs.readFileSync("/home/ubuntu/ivy-protocol/client/src/contracts/addresses.json", "utf8"));
  
  const MockOracle = await hre.ethers.getContractAt("MockOracle", addresses.MockOracle);
  const IvyCore = await hre.ethers.getContractAt("IvyCore", addresses.IvyCore);

  console.log("--- Starting Market Crash Simulation ---");

  // 1. Set Initial Price
  const initialPrice = hre.ethers.parseEther("100");
  await MockOracle.setPrice(initialPrice);
  console.log("Initial Price set to $100");

  // 2. Trigger Circuit Breaker Check (Reference Price = $100)
  // We need to simulate a drop. Let's say current price drops to $65 (35% drop -> Red Level)
  const crashPrice = hre.ethers.parseEther("65");
  
  console.log("Simulating price drop to $65 (-35%)...");
  
  // In a real scenario, checkCircuitBreaker is called by keepers or oracle updates.
  // Here we call it manually.
  // checkCircuitBreaker(currentPrice, referencePrice1H)
  await IvyCore.checkCircuitBreaker(crashPrice, initialPrice);
  
  console.log("Circuit Breaker Triggered!");
  
  const status = await IvyCore.cbStatus();
  console.log("Circuit Breaker Status:");
  console.log("Level:", status.level.toString(), "(3 = RED)");
  console.log("Is Active:", status.isActive);
  console.log("Forced Alpha:", hre.ethers.formatEther(status.forcedAlpha));

  console.log("--- Simulation Complete: RED ALERT MODE ACTIVE ---");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
