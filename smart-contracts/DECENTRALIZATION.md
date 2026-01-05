# 去中心化价格更新机制

## 📋 概述

IvyCore合约现在支持**两种模式**：
- **测试模式（Test Mode）**：用于测试网，owner可以手动设置价格
- **主网模式（Mainnet Mode）**：完全去中心化，价格只能从Oracle读取

---

## 🔄 两种模式对比

| 特性 | 测试模式 | 主网模式 |
|------|---------|---------|
| **谁可以更新价格** | 仅Owner | 任何人（但从Oracle读取） |
| **价格来源** | 手动设置 | 去中心化Oracle |
| **价格变化限制** | ±50%/次 | 无限制（由Oracle决定） |
| **更新频率限制** | 最多1小时/次 | 无限制 |
| **适用场景** | BSC测试网（无DEX） | BSC主网（有DEX/Oracle） |
| **Owner权限** | 可手动设置价格 | **无法操纵价格** ✅ |

---

## 🧪 测试模式（当前默认）

### 配置
```solidity
testMode = true  // 默认开启
```

### 使用方法

**Owner更新价格：**
```javascript
await ivyCore.updatePrices(
  ethers.parseEther("0.95"),  // currentPrice: $0.95
  ethers.parseEther("1.00"),  // ma30Price: $1.00
  ethers.parseEther("1.00")   // price1hAgo: $1.00
);
```

### 限制条件

1. **访问控制**：只有owner可以调用
2. **时间限制**：两次更新之间至少间隔1小时
3. **价格变化限制**：单次更新最多±50%
   ```
   如果当前价格 = $1.00
   允许范围：$0.50 - $1.50
   禁止：$0.40 或 $2.00（超过50%）
   ```

### 安全保护

**防止极端价格操纵：**
- ✅ 不能一次性将价格从$1暴跌到$0.01
- ✅ 不能频繁更新价格（最多1小时/次）
- ✅ 每次变化有明确记录（event）

**示例场景：**
```
Day 1, 00:00 - Owner设置价格 $1.00
Day 1, 00:30 - 尝试更新到 $0.80 → ❌ 失败（未满1小时）
Day 1, 01:00 - 更新到 $0.80 → ✅ 成功（-20%，在±50%内）
Day 1, 02:00 - 更新到 $0.30 → ❌ 失败（-62.5%，超过50%）
Day 1, 02:00 - 更新到 $0.50 → ✅ 成功（-37.5%，在±50%内）
```

---

## 🚀 主网模式（生产环境）

### 启用主网模式

**前置条件：**
1. 必须先设置Oracle地址
2. 确保Oracle返回有效价格

**步骤：**
```javascript
// 1. 设置Oracle（Chainlink或自定义）
await ivyCore.setOracle(chainlinkOracleAddress);

// 2. 关闭测试模式（不可逆！）
await ivyCore.setTestMode(false);
```

⚠️ **注意：** 关闭测试模式后，**无法重新开启**（除非升级合约）

### 使用方法

**任何人都可以触发价格更新：**
```javascript
// 从Oracle读取价格并更新
await ivyCore.updatePrices(
  0,  // 参数被忽略
  0,  // 参数被忽略
  0   // 参数被忽略
);
// 实际价格从Oracle获取，不使用传入参数
```

### 完全去中心化

主网模式特性：
- ✅ **任何人都可以调用** updatePrices()
- ✅ **Owner无法操纵价格**（价格由Oracle决定）
- ✅ **无需信任单一实体**
- ✅ **符合去中心化理念**

---

## 🔐 熔断器机制（Circuit Breaker）

### checkCircuitBreaker() - 公开调用

**设计理念：**
- 任何人都可以调用 `checkCircuitBreaker()`
- 基于链上价格自动触发
- 无人为干预

**触发流程：**
```
1. 任何用户/Bot调用 checkCircuitBreaker()
2. 读取 currentPrice 和 price1hAgo
3. 计算跌幅：dropPercent = (current - 1hAgo) / 1hAgo
4. 如果跌幅 ≤ -25% → 触发Level 3熔断器（0.05x奖励）
5. 如果跌幅 ≤ -15% → 触发Level 2熔断器（0.2x奖励）
6. 如果跌幅 ≤ -10% → 触发Level 1熔断器（0.5x奖励）
```

**去中心化保证：**
- ✅ 测试模式：价格变化受限（±50%），owner无法制造极端跌幅
- ✅ 主网模式：价格来自Oracle，owner无法操纵
- ✅ 触发条件透明：基于链上数据，可验证

---

## 📊 部署建议

### BSC测试网部署（当前）
```javascript
// 1. 部署时默认testMode = true
const ivyCore = await IvyCore.deploy(ivyToken.address);

// 2. 测试期间，owner手动更新价格
await ivyCore.updatePrices(
  ethers.parseEther("0.90"),
  ethers.parseEther("1.00"),
  ethers.parseEther("1.00")
);

// 3. 任何人可以触发熔断器检查
await ivyCore.checkCircuitBreaker();
```

### BSC主网部署（未来）
```javascript
// 1. 部署合约
const ivyCore = await IvyCore.deploy(ivyToken.address);

// 2. 集成Chainlink Price Feed
const chainlinkOracle = "0x..."; // IVY/USDT price feed
await ivyCore.setOracle(chainlinkOracle);

// 3. 关闭测试模式（永久）
await ivyCore.setTestMode(false);

// 4. 之后任何人都可以更新价格（从Oracle读取）
// Owner无法操纵价格 ✅
```

---

## ⚠️ 重要安全提醒

### 测试模式风险
- ⚠️ Owner可以手动设置价格（但有限制）
- ⚠️ 仅适用于测试网
- ⚠️ 主网部署前**必须关闭**

### 主网模式要求
- ✅ 必须使用可信的去中心化Oracle（推荐Chainlink）
- ✅ 确保Oracle有足够的更新频率
- ✅ 监控Oracle健康状况

### 关闭测试模式前检查清单
- [ ] Oracle已正确配置
- [ ] Oracle返回有效价格
- [ ] 测试了价格更新功能
- [ ] 测试了熔断器触发
- [ ] 确认无法回退到测试模式
- [ ] 团队达成共识

---

## 🔍 查询当前模式

```javascript
// 检查当前模式
const inTestMode = await ivyCore.testMode();

if (inTestMode) {
  console.log("⚠️ 当前处于测试模式");
  console.log("Owner可以手动设置价格");
} else {
  console.log("✅ 当前处于主网模式");
  console.log("价格由Oracle控制，完全去中心化");
}

// 查看当前价格
const currentPrice = await ivyCore.currentPrice();
const ma30Price = await ivyCore.ma30Price();
const price1hAgo = await ivyCore.price1hAgo();

console.log(`当前价格: ${ethers.formatEther(currentPrice)} USDT`);
console.log(`MA30: ${ethers.formatEther(ma30Price)} USDT`);
console.log(`1小时前: ${ethers.formatEther(price1hAgo)} USDT`);
```

---

## 🎯 总结

**测试网（现在）：**
- testMode = true
- Owner手动设置价格（有限制）
- 适合测试，无DEX价格数据

**主网（未来）：**
- testMode = false
- 价格由Oracle提供
- 完全去中心化，Owner无法操纵

**熔断器：**
- 始终公开调用
- 基于链上价格
- 无人为干预

这个设计兼顾了**测试灵活性**和**主网去中心化**！✅
