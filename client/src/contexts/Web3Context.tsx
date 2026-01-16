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

// High-availability RPC endpoints - NodeReal first (most reliable)
const bscTestnetRpcs = [
  'https://bsc-testnet.nodereal.io/v1/e9a36765eb8a40b9bd12e680a1fd2bc5',
  'https://bsc-testnet.publicnode.com',
  'https://data-seed-prebsc-1-s1.binance.org:8545',
  'https://data-seed-prebsc-2-s1.binance.org:8545',
];

// ⚠️ WalletConnect Project ID
// 优先使用环境变量，否则使用测试网默认值
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64';

if (!import.meta.env.VITE_WALLETCONNECT_PROJECT_ID) {
  console.warn('⚠️ Using default WalletConnect Project ID (testnet only)');
  console.warn('For production, set VITE_WALLETCONNECT_PROJECT_ID in .env.local');
}

const config = getDefaultConfig({
  appName: 'Ivy Protocol',
  projectId: WALLETCONNECT_PROJECT_ID,
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
