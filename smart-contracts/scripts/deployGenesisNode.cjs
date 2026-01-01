const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("=== 部署 GenesisNode 合约 ===");
  console.log("部署账户:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(balance), "BNB");

  // 1. 部署 GenesisNode
  console.log("\n正在部署 GenesisNode...");
  const GenesisNode = await hre.ethers.getContractFactory("GenesisNode");
  const daoTreasury = deployer.address; // 使用部署者地址作为 DAO Treasury
  const genesisNode = await GenesisNode.deploy(daoTreasury);
  await genesisNode.waitForDeployment();
  
  const genesisNodeAddress = await genesisNode.getAddress();
  console.log("✅ GenesisNode 部署成功:", genesisNodeAddress);

  // 2. 设置 BaseURI
  const BASE_URI = "https://ivy-protocol.vercel.app/api/nft/";
  console.log("\n正在设置 BaseURI:", BASE_URI);
  
  const tx = await genesisNode.setBaseURI(BASE_URI);
  await tx.wait();
  console.log("✅ BaseURI 设置成功!");

  // 3. 验证 tokenURI (需要先 mint 一个 token)
  console.log("\n正在验证设置...");
  
  // 读取现有地址文件
  const addressesPath = "/home/ubuntu/ivy-protocol-git/client/src/contracts/addresses.json";
  let addresses = {};
  
  if (fs.existsSync(addressesPath)) {
    addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  }
  
  // 更新 GenesisNode 地址
  addresses.GenesisNode = genesisNodeAddress;
  
  // 保存更新后的地址
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("✅ 合约地址已更新到:", addressesPath);

  console.log("\n=== 部署完成 ===");
  console.log("新 GenesisNode 地址:", genesisNodeAddress);
  console.log("BaseURI:", BASE_URI);
  console.log("\n下一步: 推送代码到 GitHub 触发 Vercel 更新");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
