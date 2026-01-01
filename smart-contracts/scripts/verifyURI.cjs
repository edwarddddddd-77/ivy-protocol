const hre = require("hardhat");

async function main() {
  const NEW_GENESIS_NODE = "0x825A0b1449f7A2A4FA40B2B4E6e050E75c770F62";
  
  console.log("=== 验证新合约 URI 设置 ===");
  console.log("合约地址:", NEW_GENESIS_NODE);
  
  const abi = [
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function owner() view returns (address)",
    "function totalSupply() view returns (uint256)",
    "function mint(address to, address referrer) external"
  ];
  
  const [signer] = await hre.ethers.getSigners();
  const contract = new hre.ethers.Contract(NEW_GENESIS_NODE, abi, signer);
  
  // 检查 owner
  const owner = await contract.owner();
  console.log("合约 Owner:", owner);
  
  // 检查当前供应量
  const totalSupply = await contract.totalSupply();
  console.log("当前 NFT 总量:", totalSupply.toString());
  
  // 如果没有 NFT，先 mint 一个测试
  if (totalSupply === 0n) {
    console.log("\n正在 Mint 测试 NFT...");
    const tx = await contract.mint(signer.address, "0x0000000000000000000000000000000000000000");
    await tx.wait();
    console.log("✅ Mint 成功!");
  }
  
  // 获取 tokenURI
  const tokenURI = await contract.tokenURI(0);
  console.log("\ntokenURI(0):", tokenURI);
  
  if (tokenURI.includes("ivy-protocol.vercel.app")) {
    console.log("\n✅ 验证成功! BaseURI 已正确设置!");
    console.log("NFT Metadata API:", tokenURI);
  } else {
    console.log("\n⚠️ tokenURI 未按预期设置");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
