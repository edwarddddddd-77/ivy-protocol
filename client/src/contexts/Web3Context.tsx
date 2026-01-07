import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, http, fallback } from 'wagmi';
import {
  bscTestnet,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { ReactNode } from 'react';

// High-availability RPC endpoints - publicnode first (most reliable)
const bscTestnetRpcs = [
  'https://bsc-testnet.publicnode.com',
  'https://data-seed-prebsc-1-s1.binance.org:8545',
  'https://data-seed-prebsc-2-s1.binance.org:8545',
];

// ⚠️ 验证环境变量（开发提醒）
if (!import.meta.env.VITE_WALLETCONNECT_PROJECT_ID) {
  console.error('❌ VITE_WALLETCONNECT_PROJECT_ID is not defined in .env.local');
  console.error('Please copy .env.local.example to .env.local and fill in your WalletConnect Project ID');
}

const config = getDefaultConfig({
  appName: 'Ivy Protocol',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
  chains: [bscTestnet],
  transports: {
    [bscTestnet.id]: fallback(
      bscTestnetRpcs.map(url => http(url, { 
        timeout: 15000,
        retryCount: 3,
        retryDelay: 1000,
      }))
    ),
  },
  ssr: false,
});

// Disable all caching - force fresh reads
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: 5,
      retryDelay: 1000,
      staleTime: 0,
      gcTime: 0,
    },
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#39FF14',
          accentColorForeground: 'black',
          borderRadius: 'medium',
          fontStack: 'system',
          overlayBlur: 'small',
        })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
