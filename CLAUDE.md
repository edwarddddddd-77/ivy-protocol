# IVY Protocol - Project Context

## Product Introduction

### What is IVY Protocol?
IVY Protocol 是一个基于 PID 控制器的结构化债券 DeFi 协议。用户通过存入 USDT 获得 Bond NFT，参与协议挖矿获取 IVY 代币收益。

### Core Mechanism
1. **存款分配 (50/40/10)**
   - 50% → Mining Principal (产生挖矿算力)
   - 40% → RWA Assets (实物资产储备)
   - 10% → Reserve Fund (协议保险金)

2. **Genesis Node NFT**
   - 价格: 1000 USDT
   - 最大供应: 500 个
   - 持有者权益:
     - +10% 自身挖矿加成
     - +2% 团队光环 (直推用户获得额外加成)
     - DAO 投票权 (1节点 = 1票)

3. **收益机制**
   - 每日释放 IVY 代币 (PID 控制器动态调节)
   - 挖矿产出 vIVY → Harvest 转为锁仓 IVY → 30天线性释放
   - 可选择即时提取 (50% 罚没)

4. **推荐奖励**
   - L1 直推: 10%
   - L2 间推: 5%
   - Team Bonus: 基于团队业绩
   - Peer Bonus: 平级奖励

### Target Users
- DeFi 投资者
- 追求稳定收益的用户
- 社区推广者

---

## Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 + Framer Motion
- **State Management**: React Query (TanStack Query)

### Web3
- **Wallet Connection**: RainbowKit + wagmi 3
- **Blockchain Interaction**: viem 2
- **Network**: BSC Testnet (Chain ID: 97)

### Infrastructure
- **Hosting**: Vercel (自动部署)
- **Error Monitoring**: Sentry
- **RPC Nodes**:
  - Primary: NodeReal
  - Fallback: PublicNode, Binance Seeds

---

## Smart Contracts (BSC Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| MockUSDT | 0x3c1fbf1F033EE19DA2870A5cd33cfFe5C27d30Fe | 测试用 USDT |
| GenesisNode | 0x951e46DD61A308F8F919B59178818dc7ab83e685 | 节点 NFT |
| IvyToken | 0xd93ee28F81d0759748d273eac805e0f5053D7703 | IVY 代币 |
| IvyCore | 0x44e402586776f6343fB733B7029A0389F1186E8C | 核心挖矿逻辑 |
| IvyBond | 0x4301A2E67c800835BdBfF3cb385D3287Ac7B6B57 | 债券 NFT |

---

## Completed Features

### Core Functions
- [x] Genesis Node NFT 购买系统
- [x] Treasury Bond 存款挖矿
- [x] vIVY 收获与 IVY 释放
- [x] 30天线性解锁 / 即时提取
- [x] 推荐系统 (L1/L2/Team/Peer)
- [x] 实时收益计算与显示

### User Experience
- [x] 多语言支持 (English / 繁體中文 / 한국어 / Español)
- [x] 骨架屏加载状态
- [x] 响应式设计 (PC/平板/手机)
- [x] 推荐二维码生成
- [x] ROI 计算器
- [x] 团队树状图可视化
- [x] 奖励历史记录

### Advanced Features
- [x] NFT 市场 (Genesis Node 交易)
- [x] DAO 治理系统
  - 提案类型: 参数变更/功能请求/合作伙伴/社区活动/其他
  - 投票规则: 1节点=1票, 7天投票期, 127人最低参与
  - 数据存储: localStorage (轻量级方案)

### Monitoring
- [x] Sentry 错误监控 (生产环境启用)

---

## Project Structure

```
ivy-protocol/
├── client/
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   │   ├── ui/         # 基础组件 (Button, Card, Skeleton...)
│   │   │   ├── dao/        # DAO 相关组件
│   │   │   └── ...
│   │   ├── contexts/       # React Context
│   │   │   ├── Web3Context.tsx      # 钱包连接配置
│   │   │   ├── LanguageContext.tsx  # 多语言翻译
│   │   │   └── ReferralContext.tsx  # 推荐系统
│   │   ├── hooks/          # 自定义 Hooks
│   │   │   ├── useIvyContract.ts    # 核心合约交互
│   │   │   ├── useDAO.ts            # DAO 逻辑
│   │   │   ├── useNFTMarket.ts      # NFT 市场
│   │   │   └── ...
│   │   ├── pages/          # 页面组件
│   │   │   ├── Home.tsx    # 首页
│   │   │   ├── Nodes.tsx   # 节点控制台
│   │   │   ├── Yield.tsx   # 收益终端
│   │   │   ├── Team.tsx    # 团队业绩
│   │   │   ├── Market.tsx  # NFT 市场
│   │   │   └── DAO.tsx     # DAO 治理
│   │   └── contracts/      # 合约 ABI 和地址
│   └── ...
└── CLAUDE.md               # 项目上下文 (本文件)
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `client/src/main.tsx` | 应用入口, Sentry 初始化 |
| `client/src/App.tsx` | 路由配置 |
| `client/src/contexts/Web3Context.tsx` | RPC 节点配置 |
| `client/src/contexts/LanguageContext.tsx` | 所有翻译文本 |
| `client/src/contracts/addresses.json` | 合约地址 |
| `client/src/hooks/useIvyContract.ts` | 核心合约读写 |

---

## Deployment

### Vercel
- 自动部署: 推送到 `main` 分支即触发
- 域名: ivyprotocol.io

### Git Workflow
```bash
git add -A
git commit -m "feat/fix/docs: description"
git push origin main
```

---

## Known Issues

1. **Sentry 上报**: 国内网络访问 Sentry US 服务器不稳定，海外用户正常
2. **RPC 连接**: 偶尔 BSC Testnet RPC 超时，已配置多节点 fallback

---

## TODO / Future Plans

### High Priority
- [ ] 智能合约安全审计
- [ ] 测试网公测
- [ ] 主网部署

### Medium Priority
- [ ] 新手引导 (Onboarding Tour)
- [ ] 其他页面骨架屏优化
- [ ] 通知系统 (投票提醒、收益到账)

### Low Priority
- [ ] 数据埋点分析
- [ ] 社交分享优化
- [ ] 邀请排行榜

---

## Contact & Resources

- GitHub: github.com/edwarddddddd-77/ivy-protocol
- Vercel Dashboard: vercel.com
- Sentry Dashboard: sentry.io

---

*Last Updated: 2025-01*
