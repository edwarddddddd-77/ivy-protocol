const { ethers } = require("hardhat");

async function main() {
  const GENESIS_NODE_ADDRESS = "0x9919665A530041B4DCbcF3FE0E27512351b432EB";
  
  // GenesisNode ABI - only the functions we need
  const abi = [
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function baseURI() view returns (string)"
  ];
  
  const provider = new ethers.JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545/");
  const contract = new ethers.Contract(GENESIS_NODE_ADDRESS, abi, provider);
  
  console.log("=== NFT URI 诊断 ===");
  console.log("合约地址:", GENESIS_NODE_ADDRESS);
  console.log("");
  
  try {
    // 尝试获取 baseURI
    const baseURI = await contract.baseURI();
    console.log("当前 BaseURI:", baseURI || "(空)");
  } catch (e) {
    console.log("无法获取 BaseURI (可能函数不存在或不可见)");
  }
  
  try {
    // 获取 tokenURI(0)
    const tokenURI = await contract.tokenURI(0);
    console.log("tokenURI(0):", tokenURI || "(空)");
    
    // 分析 URI 类型
    if (!tokenURI || tokenURI === "") {
      console.log("\n诊断结果: URI 为空，需要设置 BaseURI");
    } else if (tokenURI.includes("localhost")) {
      console.log("\n诊断结果: URI 指向 localhost，需要更新为 Vercel 链接");
    } else if (tokenURI.includes("vercel")) {
      console.log("\n诊断结果: URI 已指向 Vercel");
    } else {
      console.log("\n诊断结果: URI 指向其他地址");
    }
  } catch (e) {
    console.log("获取 tokenURI(0) 失败:", e.message);
    console.log("\n可能原因: Token ID 0 不存在，或合约有问题");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
