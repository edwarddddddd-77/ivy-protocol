# Ivy Protocol - BSC 测试网部署完成

**部署日期**: 2026-01-03  
**网络**: BSC Testnet (Chain ID: 97)  
**部署账户**: 0x1f9E611B492929b25565268f426396BF7C08EB26

---

## 已部署合约地址

| 合约名称 | 合约地址 | BscScan 链接 |
|---------|---------|-------------|
| MockUSDT | 0x2746d62a0A264d4CEcC6D2E873a0f512E94c9534 | [查看](https://testnet.bscscan.com/address/0x2746d62a0A264d4CEcC6D2E873a0f512E94c9534) |
| MockOracle | 0xE9e1B0b40f6da414caBaEAbAE0ec36D7ee51174F | [查看](https://testnet.bscscan.com/address/0xE9e1B0b40f6da414caBaEAbAE0ec36D7ee51174F) |
| GenesisNode | 0x500b015f7C80077C9151e6487E2D1f6000335d8e | [查看](https://testnet.bscscan.com/address/0x500b015f7C80077C9151e6487E2D1f6000335d8e) |
| IvyToken | 0x30a0678b341dFAeB49B6d1B192273babFE234Ba7 | [查看](https://testnet.bscscan.com/address/0x30a0678b341dFAeB49B6d1B192273babFE234Ba7) |
| IvyCore | 0xb2Fe490A12248d5B2FBA87DE552AC7341225291d | [查看](https://testnet.bscscan.com/address/0xb2Fe490A12248d5B2FBA87DE552AC7341225291d) |
| IvyBond | 0x4541FFBa4920D41Fe65A5c2d33a010F1e96Ceb29 | [查看](https://testnet.bscscan.com/address/0x4541FFBa4920D41Fe65A5c2d33a010F1e96Ceb29) |

---

## 合约权限配置

所有合约权限已正确配置：

1. **IvyToken** → Minter 设置为 IvyCore
2. **IvyCore** → GenesisNode 和 IvyBond 引用已设置
3. **GenesisNode** → PaymentToken 设置为 MockUSDT
4. **IvyBond** → PaymentToken 设置为 MockUSDT，IvyCore 引用已设置

---

## 前端配置

前端配置文件 `client/src/contracts/addresses.json` 已更新并推送到 GitHub。

Vercel 将自动重新构建并部署更新后的前端。

**前端 URL**: https://ivy-protocol.vercel.app

---

## 测试流程

用户现在可以在前端执行以下操作：

1. **连接钱包** - 使用 MetaMask 连接到 BSC 测试网
2. **领水** - 点击 Faucet 获取 20,000 mUSDT 测试代币
3. **购买节点** - 花费 1,000 mUSDT 购买 Genesis Node NFT
4. **存款** - 将 mUSDT 存入 IvyBond 获取 Bond Power

---

## GitHub 提交

**Commit**: c6414e3  
**Message**: Deploy: BSC Testnet deployment - All contracts live on chain 97
