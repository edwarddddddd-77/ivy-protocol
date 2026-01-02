import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Home Page
    'home.tagline': 'System Online // V2.5',
    'home.title.line1': 'Let Time',
    'home.title.line2': 'Be Your Ally',
    'home.subtitle': 'The First PID-Controlled Structured Bond Protocol.',
    'home.subtitle.highlight': 'Algorithmic Stability // Yield Optimization',
    'home.cta': '[ Initialize Mint ]',
    'home.cta.locked': '[ SYSTEM LOCKED ]',
    'home.cta.minting': '[ MINTING... ]',
    
    // Navigation
    'nav.protocol': 'PROTOCOL',
    'nav.nodes': 'NODES',
    'nav.yield': 'YIELD',
    'nav.docs': 'DOCS',
    'nav.connect': 'Connect Wallet',
    
    // Common
    'common.access_denied': 'ACCESS DENIED',
    'common.return_home': '[ RETURN HOME ]',
    'common.connect_wallet': 'Please connect your wallet',
  },
  zh: {
    // Home Page
    'home.tagline': '系統上線 // V2.5',
    'home.title.line1': '讓時間',
    'home.title.line2': '成為您的盟友',
    'home.subtitle': '首個 PID 控制的結構化債券協議。',
    'home.subtitle.highlight': '算法穩定 // 收益優化',
    'home.cta': '[ 開始鑄造 ]',
    'home.cta.locked': '[ 系統鎖定 ]',
    'home.cta.minting': '[ 鑄造中... ]',
    
    // Navigation
    'nav.protocol': '協議',
    'nav.nodes': '節點',
    'nav.yield': '收益',
    'nav.docs': '文檔',
    'nav.connect': '連接錢包',
    
    // Common
    'common.access_denied': '拒絕訪問',
    'common.return_home': '[ 返回首頁 ]',
    'common.connect_wallet': '請連接您的錢包',
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
