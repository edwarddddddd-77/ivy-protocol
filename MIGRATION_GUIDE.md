# Ivy Protocol 项目迁移指南

**创建日期**: 2026-01-04  
**最新提交**: `89985cf` - TOKENOMICS: Mining cap 70M + Pre-mint 30M to Operations

---

## 一、项目恢复步骤

1. 克隆仓库
2. 配置 Git 用户信息
3. 创建 `.env` 文件（需要私钥和 API Key）
4. 安装依赖

详细的恢复指令和敏感信息请参考单独提供的迁移文档。

---

## 二、项目结构

```
ivy-protocol/
├── smart-contracts/           # 智能合约
│   ├── contracts/             # Solidity 源码
│   ├── scripts/               # 部署脚本
│   └── hardhat.config.cjs     # Hardhat 配置
├── client/                    # 前端 React 应用
├── docs/                      # 项目文档
└── .env                       # 环境变量 (需手动创建)
```

---

## 三、代币经济模型

| 分配 | 数量 | 说明 |
|------|------|------|
| **总供应量** | 100,000,000 IVY | Hard Cap |
| **预铸 (Pre-mint)** | 30,000,000 IVY | 部署时铸造给 OperationsWallet |
| **挖矿分配** | 70,000,000 IVY | 通过 IvyCore PID 算法释放 |

---

## 四、核心功能状态

### ✅ 已实现

- PID 动态释放 (k=2.0, α∈[0.1, 1.5])
- 三级熔断机制 (-10%/-15%/-25%)
- 动态半衰期 (每 700 万 IVY 衰减 5%)
- 代币交易税 (0.2% = 0.1% 销毁 + 0.1% 运营)
- 级差阻断 + 平级管理奖
- 光合作用 (牛市回购销毁/熊市分红)
- 分红池机制

### ⚠️ 待实现

- vIVY 复投选项
- Compound 实际 IVY 转移
- 熔断自动解除逻辑
- Chainlink 预言机集成

---

## 五、部署命令

```bash
# 编译合约
cd smart-contracts && npx hardhat compile

# 部署到 BSC Testnet
npx hardhat run scripts/deployFullV2.cjs --network bscTestnet

# 启动前端
cd client && npm run dev
```

---

**注意**: 敏感信息（私钥、API Key、GitHub Token）请参考单独提供的迁移文档。
