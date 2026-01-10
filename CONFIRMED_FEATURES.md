# Ivy Protocol - 已确认功能文档
**Confirmed Features & Product Logic Documentation**

> **目的**: 记录所有经过讨论和确认的产品功能、业务流程、技术实现细节。避免重复讨论，作为开发和白皮书编写的唯一参考。

> **最后更新**: 2025-01-11

---

## 📋 目录

1. [核心概念](#核心概念)
2. [挖矿与奖励系统](#挖矿与奖励系统)
3. [复投功能](#复投功能)
4. [提币功能](#提币功能)
5. [推荐系统](#推荐系统)
6. [Bond NFT 系统](#bond-nft-系统)
7. [Genesis Node NFT](#genesis-node-nft)
8. [代币经济](#代币经济)
9. [UI 功能](#ui-功能)
10. [技术架构](#技术架构)

---

## 核心概念

### vIVY vs IVY

| 项目 | vIVY (Vested IVY) | IVY Token |
|------|-------------------|-----------|
| **性质** | 内部记账（虚拟） | ERC20 真实代币 |
| **用途** | 记录用户挖出的奖励 | 可交易、可转账的真实代币 |
| **获得方式** | 挖矿自动累积 | vIVY 解锁后转换 / 复投时铸造 |
| **是否可交易** | ❌ 否（仅记账） | ✅ 是 |
| **销毁意义** | ❌ 无意义（只是删除记账） | ✅ 有意义（减少流通供应） |

**重要结论**:
- vIVY 只是数字记账，不能直接销毁
- 任何涉及 IVY 销毁的操作，必须先将 vIVY 转换为真实 IVY 代币

---

## 挖矿与奖励系统

### 挖矿机制

1. **算力来源**: Bond NFT 的算力 (bondPower)
2. **奖励形式**: vIVY（内部记账）
3. **算力计算**:
   ```
   基础算力 = 投入 USDT × 50% (挖矿份额)
   有效算力 = 基础算力 × (1 + Boost%)
   ```

4. **Boost 加成来源**:
   - **Self Boost**: 持有 Genesis Node NFT = **+10%**
   - **Team Aura**: 推荐人持有 Genesis Node = **+2%**
   - **最大总 Boost = 12%** (10% + 2%)

### 奖励分配

```
每秒挖矿奖励 = (用户有效算力 / 全网总算力) × 全网每秒释放量
```

- 挖出的奖励以 vIVY 形式累积在 `user.pendingVested`
- 用户可选择：复投、标准解锁（30天）、极速解锁（50%惩罚）

---

## 复投功能

**状态**: ✅ 已确认并实现 (2025-01-11)

### 业务逻辑

用户可以将挖出的 vIVY 复投到 Bond NFT 中，增加算力，获得 **10% 算力加成**。

### 完整流程

#### 步骤 1: 用户操作
1. 打开复投模态框
2. 查看可用 vIVY 数量（例如：13000 vIVY）
3. **填写想复投的数量**（例如：10000 vIVY）- 支持部分复投
4. 选择要复投到哪个 Bond NFT
5. 点击确认

#### 步骤 2: 合约执行 (compoundVestedPartial)

```solidity
// 输入: tokenId, amount (10000 vIVY)

// 1. 扣除 vIVY 内部记账
user.pendingVested -= 10000;  // vIVY: 13000 → 3000

// 2. 铸造真实 IVY 代币（占用挖矿配额）
totalMinted += 10000;  // 占用 70M 挖矿上限中的 10000
ivyToken.mint(address(this), 10000 * 1e18);  // 铸造 10000 IVY

// 3. 查询 IVY 价格
uint256 ivyPrice = oracle.getAssetPrice(address(ivyToken));
// 测试网假设: 1 IVY = 1 USDT
// 主网: 从 Oracle 查询真实市场价格

// 4. 计算 USDT 等值
uint256 valueInUSDT = 10000 * 1 = 10000 USDT

// 5. 计算增加的算力（10% 加成）
uint256 powerToAdd = 10000 * 1.1 = 11000 Power

// 6. 销毁 IVY 代币（通缩机制）
ivyToken.transfer(0xdead, 10000 * 1e18);  // 销毁到黑洞地址

// 7. 增加 Bond NFT 算力
ivyBond.addCompoundPower(tokenId, 11000);
```

#### 结果

| 项目 | 变化 |
|------|------|
| 用户 vIVY | 13000 → 3000 (-10000) |
| IVY 供应 | 铸造 10000 → 销毁 10000 (净供应 = 0) |
| 挖矿配额占用 | totalMinted +10000 |
| Bond NFT 算力 | +11000 Power |

### 为什么要先铸造再销毁？

❌ **错误做法**: 直接扣除 vIVY 并增加算力
- vIVY 只是记账，直接扣除没有实际经济意义
- 无法根据 IVY 市场价格计算算力
- 无法实现通缩机制

✅ **正确做法**: vIVY → IVY → 销毁 → 算力
1. **占用挖矿配额**: totalMinted 累加，防止超过 70M 上限
2. **价格锚定**: 根据 IVY 真实市场价格计算算力价值
3. **通缩机制**: 销毁真实代币，减少流通供应
4. **经济闭环**: 铸造和销毁保持供应平衡，但算力提升

### 关键公式

```
复投算力 = 复投 vIVY 数量 × IVY 当前价格(USDT) × 1.1

测试网示例:
10000 vIVY × 1 USDT × 1.1 = 11000 Power

主网示例(假设 1 IVY = 2 USDT):
10000 vIVY × 2 USDT × 1.1 = 22000 Power
```

### 合约函数

```solidity
function compoundVestedPartial(uint256 tokenId, uint256 amount) external;
```

- **tokenId**: 要复投到的 Bond NFT ID
- **amount**: 复投的 vIVY 数量（单位：wei，需乘以 1e18）

### 前端实现

- **文件**: `client/src/components/TreasuryPanel.tsx`
- **UI**: 复投模态框，包含金额输入框和 MAX 按钮
- **验证**: amount > 0 且 amount <= 可用 vIVY

---

## 提币功能

**状态**: ✅ 已确认并实现 (2025-01-11)

### 两种提币方式

用户挖出的 vIVY 如果不复投，可以选择提币。vIVY 会自动转换为真实 IVY 并进入 30 天锁定期。

| 提币方式 | 等待时间 | 获得比例 | 损失 | 适用场景 |
|---------|---------|---------|------|---------|
| **标准解锁** | 30 天后一次性解锁 | 100% | 无 | 不急用的长期持有者 |
| **极速解锁** | 立即 | 50% | 50% 销毁 | 急需流动性的用户 |

**重要澄清**: 标准解锁**不是线性释放**，而是等待满 30 天后**一次性全部解锁**。

### 标准解锁 (Standard Unlock)

#### 流程

1. 用户点击"提币"或自动将 vIVY 转换为 IVY
2. IVY 进入 30 天锁定期（vestingStartTime = 当前时间）
3. **30 天后，用户可以无损领取 100% 的锁定 IVY**（一次性解锁）

#### 合约函数

```solidity
function claimVested() external;
```

**要求**:
```solidity
require(block.timestamp >= vestingStartTime + 30 days, "Vesting period not completed");
```

#### 前端显示

- 锁定状态: "Unlocks in X days"
- 已解锁状态: "✅ Ready to claim!"
- 按钮状态: 30天内禁用，30天后可点击

### 极速解锁 (Instant Cash Out)

#### 流程

1. 用户选择"Instant Cash Out"
2. 立即获得 50% 的锁定 IVY
3. 另外 50% 销毁到 0xdead 地址

#### 合约函数

```solidity
function instantCashOut() external;
```

**执行逻辑**:
```solidity
uint256 remaining = totalVested - totalClaimed;
uint256 penalty = remaining * 50%;  // 50% 惩罚
uint256 received = remaining * 50%; // 用户获得

ivyToken.transfer(user, received);           // 转给用户
ivyToken.transfer(0xdead, penalty);         // 销毁到黑洞
```

#### 前端警告

模态框显示:
```
⚠️ Warning: 50% Penalty

┌─────────────────┬─────────────────┐
│  You Receive    │   Burned        │
│  5000 IVY (50%) │  5000 IVY (50%) │
└─────────────────┴─────────────────┘
```

### vIVY 到提币的完整链路

```
挖矿 → vIVY (内部记账)
         ↓
  [用户选择提币]
         ↓
    vIVY → IVY (铸造真实代币)
         ↓
   IVY 进入 30 天锁定
         ↓
   ┌─────┴──────┐
   ↓            ↓
标准解锁      极速解锁
(30天后)      (立即)
100% 领取     50% 领取 + 50% 销毁
(一次性)
```

### 关键数据字段

```solidity
struct UserInfo {
    uint256 totalVested;      // 已转换为 IVY 的总量
    uint256 totalClaimed;     // 已领取的数量
    uint256 vestingStartTime; // 锁定开始时间
}
```

**剩余锁定量**: `totalVested - totalClaimed`

### 前端实现

- **文件**: `client/src/components/TreasuryPanel.tsx`
- **UI**:
  - Locked IVY 卡片（显示锁定量和倒计时）
  - 提币模态框（两种方式对比）
- **合约调用**:
  - `getVestingInfo(address)`: 读取锁定信息
  - `claimVested()`: 标准解锁
  - `instantCashOut()`: 极速解锁

---

## 推荐系统

### 推荐链接

- **格式**: `https://www.ivyprotocol.io?ref={referrerAddress}`
- **存储**: URL 参数 → ReferralContext → 本地存储
- **有效期**: 永久（存储在浏览器 localStorage）

### 推荐奖励

| 级别 | 关系 | 奖励比例 | 说明 |
|------|------|---------|------|
| L1 | 直推 | 10% | 直接推荐用户的挖矿奖励的 10% |
| L2 | 间推 | 5% | L1 用户推荐的用户的挖矿奖励的 5% |
| L3+ | 无限代 | 2% | 差额奖励（需要更高级别） |
| Peer | 平级 | 0.5% | 同级用户的奖励 |

### Genesis Node 加成

持有 Genesis Node NFT 的用户推荐奖励 +10%

---

## Bond NFT 系统

### Bond NFT 铸造

1. 用户存入 USDT（最低 10 USDT）
2. 系统铸造 Bond NFT（ERC721）
3. 资金分配：
   - 50% → 挖矿算力（Tranche B - LP Pool）
   - 40% → RWA 资产（Tranche A - 国债）
   - 10% → 储备金（Tranche C - Reserve）

### Bond Power 计算

```
初始 Bond Power = 存入 USDT × 50%

有效挖矿算力 = Bond Power × (1 + Boost%)
```

### Bond Power 增长方式

1. **追加投资**: 存入更多 USDT，铸造新的 Bond NFT
2. **复投**: 将 vIVY 复投增加算力（+10% 加成）

---

## Genesis Node NFT

**状态**: ✅ 已确认 (2025-01-11)

### Boost 机制

| Boost 类型 | 条件 | 加成比例 | 说明 |
|-----------|------|---------|------|
| **Self Boost** | 持有 Genesis Node | **+10%** | 自己的挖矿算力提升 10% |
| **Team Aura** | 推荐人持有 Genesis Node | **+2%** | 被推荐人获得 2% 算力加成 |

**最大总 Boost**: 10% + 2% = **12%**

### 重要澄清

- ❌ **错误**: Team Aura 最高 +20%
- ✅ **正确**: Team Aura 固定 +2%

### 合约常量

```solidity
uint256 public constant SELF_BOOST = 1000;   // 10% (1000 basis points)
uint256 public constant TEAM_AURA = 200;     // 2% (200 basis points)
```

### Boost 计算示例

```
场景 1: 用户持有 Genesis Node，推荐人也持有
- Self Boost: +10%
- Team Aura: +2%
- 总 Boost: +12%
- 有效算力 = Bond Power × 1.12

场景 2: 用户持有 Genesis Node，推荐人未持有
- Self Boost: +10%
- Team Aura: 0%
- 总 Boost: +10%
- 有效算力 = Bond Power × 1.10

场景 3: 用户未持有，推荐人持有
- Self Boost: 0%
- Team Aura: +2%
- 总 Boost: +2%
- 有效算力 = Bond Power × 1.02
```

---

## 代币经济

### IVY Token

- **标准**: ERC20
- **总供应上限**: 100,000,000 IVY (100M)
- **分配**:
  - 挖矿释放: 70,000,000 IVY (70M)
  - 团队: 15,000,000 IVY (15M)
  - 生态: 15,000,000 IVY (15M)

### 挖矿释放

- **总量**: 70M IVY
- **释放机制**: 每秒释放，动态调整
- **减半**: 每挖出 20M 减半一次
- **当前释放**: ~1 IVY/秒（动态调整）

### 通缩机制

1. **复投销毁**: 用户复投时，IVY 销毁到 0xdead
2. **极速解锁惩罚**: 50% 销毁
3. **通缩效果**: 减少流通供应，理论上推高价格

---

## UI 功能

**状态**: ✅ 已实现 (2025-01-11)

### 1. IVY 价格 & 算力换算显示

**位置**: `TreasuryPanel.tsx` - Effective Mining Power 下方

**显示内容**:
- Current IVY Price: $1.00 USDT (测试网固定，主网从 Oracle 读取)
- Compound Rate: 1.10 Power per IVY (10% 加成)
- 公式说明: `1 IVY = $1 × 1.1 = 1.1 Power`

**技术实现**:
```typescript
const ivyPriceUSDT = 1; // 测试网固定，主网待接入 Oracle
const ivyToPowerRate = ivyPriceUSDT * 1.1;
```

### 2. 用户算力占比显示

**位置**: `TreasuryPanel.tsx` - Effective Mining Power 卡片底部

**显示内容**:
- Network Power Share: X.XXXX%
- 进度条可视化
- 详细数据: Your Power vs Total Network Power

**技术实现**:
```typescript
const totalPoolPower = totalPoolBondPower / 1e18;
const userPowerPercentage = (syncedBondPower / totalPoolPower) * 100;
```

**数据来源**:
- 读取合约的 `totalPoolBondPower` 公开变量
- 用户 `bondPower` 从 `getUserMiningStats` 获取

### 3. 全网算力排行榜

**位置**: `pages/Team.tsx` 页面底部

**组件**: `PowerLeaderboard.tsx`

**当前状态**: ✅ UI 框架已完成，⏳ 数据待接入

**显示内容**:
- 排名前 3 用户特殊标记（金、银、铜）
- 用户地址、算力、网络占比
- 全网总算力

**待实现**:
```typescript
// TODO: 从合约事件日志或后端 API 获取排行榜数据
// 方案 1: 监听 UserSynced 事件，收集所有用户地址
// 方案 2: 后端服务定期抓取并排序
// 方案 3: The Graph 子图查询
```

---

## 技术架构

### 智能合约

| 合约 | 地址 (BSC Testnet) | 功能 |
|------|-------------------|------|
| IvyCore | `0xf607EEf5390298D66F5B6Ef22C81515Add90B06b` | 挖矿核心逻辑 |
| IvyBond | `0x8C3e30B1d21Bd2a89d16613f546dD384FCD1d029` | Bond NFT 管理 |
| IvyToken | `0x83cEbd8b7DDd6536FB05CB19D5DF97fa94867f98` | ERC20 代币 |
| GenesisNode | `0x2E2b5E602D6a2F6DB616aFe7c7a9bF522aD9Cb70` | Genesis NFT 和 Boost |
| MockUSDT | `0xdF07B56606fF2625d6dAE0AfcE27bfd5836e5B64` | 测试 USDT |

### 前端技术栈

- **框架**: React + Vite + TypeScript
- **Web3**: Wagmi v3 + Viem v2
- **钱包**: RainbowKit
- **UI**: Tailwind CSS + shadcn/ui
- **链**: BSC Testnet (Chain ID: 97)

---

## 2025-01-11 更新日志

### 1. 部分复投功能 ✅

**合约层**:
- 新增函数: `compoundVestedPartial(uint256 tokenId, uint256 amount)`
- 支持用户输入任意数量进行复投（不再强制全部复投）

**前端层**:
- TreasuryPanel: 添加金额输入框和 MAX 按钮
- 实时计算并显示预期获得的算力

### 2. 提币功能 ✅

**新增两种提币方式**:
- 标准解锁: 30天后100%无损领取（一次性解锁）
- 极速解锁: 立即领取50%，销毁50%

**UI 实现**:
- Locked IVY 卡片：显示锁定金额和倒计时
- 提币模态框：清晰对比两种方式的优劣

### 3. IVY 价格显示 ✅

**新增价格信息卡片**:
- 显示当前 IVY 价格（测试网固定 $1）
- 显示复投换算率（1 IVY = 1.1 Power）
- 公式说明

### 4. 用户算力占比 ✅

**新增网络占比显示**:
- 读取 totalPoolBondPower
- 计算并显示用户算力占全网比例
- 进度条可视化展示

### 5. 全网算力排行榜 ✅

**新增排行榜组件**:
- 创建 PowerLeaderboard.tsx
- 集成到 Team 页面
- UI 框架完成，数据待接入

### 6. 功能确认文档 ✅

**创建本文档**: `CONFIRMED_FEATURES.md`
- 记录所有已确认的产品功能
- 详细说明核心业务逻辑
- 避免重复讨论和"失忆"问题

---

## 重要提醒

### 复投流程核心逻辑（防止遗忘）

**永远记住**:
1. vIVY 是内部记账，不是真实代币
2. 复投时必须: **vIVY → 铸造 IVY → 销毁 IVY → 增加算力**
3. 不能跳过"铸造 IVY"这一步，否则无法实现价格锚定和通缩

### 提币流程核心逻辑

**永远记住**:
1. 标准解锁 = 等待 30 天后 **100% 无损领取（一次性解锁）**
2. 极速解锁 = 立即领取但 50% 销毁
3. **不是线性释放，是 30 天后一次性解锁**

### Boost 机制核心逻辑

**永远记住**:
1. Self Boost = **+10%**（持有 Genesis Node）
2. Team Aura = **+2%**（推荐人持有 Genesis Node）
3. 最大总 Boost = **12%**，不是 20%！

---

## 待实现功能

### 1. Oracle 集成（主网）
- [ ] 接入 Chainlink 或其他预言机
- [ ] 实时读取 IVY/USDT 价格
- [ ] 更新前端价格显示逻辑

### 2. 排行榜数据源
- [ ] 方案A: 监听合约事件日志
- [ ] 方案B: 后端服务定期抓取
- [ ] 方案C: The Graph 子图
- [ ] 实现排序和分页

### 3. 高级功能
- [ ] 批量操作（多个 Bond NFT 同时复投）
- [ ] 历史记录查询
- [ ] 收益报表导出

---

**文档维护者**: Claude Code + User
**版本**: v1.0
**下次更新**: 当有新功能确认时或发现错误时

---

## 如何使用本文档

1. **开发前**: 查阅相关功能的确认逻辑，避免重复讨论
2. **开发中**: 按照文档中的流程和公式实现
3. **测试时**: 对照文档验证功能是否正确
4. **讨论时**: 引用文档内容作为依据
5. **更新时**: 及时记录新确认的功能和修改

**记住**: 这是产品的"单一事实来源"，所有决策以本文档为准！
