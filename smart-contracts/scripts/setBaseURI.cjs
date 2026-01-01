const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Setting BaseURI with account:", deployer.address);

  // Get GenesisNode address from addresses.json
  const addresses = require("/home/ubuntu/ivy-protocol/client/src/contracts/addresses.json");
  const genesisNodeAddress = addresses.GenesisNode;

  if (!genesisNodeAddress) {
    throw new Error("GenesisNode address not found in addresses.json");
  }

  const GenesisNode = await hre.ethers.getContractFactory("GenesisNode");
  const genesisNode = GenesisNode.attach(genesisNodeAddress);

  // Default to Vercel URL if not provided in env
  const baseURI = process.env.NEXT_PUBLIC_VERCEL_URL 
    ? `${process.env.NEXT_PUBLIC_VERCEL_URL}/api/nft/`
    : "https://ivy-protocol.vercel.app/api/nft/";

  console.log(`Setting BaseURI to: ${baseURI}`);

  const tx = await genesisNode.setBaseURI(baseURI);
  await tx.wait();

  console.log("BaseURI set successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
