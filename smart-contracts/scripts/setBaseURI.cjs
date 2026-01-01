const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Setting BaseURI with account:", deployer.address);

  const GENESIS_NODE_ADDRESS = "0x9919665A530041B4DCbcF3FE0E27512351b432EB";
  const NEW_BASE_URI = "https://ivy-protocol.vercel.app/api/nft/";

  console.log("GenesisNode address:", GENESIS_NODE_ADDRESS);
  console.log("New BaseURI:", NEW_BASE_URI);

  // 使用 ABI 直接连接合约
  const abi = [
    "function setBaseURI(string calldata baseURI) external",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function owner() view returns (address)"
  ];

  const genesisNode = new hre.ethers.Contract(GENESIS_NODE_ADDRESS, abi, deployer);

  // 检查 owner
  const owner = await genesisNode.owner();
  console.log("Contract Owner:", owner);

  console.log("\nSending transaction with manual gas settings...");
  
  try {
    const tx = await genesisNode.setBaseURI(NEW_BASE_URI, {
      gasLimit: 100000,
      gasPrice: hre.ethers.parseUnits("5", "gwei")
    });
    console.log("Transaction hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    console.log("BaseURI set successfully!");

    // 验证结果
    const tokenURI = await genesisNode.tokenURI(0);
    console.log("\nVerification - tokenURI(0):", tokenURI);
    
    if (tokenURI.includes("ivy-protocol.vercel.app")) {
      console.log("✅ BaseURI 更新成功!");
    }
  } catch (error) {
    console.log("Error:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
