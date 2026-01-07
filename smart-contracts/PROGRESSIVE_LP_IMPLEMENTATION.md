# 🚀 渐进式混合 LP 策略实现文档

## 📋 概述

本文档说明了 Ivy Protocol 的**渐进式混合 LP 策略**实现，解决了"LP 铸造占用挖矿额度"的核心问题。

---

## 🎯 问题背景

### **原始设计冲突**

```
代币总量：1亿 IVY
├─ 70% (7000万)：挖矿产出
└─ 30% (3000万)：预铸

用户存入 10000 USDT：
├─ 40% (4000 U) → RWA 理财（可赎回）
├─ 10% (1000 U) → 风险池（捐赠）
└─ 50% (5000 U) → 组 LP（需要铸造等值 IVY）

问题：
- 如果 LP 铸造占用 7000万挖矿额度 → 挖矿份额减少
- 极端情况：用户存入 1400万 USDT → 铸造 7000万 IVY → 挖矿耗尽
```

---

## 💡 解决方案：渐进式混合 LP 策略

### **核心思路**

将 30% 预铸重新分配，划出 15% (1500万 IVY) 作为 LP 储备池，并实现**渐进式消耗策略**：

```
阶段 1 (0-500万 IVY 消耗)：   80% 储备 + 20% 市场买入  → 温和上涨
阶段 2 (500-1000万 IVY)：    50% 储备 + 50% 市场买入  → 快速攀升
阶段 3 (1000-1500万 IVY)：   20% 储备 + 80% 市场买入  → 暴力拉升
阶段 4 (>1500万 IVY 耗尽)：  0% 储备 + 100% 市场买入 → 全额拉盘
```

---

## 📊 代币分配（修正后）

```
总量：100,000,000 IVY
├─ 70% (7,000万)：挖矿产出 ← 完全保留
├─ 15% (1,500万)：LP 储备池 ← 专门给 Bond 配对
└─ 15% (1,500万)：其他
    ├─ 5% (500万)：国库 DAO
    ├─ 5% (500万)：初始流动性
    └─ 5% (500万)：运营
```

---

## 🏗️ 架构设计

### **新增合约：LPManager.sol**

```
LPManager (LP 管理合约)
├─ 接收来自 IvyBond 的 USDT
├─ 根据储备消耗量自动判断阶段 (1/2/3/4)
├─ 按比例铸造储备 IVY + 从 DEX 买入 IVY
├─ 将 IVY + USDT 添加到 Uniswap LP
└─ 追踪储备使用情况
```

### **修改的合约**

1. **IvyToken.sol**
   - 新增 `lpMinter` 地址
   - 新增 `setLPMinter()` 函数
   - 新增 `mintForLP()` 函数（专门用于 LP 储备铸币）

2. **IvyBond.sol**
   - 将 `liquidityPool` 改名为 `lpManager`
   - 在 `deposit()` 函数中调用 `LPManager.addLiquidityForBond()`
   - 更新相关事件和view函数

---

## 📝 代码变更详情

### **1. LPManager.sol (新增)**

**文件路径**: `contracts/LPManager.sol`

**关键功能**：

```solidity
// 常量
uint256 public constant LP_RESERVE_CAP = 15_000_000 * 10**18;
uint256 public constant STAGE_1_THRESHOLD = 5_000_000 * 10**18;
uint256 public constant STAGE_2_THRESHOLD = 10_000_000 * 10**18;
uint256 public constant STAGE_3_THRESHOLD = 15_000_000 * 10**18;

// 状态变量
uint256 public reserveUsed;  // 已使用的储备

// 核心函数
function addLiquidityForBond(uint256 usdtAmount) external onlyBond {
    // 1. 获取当前阶段和储备比例
    (uint256 stage, uint256 reserveRatio) = getCurrentStageInfo();

    // 2. 计算需要的 IVY 总量
    uint256 totalIvyNeeded = _getIvyAmountForLP(usdtAmount);

    // 3. 分割：储备 vs 市场购买
    uint256 ivyFromReserve = (totalIvyNeeded * reserveRatio) / BASIS_POINTS;
    uint256 ivyFromMarket = totalIvyNeeded - ivyFromReserve;

    // 4. 铸造储备 IVY
    if (ivyFromReserve > 0) {
        IIvyTokenMinter(ivyTokenMinter).mintForLP(address(this), ivyFromReserve);
        reserveUsed += ivyFromReserve;
    }

    // 5. 从市场买入 IVY
    if (ivyFromMarket > 0) {
        _buyIvyFromMarket(usdtForBuy);
    }

    // 6. 添加 LP
    _addLiquidityToUniswap(totalIvyNeeded, usdtAmount);
}
```

**阶段判断逻辑**：

```solidity
function getCurrentStageInfo() public view returns (uint256 stage, uint256 reserveRatio) {
    if (reserveUsed < STAGE_1_THRESHOLD) {
        return (1, 8000);  // 80% 储备
    } else if (reserveUsed < STAGE_2_THRESHOLD) {
        return (2, 5000);  // 50% 储备
    } else if (reserveUsed < STAGE_3_THRESHOLD) {
        return (3, 2000);  // 20% 储备
    } else {
        return (4, 0);     // 0% 储备 (全市场买入)
    }
}
```

---

### **2. IvyToken.sol (修改)**

**新增状态变量**：

```solidity
/// @notice LP Minter address (LPManager) for LP reserve
address public lpMinter;
```

**新增函数**：

```solidity
// 设置 LP Minter
function setLPMinter(address _lpMinter) external onlyOwner {
    require(_lpMinter != address(0), "Invalid LP minter");
    address oldLPMinter = lpMinter;
    lpMinter = _lpMinter;
    isExcludedFromTax[_lpMinter] = true;
    emit LPMinterUpdated(oldLPMinter, _lpMinter);
}

// LP 专用铸币
function mintForLP(address to, uint256 amount) external {
    require(msg.sender == lpMinter, "Not LP minter");
    require(totalSupply() + amount <= TOTAL_SUPPLY_CAP, "Exceeds total supply cap");
    _mint(to, amount);
}
```

---

### **3. IvyBond.sol (修改)**

**状态变量更名**：

```solidity
// 原来：
address public liquidityPool;

// 修改后：
address public lpManager;  // LP Manager for progressive strategy
```

**接口新增**：

```solidity
interface ILPManager {
    function addLiquidityForBond(uint256 usdtAmount) external;
}
```

**deposit() 函数修改**：

```solidity
// 原来：
paymentToken.safeTransfer(liquidityPool, toLiquidity);

// 修改后：
paymentToken.safeApprove(lpManager, toLiquidity);
ILPManager(lpManager).addLiquidityForBond(toLiquidity);
```

---

## 🚀 部署流程

### **1. 部署合约（按顺序）**

```javascript
// 1. 部署 IvyToken
const ivyToken = await IvyToken.deploy(operationsWallet);

// 2. 部署 LPManager
const lpManager = await LPManager.deploy(
    usdtAddress,          // USDT token
    ivyToken.address,     // IVY token
    ivyToken.address,     // IVY minter (IvyToken自己)
    uniswapRouter,        // Uniswap V2 Router
    ivyUsdtPair           // IVY-USDT LP Pair
);

// 3. 部署 IvyBond
const ivyBond = await IvyBond.deploy(
    rwaWallet,            // RWA wallet (40%)
    lpManager.address,    // LP Manager (50%)
    reservePool           // Reserve pool (10%)
);

// 4. 设置权限
await ivyToken.setLPMinter(lpManager.address);  // 授权 LPManager 铸造 LP 储备
await lpManager.setIvyBond(ivyBond.address);    // 授权 IvyBond 调用 LPManager
```

### **2. 配置 LPManager**

```javascript
// 授权 LPManager 使用 USDT 和 IVY（用于 Uniswap）
// (这一步在合约内部自动处理)
```

### **3. 验证部署**

```javascript
// 检查 LP 储备上限
const reserveCap = await lpManager.LP_RESERVE_CAP();
console.log("LP Reserve Cap:", ethers.formatEther(reserveCap));  // 15,000,000 IVY

// 检查当前阶段
const [stage, ratio] = await lpManager.getCurrentStageInfo();
console.log("Current Stage:", stage);          // 应该是 1
console.log("Reserve Ratio:", ratio / 100);    // 应该是 80%
```

---

## 📊 用户存入流程示例

### **用户存入 10,000 USDT**

```
1. IvyBond.deposit(10000 USDT, referrer)

2. 资金分配：
   ├─ 40% (4000 U) → RWA Wallet (直接转账)
   ├─ 10% (1000 U) → Reserve Pool (直接转账)
   └─ 50% (5000 U) → LPManager.addLiquidityForBond(5000 U)

3. LPManager 处理 (假设阶段1，80:20):
   ├─ 需要 5000 IVY (假设币价$1)
   ├─ 80% (4000 IVY) → 从储备铸造
   ├─ 20% (1000 IVY) → 用 1000 USDT 从市场买入
   └─ 添加 LP: 5000 IVY + 5000 USDT → Uniswap

4. NFT 铸造：
   ├─ principal = 4000 USDT (可赎回)
   ├─ bondPower = 5000 (算力，按LP池入金全额计算)
   └─ 捐赠 = 1000 USDT (不可赎回)
```

---

## 🎯 优势总结

| 优势 | 说明 |
|------|------|
| ✅ **挖矿保护** | 7000万挖矿额度完全不受影响 |
| ✅ **储备充足** | 1500万 IVY 可支持 3000万 USDT 入金（币价$1时） |
| ✅ **渐进拉盘** | 随着储备消耗，自动增加市场买入比例 |
| ✅ **通缩机制** | 阶段4全额市场买入 = 持续买盘 |
| ✅ **公平算力** | 用户承担滑点成本，协议给予完整算力补偿 |

---

## 📈 预期效果

### **阶段1（筑基期 0-500万 IVY）**
- **储备比例**: 80%
- **市场压力**: 低（20% 买入）
- **支持入金**: ~1000万 USDT
- **币价表现**: 温和上涨

### **阶段2（加速期 500-1000万 IVY）**
- **储备比例**: 50%
- **市场压力**: 中（50% 买入）
- **支持入金**: ~1000万 USDT
- **币价表现**: 快速攀升

### **阶段3（冲刺期 1000-1500万 IVY）**
- **储备比例**: 20%
- **市场压力**: 高（80% 买入）
- **支持入金**: ~1000万 USDT
- **币价表现**: 暴力拉升

### **阶段4（成熟期 >1500万 IVY）**
- **储备比例**: 0%
- **市场压力**: 极高（100% 买入）
- **支持入金**: 无限制
- **币价表现**: 全额拉盘，持续通缩

---

## ⚠️ 注意事项

1. **Uniswap Router 地址**
   - 确保使用正确的 Uniswap V2 Router 地址
   - BSC Mainnet: `0x10ED43C718714eb63d5aA57B78B54704E256024E`
   - BSC Testnet: `0xD99D1c33F9fC3444f8101754aBC46c52416550D1`

2. **LP Pair 地址**
   - 需要先创建 IVY-USDT 交易对
   - 使用 Uniswap Factory 创建 Pair

3. **初始流动性**
   - 在用户开始存入前，需要添加初始流动性
   - 建议使用 5% (500万 IVY) 预铸额度

4. **Oracle 集成**
   - 当前 `_getIvyAmountForLP()` 使用固定 $1.0 价格
   - 生产环境需要集成 Oracle 或 Uniswap TWAP

5. **Slippage 保护**
   - 当前市场买入和添加 LP 的 `amountOutMin` 设置为 0
   - 生产环境建议添加滑点保护（例如 1-2%）

---

## 🧪 测试清单

- [ ] LPManager 部署成功
- [ ] IvyToken.setLPMinter() 授权成功
- [ ] LPManager.setIvyBond() 授权成功
- [ ] 用户存入 → LP 成功添加
- [ ] 储备使用量正确追踪
- [ ] 阶段切换正确（1→2→3→4）
- [ ] 市场买入比例正确
- [ ] NFT 算力计算正确（全额认定）
- [ ] Uniswap LP tokens 归属 LPManager

---

## 📚 相关文档

- **合约代码**:
  - `contracts/LPManager.sol`
  - `contracts/IvyToken.sol` (修改)
  - `contracts/IvyBond.sol` (修改)

- **部署脚本**: `scripts/deploy-lpmanager.js` (待创建)

---

## ✅ 实现状态

- ✅ LPManager 合约创建完成
- ✅ IvyToken 添加 LP 铸币权限
- ✅ IvyBond 集成 LPManager
- ⏳ 部署脚本待创建
- ⏳ 前端集成待实现

---

🎉 **渐进式混合 LP 策略实现完成！**
