import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const REFERRAL_STORAGE_KEY = 'ivy_referrer';

interface ReferralContextType {
  referrer: string | null;
  setReferrer: (address: string) => void;
  clearReferrer: () => void;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

export function ReferralProvider({ children }: { children: ReactNode }) {
  const [referrer, setReferrerState] = useState<string | null>(null);

  // Initialize from localStorage and URL on mount
  useEffect(() => {
    // First check URL for ?ref= parameter
    const urlParams = new URLSearchParams(window.location.search);
    const refFromUrl = urlParams.get('ref');
    
    if (refFromUrl && isValidAddress(refFromUrl)) {
      // Save to localStorage and state
      localStorage.setItem(REFERRAL_STORAGE_KEY, refFromUrl);
      setReferrerState(refFromUrl);
      console.log('[ReferralContext] Referrer set from URL:', refFromUrl);
    } else {
      // Try to load from localStorage
      const storedRef = localStorage.getItem(REFERRAL_STORAGE_KEY);
      if (storedRef && isValidAddress(storedRef)) {
        setReferrerState(storedRef);
        console.log('[ReferralContext] Referrer loaded from localStorage:', storedRef);
      }
    }
  }, []);

  const setReferrer = (address: string) => {
    if (isValidAddress(address)) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, address);
      setReferrerState(address);
      console.log('[ReferralContext] Referrer saved:', address);
    }
  };

  const clearReferrer = () => {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    setReferrerState(null);
    console.log('[ReferralContext] Referrer cleared');
  };

  return (
    <ReferralContext.Provider value={{ referrer, setReferrer, clearReferrer }}>
      {children}
    </ReferralContext.Provider>
  );
}

export function useReferral() {
  const context = useContext(ReferralContext);
  if (context === undefined) {
    throw new Error('useReferral must be used within a ReferralProvider');
  }
  return context;
}

// Validate Ethereum address format
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
