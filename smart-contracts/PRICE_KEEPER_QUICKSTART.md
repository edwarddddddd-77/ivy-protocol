# 🚀 Price Keeper 快速开始

## 一分钟启动指南

### 1️⃣ 配置环境变量

```bash
# 复制配置文件
cp .env.example .env

# 编辑配置（填入真实值）
nano .env
```

**必填项：**
```env
KEEPER_PRIVATE_KEY=0x你的keeper钱包私钥
IVY_CORE_ADDRESS=0x已部署的IvyCore合约地址
BSC_MAINNET_RPC_URL=https://bsc-dataseed1.binance.org
```

### 2️⃣ 准备 Keeper 钱包

- 创建新钱包（不要使用主钱包）
- 充值 **0.1 BNB** 用于 gas 费
- 将私钥填入 `.env` 文件

### 3️⃣ 运行 Keeper

**开发测试（前台运行）：**
```bash
npm run keeper
```

**生产环境（后台运行）：**
```bash
# 安装 PM2
npm install -g pm2

# 启动 keeper
npm run keeper:pm2

# 查看日志
npm run keeper:logs

# 查看状态
npm run keeper:status
```

---

## 📊 预期输出

```
🤖 Initializing Price Keeper...
======================================================================
📡 Connected to network: bsc (chainId: 56)

👛 Keeper Wallet:
   Address: 0x1234...5678
   Balance: 0.1 BNB

📄 IvyCore Contract: 0xYourIvyCore...

⚙️  Contract Status:
   Test Mode: ❌ Disabled (Mainnet)
   Oracle: 0xChainlink...

✅ Initialization complete
======================================================================

🚀 Price Keeper started
   Update interval: 60 minutes
   Press Ctrl+C to stop

[2025-01-06T10:00:00.000Z] 🔄 Updating prices from Oracle...
   ✅ Transaction confirmed (block 12345678)
   📊 Updated Prices:
      Current: $0.96
      MA30: $1.00
      1h ago: $0.95
      Change: +1.05%
```

---

## ⚙️ 可选配置

### 修改更新频率

编辑 `scripts/price-keeper.js`:

```javascript
const CONFIG = {
  UPDATE_INTERVAL: 3600000,  // 默认 1 小时
  // 改为 30 分钟：1800000
  // 改为 15 分钟：900000
};
```

### 控制 Gas 费用

```javascript
const CONFIG = {
  GAS_LIMIT: 500000,                              // Gas 上限
  MAX_FEE_PER_GAS: ethers.parseUnits("5", "gwei"), // 最高 5 gwei
};
```

---

## 🛡️ 安全检查清单

- [ ] 使用专用钱包（不是主钱包）
- [ ] 钱包只存放必要的 BNB（0.1 - 0.5 BNB）
- [ ] `.env` 文件权限设置为 `600`（仅所有者可读）
- [ ] 服务器防火墙已配置
- [ ] 已设置余额告警监控

---

## 📞 常见问题

### Q: Keeper 需要多少 BNB？

**A:** 建议 0.1 - 0.5 BNB
- 每次更新约消耗 0.001 - 0.005 BNB
- 按每小时更新，每天约 0.024 - 0.12 BNB
- 每月约 0.72 - 3.6 BNB

### Q: Keeper 钱包需要什么权限？

**A:** 不需要任何特殊权限
- 只需要能调用 `updatePrices()` 函数
- 在主网模式下，任何人都可以调用
- Keeper 只是定期触发更新，不操纵价格

### Q: 价格从哪里来？

**A:** 从 Chainlink Oracle 读取
- Keeper 调用 `updatePrices()`
- 合约内部调用 `oracle.getAssetPrice()`
- Chainlink 提供去中心化价格数据

### Q: 如果 Keeper 停止会怎样？

**A:** 价格不会自动更新
- 合约仍然可以正常运行（使用旧价格）
- 任何人都可以手动调用 `updatePrices()`
- 建议配置告警，及时发现 keeper 故障

---

## 📚 详细文档

- **完整使用指南：** [KEEPER_GUIDE.md](./KEEPER_GUIDE.md)
- **去中心化设计：** [DECENTRALIZATION.md](../DECENTRALIZATION.md)
- **合约代码：** [IvyCore.sol](../contracts/IvyCore.sol)

---

## 🎯 快速命令参考

```bash
# 启动 keeper
npm run keeper              # 前台运行
npm run keeper:pm2          # 后台运行（PM2）

# 管理 keeper
npm run keeper:logs         # 查看日志
npm run keeper:status       # 查看状态
npm run keeper:restart      # 重启
npm run keeper:stop         # 停止

# PM2 高级命令
pm2 monit                   # 实时监控
pm2 flush                   # 清空日志
pm2 save                    # 保存配置
pm2 startup                 # 开机自启
```

---

祝运行顺利！🎉
