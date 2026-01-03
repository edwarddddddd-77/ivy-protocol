import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // ==================== Home Page ====================
    'home.tagline': 'System Online // V2.5',
    'home.title.line1': 'Let Time',
    'home.title.line2': 'Be Your Ally',
    'home.subtitle': 'The First PID-Controlled Structured Bond Protocol.',
    'home.subtitle.highlight': 'Algorithmic Stability // Yield Optimization',
    'home.cta': '[ Initialize Mint ]',
    'home.cta.locked': '[ SYSTEM LOCKED ]',
    'home.cta.minting': '[ MINTING... ]',
    
    // ==================== Navigation ====================
    'nav.protocol': 'PROTOCOL',
    'nav.nodes': 'NODES',
    'nav.yield': 'YIELD',
    'nav.docs': 'DOCS',
    'nav.connect': 'Connect Wallet',
    'nav.faucet': 'FAUCET',
    
    // ==================== Common ====================
    'common.access_denied': 'ACCESS DENIED',
    'common.return_home': '[ RETURN HOME ]',
    'common.connect_wallet': 'Please connect your wallet',
    'common.approve': '[ APPROVE USDT ]',
    'common.approving': '[ APPROVING... ]',
    'common.approved': '✓ APPROVED',
    
    // ==================== Nodes Page ====================
    'nodes.console': 'NODE CONSOLE // IDENTITY LAYER',
    'nodes.title': 'GENESIS NODES',
    'nodes.description': 'Purchase and manage your Genesis Node NFTs. Each node grants permanent mining boosts and network privileges.',
    'nodes.privileges': 'NODE PRIVILEGES',
    'nodes.self_boost': 'Self Boost',
    'nodes.self_boost_desc': 'Permanent mining power increase for node holders',
    'nodes.team_aura': 'Team Aura',
    'nodes.team_aura_desc': 'Bonus granted to all your direct referrals',
    'nodes.max_supply': 'Max Supply',
    'nodes.max_supply_desc': 'Limited edition Genesis Nodes - first come, first served',
    
    // ==================== Identity Panel ====================
    'identity.title': 'IDENTITY & ACCESS',
    'identity.subtitle': 'Genesis Node Membership',
    'identity.current': 'Current Identity',
    'identity.visitor': 'VISITOR',
    'identity.genesis_node': 'GENESIS NODE',
    'identity.active': 'ACTIVE',
    'identity.privilege_boosts': 'PRIVILEGE BOOSTS',
    'identity.total_boost': 'Total Mining Boost',
    'identity.your_network': 'Your Network',
    'identity.direct_referrals': 'Direct Referrals',
    'identity.supply': 'Supply',
    'identity.node_price': 'Node Price',
    'identity.buy_node': '[ BUY GENESIS NODE ]',
    'identity.buying': '[ BUYING... ]',
    'identity.not_deployed': 'Contract Not Deployed',
    'identity.deploy_first': 'Deploy GenesisNode contract first',
    
    // ==================== Yield Page ====================
    'yield.terminal': 'YIELD TERMINAL // INVESTMENT LAYER',
    'yield.title': 'TREASURY BONDS',
    'yield.description': 'Deposit USDT to earn IVY tokens. Your investment is automatically distributed across liquidity, RWA, and reserve pools.',
    'yield.genesis_active': 'Genesis Node Active',
    'yield.boost_message': 'Your mining rewards are boosted',
    'yield.no_node': 'No Genesis Node',
    'yield.no_node_desc': 'Purchase a Genesis Node to unlock +10% mining boost and +2% team aura.',
    'yield.go_to_nodes': 'Go to Node Console',
    'yield.fund_distribution': 'FUND DISTRIBUTION',
    'yield.liquidity_pool': 'Liquidity Pool',
    'yield.liquidity_desc': 'DEX Trading Pairs',
    'yield.rwa_wallet': 'RWA Wallet',
    'yield.rwa_desc': 'Real World Assets',
    'yield.reserve_pool': 'Reserve Pool',
    'yield.reserve_desc': 'Protocol Insurance',
    'yield.referral_rewards': 'REFERRAL REWARDS',
    'yield.l1_direct': 'L1 Direct',
    'yield.l2_indirect': 'L2 Indirect',
    'yield.l3_infinite': 'L3+ Infinite',
    'yield.rewards_note': 'Rewards are minted from the Mining Pool, not deducted from user principal.',
    'yield.how_it_works': 'HOW IT WORKS',
    'yield.step1': 'Deposit',
    'yield.step1_desc': 'Deposit USDT to create your bond',
    'yield.step2': 'Split',
    'yield.step2_desc': 'Funds distributed 50/40/10',
    'yield.step3': 'Mine',
    'yield.step3_desc': 'Earn IVY tokens daily',
    'yield.step4': 'Claim',
    'yield.step4_desc': 'Claim rewards every 24h',
    
    // ==================== Treasury Panel ====================
    'treasury.title': 'TREASURY & YIELD',
    'treasury.subtitle': 'Investment & Mining Rewards',
    'treasury.my_principal': 'My Principal',
    'treasury.bond_power': 'Bond Power',
    'treasury.pool_share': 'Pool Share',
    'treasury.est_daily': 'Est. Daily',
    'treasury.total_claimed': 'Total Claimed',
    'treasury.referral_earnings': 'Referral Earnings',
    'treasury.fund_distribution': 'Fund Distribution (50/40/10)',
    'treasury.liquidity': 'Liquidity',
    'treasury.rwa': 'RWA',
    'treasury.reserve': 'Reserve',
    'treasury.deposit_usdt': 'Deposit USDT',
    'treasury.balance': 'Balance',
    'treasury.deposit_earn': '[ DEPOSIT & EARN ]',
    'treasury.depositing': '[ DEPOSITING... ]',
    'treasury.not_deployed': 'Contract Not Deployed',
    'treasury.deploy_first': 'Deploy IvyBond contract first',
    
    // ==================== Referral Center ====================
    'referral.title': 'REFERRAL CENTER',
    'referral.your_link': 'Your Referral Link',
    'referral.copy': 'Copy',
    'referral.copied': 'Copied!',
    'referral.stats': 'Referral Stats',
    'referral.direct': 'Direct Referrals',
    'referral.total_earned': 'Total Earned',
    
    // ==================== Faucet ====================
    'faucet.title': 'TESTNET FAUCET',
    'faucet.subtitle': 'Development & Testing Only',
    'faucet.warning': 'This faucet provides test tokens for development purposes only. These tokens have no real value.',
    'faucet.balance': 'Your MockUSDT Balance',
    'faucet.amount': 'Faucet Amount',
    'faucet.use_for': 'Use For',
    'faucet.use_desc': 'Buy Node + Deposit',
    'faucet.claim': 'CLAIM 20,000 mUSDT',
    'faucet.claiming': 'CLAIMING...',
    'faucet.success': 'Tokens claimed successfully!',
    'faucet.not_deployed': 'Contract Not Deployed',
    'faucet.deploy_first': 'Deploy MockUSDT contract first',
  },
  zh: {
    // ==================== 首頁 ====================
    'home.tagline': '系統上線 // V2.5',
    'home.title.line1': '讓時間',
    'home.title.line2': '成為您的盟友',
    'home.subtitle': '首個 PID 控制的結構化債券協議。',
    'home.subtitle.highlight': '算法穩定 // 收益優化',
    'home.cta': '[ 開始鑄造 ]',
    'home.cta.locked': '[ 系統鎖定 ]',
    'home.cta.minting': '[ 鑄造中... ]',
    
    // ==================== 導航 ====================
    'nav.protocol': '首頁',
    'nav.nodes': '節點控制台',
    'nav.yield': '收益終端',
    'nav.docs': '文檔',
    'nav.connect': '連接錢包',
    'nav.faucet': '水龍頭',
    
    // ==================== 通用 ====================
    'common.access_denied': '拒絕訪問',
    'common.return_home': '[ 返回首頁 ]',
    'common.connect_wallet': '請連接您的錢包',
    'common.approve': '[ 授權 USDT ]',
    'common.approving': '[ 授權中... ]',
    'common.approved': '✓ 已授權',
    
    // ==================== 節點頁面 ====================
    'nodes.console': '節點控制台 // 身份層',
    'nodes.title': '創世節點',
    'nodes.description': '購買並管理您的創世節點 NFT。每個節點都能獲得永久算力加成和網絡特權。',
    'nodes.privileges': '節點權益',
    'nodes.self_boost': '自身增幅',
    'nodes.self_boost_desc': '節點持有者永久算力提升',
    'nodes.team_aura': '團隊光環',
    'nodes.team_aura_desc': '賦予所有直推用戶的額外加成',
    'nodes.max_supply': '最大供應量',
    'nodes.max_supply_desc': '限量版創世節點 - 先到先得',
    
    // ==================== 身份面板 ====================
    'identity.title': '身份與權限',
    'identity.subtitle': '創世節點會員資格',
    'identity.current': '當前身份',
    'identity.visitor': '訪客',
    'identity.genesis_node': '創世節點',
    'identity.active': '已激活',
    'identity.privilege_boosts': '權益加成',
    'identity.total_boost': '總算力加成',
    'identity.your_network': '您的網絡',
    'identity.direct_referrals': '直推人數',
    'identity.supply': '供應量',
    'identity.node_price': '節點價格',
    'identity.buy_node': '[ 購買創世節點 ]',
    'identity.buying': '[ 購買中... ]',
    'identity.not_deployed': '合約未部署',
    'identity.deploy_first': '請先部署 GenesisNode 合約',
    
    // ==================== 收益頁面 ====================
    'yield.terminal': '收益終端 // 投資層',
    'yield.title': '國庫債券',
    'yield.description': '存入 USDT 賺取 IVY 代幣。您的投資將自動分配至流動性池、真實資產和儲備池。',
    'yield.genesis_active': '創世節點已激活',
    'yield.boost_message': '您的挖礦收益已獲得加成',
    'yield.no_node': '未持有創世節點',
    'yield.no_node_desc': '購買創世節點可解鎖 +10% 算力加成和 +2% 團隊光環。',
    'yield.go_to_nodes': '前往節點控制台',
    'yield.fund_distribution': '資金分流',
    'yield.liquidity_pool': '流動性池',
    'yield.liquidity_desc': 'DEX 交易對',
    'yield.rwa_wallet': '真實資產錢包',
    'yield.rwa_desc': '真實世界資產',
    'yield.reserve_pool': '儲備池',
    'yield.reserve_desc': '協議保險',
    'yield.referral_rewards': '推廣獎勵',
    'yield.l1_direct': '一級直推',
    'yield.l2_indirect': '二級間推',
    'yield.l3_infinite': '三級及以上',
    'yield.rewards_note': '獎勵來自挖礦池鑄造，不從用戶本金扣除。',
    'yield.how_it_works': '運作方式',
    'yield.step1': '存入',
    'yield.step1_desc': '存入 USDT 創建您的債券',
    'yield.step2': '分流',
    'yield.step2_desc': '資金按 50/40/10 分配',
    'yield.step3': '挖礦',
    'yield.step3_desc': '每日賺取 IVY 代幣',
    'yield.step4': '領取',
    'yield.step4_desc': '每 24 小時領取收益',
    
    // ==================== 資金面板 ====================
    'treasury.title': '資產與增值',
    'treasury.subtitle': '資金投資與挖礦收益',
    'treasury.my_principal': '我的本金',
    'treasury.bond_power': '債券算力',
    'treasury.pool_share': '池子佔比',
    'treasury.est_daily': '預計日產出',
    'treasury.total_claimed': '已領取總額',
    'treasury.referral_earnings': '推廣收益',
    'treasury.fund_distribution': '資金分流 (50/40/10)',
    'treasury.liquidity': '流動性',
    'treasury.rwa': '真實資產',
    'treasury.reserve': '儲備金',
    'treasury.deposit_usdt': '存入 USDT',
    'treasury.balance': '餘額',
    'treasury.deposit_earn': '[ 存入並賺取收益 ]',
    'treasury.depositing': '[ 存入中... ]',
    'treasury.not_deployed': '合約未部署',
    'treasury.deploy_first': '請先部署 IvyBond 合約',
    
    // ==================== 推廣中心 ====================
    'referral.title': '推廣中心',
    'referral.your_link': '您的推廣連結',
    'referral.copy': '複製',
    'referral.copied': '已複製！',
    'referral.stats': '推廣統計',
    'referral.direct': '直推人數',
    'referral.total_earned': '累計收益',
    
    // ==================== 水龍頭 ====================
    'faucet.title': '測試網水龍頭',
    'faucet.subtitle': '僅供開發測試使用',
    'faucet.warning': '此水龍頭僅提供測試代幣供開發使用，這些代幣沒有實際價值。',
    'faucet.balance': '您的 MockUSDT 餘額',
    'faucet.amount': '領取數量',
    'faucet.use_for': '用途',
    'faucet.use_desc': '購買節點 + 存款',
    'faucet.claim': '領取 20,000 mUSDT',
    'faucet.claiming': '領取中...',
    'faucet.success': '代幣領取成功！',
    'faucet.not_deployed': '合約未部署',
    'faucet.deploy_first': '請先部署 MockUSDT 合約',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
