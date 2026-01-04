# Ivy Protocol 白皮书 V2.5 阅读笔记

## 1. 执行摘要
- 首个基于 PID 动态调节的链上结构化债券协议
- 版本: V2.5 (Fair Launch Edition)
- 目标: 解决 DeFi 1.0 "不可持续性"痛点
- 结合 RWA (现实世界资产) 与 DeFi (链上原生收益) 的双引擎金融生态

## 2. 市场痛点
- 收益不可持续: 庞氏模型，高APY瞬间崩塌
- 流动性死锁: 质押锁仓导致无法灵活应对
- 缺乏真实价值: 仅靠代币通胀，无 Real Yield 支撑

## 2.2 Ivy 解决方案
- **结构化分层**: 40% RWA / 50% 智能算法增长 / 10% 流动性缓冲
- **PID 动态调节**: 根据市场供需自动调节代币产出
- **债券二级市场**: Bond NFT 可折价转让

## 3. 核心架构: 三态平衡系统 (Tri-State Equilibrium)
资金分配: **40/50/10 策略**

### 3.1 Tranche A: 稳定锚 (The Safety Anchor) - 40%
- 资金流向: RWA 渠道 (Ondo Finance, MakerDAO)
- 资产属性: Hard Cash (硬通货)，与加密市场完全隔离
- 核心作用: 确保用户本金安全，产生 Real Yield
- 预期收益: 年化 5-8%

### 3.2 Tranche B: 增长翼 (The Growth Engine) - 50%
- 资金流向: 铸造 Ivy-Bond NFT，注入 Uniswap V3 [IVY/USDT] 池
- 资产属性: Risk Asset (风险增长)
- 收益来源: 交易手续费分红 + IVY 代币动态挖矿奖励
- 流动性创新: Bond NFT 可在 Bond Marketplace 折价交易

**50% 增长翼如何推升币价:**
1. 制造稀缺 (Supply Shock): 500U 对应的 IVY 锁死在 LP 池
2. 加厚地基 (Deep Liquidity): 做市资金使交易池深度极厚
3. 被动收入 (Fee Capture): LP 持续捕获交易手续费


### 3.3 Tranche C: 缓冲池 (The Reserve Buffer) - 10%
- 资金流向: Aave V3 或 Compound 活期借贷池
- 资产属性: 即时流动性 (Instant Liquidity)
- 核心作用:
  - 极速赎回通道: 日常小额赎回无需拆解 RWA 或 LP
  - 防穿仓气囊: 跌幅 > 50% 时自动启动护盘

## 实战推演: 存入 1000 USDT
- 400 USDT (保命钱): 自动买入美债 RWA，完全隔离风险
- 500 USDT (印钞机): 与协议库中的 IVY 配对放入 Uniswap，获得 Bond NFT
- 100 USDT (备用金): 存入 Aave 活期

## 4. 核心机制创新

### 4.1 光合作用 (Photosynthesis) - 收益路由系统
- **牛市模式 (P > MA30)**: 100% 真实收益用于回购并销毁 IVY
- **熊市模式 (P < MA30)**: 真实收益直接以 USDT 分红给质押者

### 4.2 PID 动态释放算法
公式: **α = (P_now / MA30) ^ k**
- α: 每日释放量的调整系数
- P_now: 当前预言机读取的 IVY 价格 (TWAP 24小时加权)
- MA30: 过去 30 天的移动平均价格
- k: 敏感度系数 (默认 k=2)

### 4.3 根植机制 (Rooting Mechanism) - 2100万黄金通缩

**A. 三重燃烧引擎 (The Triple Burn):**
1. 交易税燃烧: 链上转账收取 0.1% 税费直接销毁
2. 回购燃烧: 光合作用在牛市产生的回购 IVY 100% 销毁
3. 罚没燃烧: 用户选择"极速解锁"(不等待30天)，扣除的 50% 代币直接销毁

**B. 黄金转折点 (The Golden Pivot):**
- 当总供应量触及 2100 万枚时，所有燃烧机制自动停止
- 协议进入"成熟期"，光合作用的回购资金将不再销毁代币，而是全额注入分红池

## 5. 代币经济学 (Tokenomics)

- 代币名称: Ivy Token (IVY)
- 最大供应量: 100,000,000 (1亿枚，硬顶写死)
- 合约标准: ERC-20 (代币) & ERC-721 (债券 NFT)

### 5.1 代币分配
| 板块 | 比例 | 数量 | 说明 |
|------|------|------|------|
| 生态/债券产出 | 70% | 70,000,000 | 社区所有，由 PID 算法控制，预计 4-6 年挖完 |
| DAO 金库 | 15% | 15,000,000 | 储备金，用于做市、审计、黑天鹅赔付 |
| 早期社区/空投 | 10% | 10,000,000 | 营销燃料，用于创世空投及吸血鬼攻击 |
| 初始流动性 | 5% | 5,000,000 | TGE 时注入并永久锁仓 (Burned LP) |
| 核心团队 | 0% | 0 | Fair Launch，团队无预挖、无留存 |

### 5.2 协议可持续性与税收
**0.2% 动态交易税:**
- 0.1% 销毁 (Burn): 直接打入黑洞地址
- 0.1% 运营费 (Dev/Ops): 自动划转至多签运营钱包

**RWA 绩效费:** 协议额外提取 Tranche A (RWA) 收益的 10% 作为长期发展基金

### 5.3 vIVY 延迟解锁机制
用户挖矿产出形式为 vIVY (Vested IVY)，需通过以下方式转化为 IVY


### vIVY 解锁路径选择
| 选项 | 描述 | 结果 |
|------|------|------|
| 标准解锁 | 线性释放 30 天 | 1:1 获得 IVY (100 vIVY → 100 IVY) |
| 极速解锁 | 立即获得 | 扣除 50% 罚金销毁 (100 vIVY → 50 IVY) |
| 债券复投 (Compound) | 将 vIVY 复投进 Bond NFT | 获得 10% 算力加成 (100 vIVY → 110 Bond Value) |

**增量激励算法:** 系统仅对"复投部分的资金"给予 10% 的算力加成 (Bonus applies to the reinvested amount only)，原持有本金不享受重复加成。

## 6. 治理与安全

### 6.1 管理权限: 受限的多签 (Constrained Multi-Sig)
- Gnosis Safe 5/8 多签钱包管理
- 成员构成: 3名核心团队 + 2名投资机构 + 3名社区公选代表
- DAO 金库大额动用 (>50k USDT) 需通过 Snapshot 社区提案

### 6.2 时间锁 (Timelock)
- 任何对协议关键参数 (如 PID 系数、手续费率) 的修改，必须经过链上 **48小时公示期** 方可执行

### 6.3 资金托管
- RWA 部分资产通过智能合约集成 Ondo Finance 或 Ceffu (原币安托管) 的 MPC 钱包方案

## 7. 路线图 (Roadmap)

**Phase 1: 创世 (Genesis)**
- 合约代码审计完成 (CertiK/SlowMist)
- 发布 Ivy-Bond 创世 NFT，建立初始锚定资金池
- 上线 RWA 接入模块

**Phase 2: 增长 (Growth)**
- 开启 PID 动态挖矿
- 上线 Bond Marketplace (债券二级市场)
- 启动"吸血鬼攻击": 支持 Curve/Aave LP Token 直接购买债券

**Phase 3: 成熟 (Maturity)**
- 启动 DAO 治理，移交 PID 参数修改权
- 跨链部署 (Arbitrum/Optimism)
- 建立实业投资基金，反哺 IVY 回购

## 8. 风险声明 (Risk Disclosure)
- 智能合约风险: 代码可能存在未被发现的漏洞
- RWA 底层风险: 极端宏观环境下，底层国债资产可能面临流动性问题
- 市场风险: IVY 代币价格受市场情绪影响，可能出现剧烈波动

---
**常青藤协议 (Ivy Protocol)**
让时间成为你的盟友。
Redefining Yield with Structure and Mathematics.
