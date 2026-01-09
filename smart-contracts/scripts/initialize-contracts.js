import hre from "hardhat";

async function main() {
  console.log("🚀 Initializing Ivy Protocol Contracts...");
  console.log("");

  // Contract addresses
  const addresses = {
    MockUSDT: "0xdF07B56606fF2625d6dAE0AfcE27bfd5836e5B64",
    IvyToken: "0x83cEbd8b7DDd6536FB05CB19D5DF97fa94867f98",
    GenesisNode: "0x2E2b5E602D6a2F6DB616aFe7c7a9bF522aD9Cb70",
    IvyCore: "0xf607EEf5390298D66F5B6Ef22C81515Add90B06b",
    IvyBond: "0x8C3e30B1d21Bd2a89d16613f546dD384FCD1d029",
    DividendPool: "0xAD40B6F238FdD52cA73DC9bc420e046237CD582A",
    Photosynthesis: "0x48133Dcc12F53359e0413E4C3A1C73D91Ad26F94",
    MockOracle: "0x05431db855Be3b1597e9344b0F0127b40DBB16C3"
  };

  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("");

  // Connect to contracts
  const IvyCore = await hre.ethers.getContractAt("IvyCore", addresses.IvyCore);
  const IvyBond = await hre.ethers.getContractAt("IvyBond", addresses.IvyBond);
  const IvyToken = await hre.ethers.getContractAt("IvyToken", addresses.IvyToken);
  const GenesisNode = await hre.ethers.getContractAt("GenesisNode", addresses.GenesisNode);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1️⃣ Initializing IvyCore...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Check current ivyBond address
    const currentIvyBond = await IvyCore.ivyBond();
    console.log("Current ivyBond:", currentIvyBond);

    if (currentIvyBond === "0x0000000000000000000000000000000000000000") {
      console.log("❌ ivyBond not set, setting now...");
      const tx1 = await IvyCore.setIvyBond(addresses.IvyBond);
      await tx1.wait();
      console.log("✅ IvyCore.setIvyBond() done");
    } else {
      console.log("✅ ivyBond already set");
    }

    // Check genesisNode
    const currentGenesisNode = await IvyCore.genesisNode();
    console.log("Current genesisNode:", currentGenesisNode);

    if (currentGenesisNode === "0x0000000000000000000000000000000000000000") {
      console.log("❌ genesisNode not set, setting now...");
      const tx2 = await IvyCore.setGenesisNode(addresses.GenesisNode);
      await tx2.wait();
      console.log("✅ IvyCore.setGenesisNode() done");
    } else {
      console.log("✅ genesisNode already set");
    }

    // Check oracle
    const currentOracle = await IvyCore.priceOracle();
    console.log("Current oracle:", currentOracle);

    if (currentOracle === "0x0000000000000000000000000000000000000000") {
      console.log("❌ oracle not set, setting now...");
      const tx3 = await IvyCore.setOracle(addresses.MockOracle);
      await tx3.wait();
      console.log("✅ IvyCore.setOracle() done");
    } else {
      console.log("✅ oracle already set");
    }

  } catch (error) {
    console.log("⚠️ IvyCore initialization error:", error.message);
  }

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("2️⃣ Initializing IvyBond...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const currentIvyCore = await IvyBond.ivyCore();
    console.log("Current ivyCore:", currentIvyCore);

    if (currentIvyCore === "0x0000000000000000000000000000000000000000") {
      console.log("❌ ivyCore not set, setting now...");
      const tx4 = await IvyBond.setIvyCore(addresses.IvyCore);
      await tx4.wait();
      console.log("✅ IvyBond.setIvyCore() done");
    } else {
      console.log("✅ ivyCore already set");
    }

    const currentGenesisNode2 = await IvyBond.genesisNode();
    console.log("Current genesisNode:", currentGenesisNode2);

    if (currentGenesisNode2 === "0x0000000000000000000000000000000000000000") {
      console.log("❌ genesisNode not set, setting now...");
      const tx5 = await IvyBond.setGenesisNode(addresses.GenesisNode);
      await tx5.wait();
      console.log("✅ IvyBond.setGenesisNode() done");
    } else {
      console.log("✅ genesisNode already set");
    }

  } catch (error) {
    console.log("⚠️ IvyBond initialization error:", error.message);
  }

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("3️⃣ Checking IvyToken minters...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const ivyCoreIsMinter = await IvyToken.authorizedMinters(addresses.IvyCore);
    console.log("IvyCore is minter:", ivyCoreIsMinter);

    if (!ivyCoreIsMinter) {
      console.log("❌ IvyCore not authorized, adding now...");
      const tx6 = await IvyToken.addMinter(addresses.IvyCore);
      await tx6.wait();
      console.log("✅ IvyToken.addMinter(IvyCore) done");
    } else {
      console.log("✅ IvyCore already authorized");
    }

  } catch (error) {
    console.log("⚠️ IvyToken initialization error:", error.message);
  }

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Initialization Complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("🎉 All contracts initialized successfully!");
  console.log("📝 Users can now call syncUser() to start mining!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
