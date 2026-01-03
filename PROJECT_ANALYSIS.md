## Ivy Protocol 项目架构分析 - 2026-01-03

### 项目结构
- 仓库: https://github.com/edwarddddddd-77/ivy-protocol
- 最新提交: 8548b65 - "Chore: Project Handoff - Save architecture state and logs"
- 分支: main

### 核心架构：双轨并行设计

#### Track A: 身份与访问层 (GenesisNode.sol)
- **类型**: ERC721 NFT
- **功能**: 用户身份和权限代表
- **总供应**: 1,386 个
- **价格**: 1,000 USDT
- **资金流**: 100% 转入 TeamOpsWallet
- **核心属性**:
  - selfBoost: +10% 挖矿力
  - teamAura: +2% 对直接推荐人的挖矿力加成
- **推荐**: 记录推荐人关系

#### Track B: 财库与收益层 (IvyBond.sol + IvyCore.sol)
- **入口**: IvyBond.sol
- **引擎**: IvyCore.sol
- **功能**: 管理用户资本投资和收益生成
- **资金分配 (50/40/10 分配)**:
  - 50% -> LiquidityPool
  - 40% -> RWAWallet
  - 10% -> ReservePool
- **推荐收益**: 新增 IVY token 发行，L1 10%，L2 5% 等

### 前端状态
- **多页面应用**:
  - /nodes: 节点控制台 (Track A)
  - /yield: 收益终端 (Track B)
- **国际化**: 英文 (en) 和繁体中文 (zh)
- **水龙头**: 在导航栏中的黄色按钮

### 关键问题（需要解决）
**CRITICAL BUG**: 缺少合约地址配置
- 文件: client/src/contracts/addresses.json
- 缺少: MockUSDT 和 IvyBond 地址
- 影响: 水龙头功能无法使用，阻止完整流程测试

### 下一步行动
1. 部署合约到 BSC 测试网
2. 更新 addresses.json 中的合约地址
3. 测试完整流程：领水 → 购买节点 → 存款
