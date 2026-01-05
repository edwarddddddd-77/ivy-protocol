# 🤖 Price Keeper Bot 使用指南

## 📋 简介

Price Keeper 是一个自动化机器人，用于定期从 Oracle 读取价格并更新到 IvyCore 合约。

**主要功能：**
- ✅ 每小时自动更新价格
- ✅ 从 Chainlink Oracle 读取价格
- ✅ 自动重试机制
- ✅ Gas 费用优化
- ✅ 完整的日志记录

---

## 🚀 快速开始

### 1. 环境准备

**安装依赖：**
```bash
cd smart-contracts
npm install
```

**配置环境变量：**
```bash
# 复制示例配置文件
cp .env.example .env

# 编辑 .env 文件
nano .env
```

**必填配置：**
```env
# Keeper 钱包私钥（需要有足够的 BNB 支付 gas）
KEEPER_PRIVATE_KEY=0x1234567890abcdef...

# IvyCore 合约地址
IVY_CORE_ADDRESS=0xYourIvyCoreAddress...

# BSC RPC 地址（主网）
BSC_MAINNET_RPC_URL=https://bsc-dataseed1.binance.org
```

### 2. 准备 Keeper 钱包

**创建新钱包（推荐）：**
```javascript
// 使用 ethers.js
const wallet = ethers.Wallet.createRandom();
console.log("Address:", wallet.address);
console.log("Private Key:", wallet.privateKey);
```

**充值 BNB：**
- 建议至少充值 **0.1 BNB**
- 用于支付 gas 费用
- 每次更新大约消耗 0.001 - 0.005 BNB

### 3. 运行 Keeper

**测试运行（前台）：**
```bash
node scripts/price-keeper.js
```

**生产环境（后台）：**
```bash
# 使用 PM2 管理
npm install -g pm2

# 启动 keeper
pm2 start scripts/price-keeper.js --name ivy-price-keeper

# 查看日志
pm2 logs ivy-price-keeper

# 查看状态
pm2 status

# 停止 keeper
pm2 stop ivy-price-keeper

# 重启 keeper
pm2 restart ivy-price-keeper
```

---

## ⚙️ 配置说明

### 更新间隔

默认每 **1 小时**更新一次。修改 `scripts/price-keeper.js`:

```javascript
const CONFIG = {
  UPDATE_INTERVAL: 3600000,  // 1 小时 = 3600000 毫秒
  // 改为 30 分钟：1800000
  // 改为 15 分钟：900000
};
```

### Gas 设置

控制 gas 费用上限：

```javascript
const CONFIG = {
  GAS_LIMIT: 500000,                              // Gas 上限
  MAX_FEE_PER_GAS: ethers.parseUnits("5", "gwei"), // 最高 5 gwei
};
```

### 重试机制

更新失败后自动重试：

```javascript
const CONFIG = {
  MAX_RETRIES: 3,      // 最多重试 3 次
  RETRY_DELAY: 30000,  // 重试间隔 30 秒
};
```

---

## 📊 运行示例

```
🤖 Initializing Price Keeper...
======================================================================
📡 Connected to network: bsc (chainId: 56)

👛 Keeper Wallet:
   Address: 0x1234567890abcdef1234567890abcdef12345678
   Balance: 0.5 BNB

📄 IvyCore Contract: 0xYourIvyCoreAddress

⚙️  Contract Status:
   Test Mode: ❌ Disabled (Mainnet)
   Oracle: 0xChainlinkOracleAddress

✅ Initialization complete
======================================================================

🚀 Price Keeper started
   Update interval: 60 minutes
   Press Ctrl+C to stop

======================================================================

[2025-01-06T10:00:00.000Z] 🔄 Updating prices from Oracle...
   Current price: $0.95
   Mode: Mainnet
   📤 Transaction sent: 0xabcdef123456...
   ⏳ Waiting for confirmation...
   ✅ Transaction confirmed (block 12345678)
   Gas used: 150000

   📊 Updated Prices:
      Current: $0.96
      MA30: $1.00
      1h ago: $0.95
      Change: +1.05%
```

---

## 🛡️ 安全建议

### 钱包安全

1. **使用专用钱包**
   - 创建新钱包专门用于 keeper
   - 不要使用主钱包或存有大量资金的钱包

2. **权限最小化**
   - Keeper 钱包只需要调用 `updatePrices()` 的权限
   - 不需要任何管理员权限

3. **资金管理**
   - 只存放必要的 BNB（建议 0.1 - 0.5 BNB）
   - 定期检查余额，及时补充

### 服务器安全

1. **环境变量保护**
   ```bash
   # .env 文件权限设置（仅所有者可读）
   chmod 600 .env
   ```

2. **使用专用服务器**
   - 建议使用云服务器（AWS、阿里云等）
   - 配置防火墙，只开放必要端口

3. **监控告警**
   - 监控 keeper 运行状态
   - 余额过低时发送告警

---

## 📈 监控与维护

### 查看日志

**PM2 日志：**
```bash
# 实时查看日志
pm2 logs ivy-price-keeper

# 查看最近 100 行
pm2 logs ivy-price-keeper --lines 100

# 清空日志
pm2 flush
```

**日志文件位置：**
- PM2: `~/.pm2/logs/ivy-price-keeper-out.log`
- PM2 错误: `~/.pm2/logs/ivy-price-keeper-error.log`

### 监控指标

**关键指标：**
- ✅ 更新成功率（应 > 95%）
- ✅ Gas 消耗（每次约 0.001 - 0.005 BNB）
- ✅ 钱包余额（应 > 0.01 BNB）
- ✅ 价格变化幅度

**告警条件：**
- ❌ 连续 3 次更新失败
- ❌ 钱包余额 < 0.01 BNB
- ❌ Gas 价格过高（> 10 gwei）

### 定期维护

**每周检查：**
- 查看 keeper 运行状态
- 检查钱包余额
- 审查错误日志

**每月检查：**
- 计算 gas 消耗成本
- 评估更新频率是否合适
- 检查 Oracle 数据质量

---

## 🔧 故障排除

### Keeper 无法启动

**问题：**
```
❌ KEEPER_PRIVATE_KEY not set in .env
```

**解决：**
- 检查 `.env` 文件是否存在
- 确认 `KEEPER_PRIVATE_KEY` 已正确配置

---

### 余额不足

**问题：**
```
❌ insufficient funds for gas
```

**解决：**
1. 向 keeper 钱包充值 BNB
2. 降低 gas 上限（如果当前设置过高）

---

### Oracle 未设置

**问题：**
```
❌ Oracle not set in IvyCore contract
```

**解决：**
1. 确认合约已调用 `setOracle(chainlinkAddress)`
2. 确认已关闭测试模式 `setTestMode(false)`

---

### 更新频繁失败

**问题：**
- 网络连接不稳定
- RPC 节点问题
- Oracle 返回无效价格

**解决：**
1. 检查网络连接
2. 更换 RPC 节点：
   ```env
   # 备用 RPC 节点
   BSC_MAINNET_RPC_URL=https://bsc-dataseed2.binance.org
   BSC_MAINNET_RPC_URL=https://bsc-dataseed3.binance.org
   ```
3. 联系 Chainlink 支持检查 Oracle 状态

---

## 🌟 高级功能

### 集成 Telegram 通知

```javascript
// 在 price-keeper.js 中添加
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

async updatePrices() {
  try {
    // ... 更新逻辑

    // 发送成功通知
    await bot.sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      `✅ Price updated: $${ethers.formatEther(newPrice)}`
    );
  } catch (error) {
    // 发送失败告警
    await bot.sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      `❌ Update failed: ${error.message}`
    );
  }
}
```

### 自动余额补充

```javascript
// 监控余额并发送告警
async checkBalance() {
  const balance = await ethers.provider.getBalance(this.wallet.address);
  const minBalance = ethers.parseEther("0.01");

  if (balance < minBalance) {
    console.warn(`⚠️ Low balance: ${ethers.formatEther(balance)} BNB`);
    // 发送告警通知
    await this.sendAlert(`Please refund keeper wallet: ${this.wallet.address}`);
  }
}
```

---

## 📞 支持

如有问题，请联系技术团队或提交 GitHub Issue。

**常见问题文档：** DECENTRALIZATION.md

**合约文档：** contracts/IvyCore.sol
