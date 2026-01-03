import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

// API endpoint for NFT metadata
const NFT_API_BASE = '/api/nft';

// Default stable image - placehold.co is bulletproof
const DEFAULT_IMAGE = '/assets/nft/genesis.png';

// Fallback image when primary fails - elegant "Generating..." placeholder
const FALLBACK_IMAGE = 'https://placehold.co/600x600/2a0a3b/00ff9d/png?text=Generating...&font=montserrat';

export function MyNodes() {
  const { address, isConnected } = useAccount();
  const { t } = useLanguage();
  const [nftImages, setNftImages] = useState<Record<number, string>>({});
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [realTokenIds, setRealTokenIds] = useState<number[]>([]);

  // 严格从 addresses.json 读取最新的 GenesisNode 合约地址
  const genesisNodeAddress = addresses.GenesisNode as `0x${string}`;

  // Data reading logic - 使用最新合约地址
  const { data: balance, isLoading, refetch } = useReadContract({
    address: genesisNodeAddress,
    abi: abis.GenesisNode,
    functionName: 'balanceOf',
    args: [address],
    query: { 
      enabled: !!address && isConnected && genesisNodeAddress !== '0x0000000000000000000000000000000000000000',
      staleTime: 0,
      gcTime: 0,
      refetchInterval: 5000,
      retry: 5,
      retryDelay: 1000,
    }
  });

  const count = balance ? Number(balance) : 0;

  // Build contracts array for batch reading tokenOfOwnerByIndex
  const tokenIdContracts = Array.from({ length: count }, (_, i) => ({
    address: genesisNodeAddress,
    abi: abis.GenesisNode as any,
    functionName: 'tokenOfOwnerByIndex',
    args: [address, BigInt(i)],
  }));

  // Batch read all token IDs
  const { data: tokenIdResults } = useReadContracts({
    contracts: tokenIdContracts,
    query: {
      enabled: count > 0 && !!address,
      staleTime: 0,
      gcTime: 0,
    }
  });

  // Update real token IDs when results change
  useEffect(() => {
    if (tokenIdResults && tokenIdResults.length > 0) {
      const ids = tokenIdResults
        .map((result) => {
          if (result.status === 'success' && result.result !== undefined) {
            return Number(result.result);
          }
          return null;
        })
        .filter((id): id is number => id !== null);
      
      setRealTokenIds(ids);
      console.log('[MyNodes] Real token IDs:', ids);
    }
  }, [tokenIdResults]);

  // Force refetch on mount and address change
  useEffect(() => {
    if (address && isConnected) {
      refetch();
    }
  }, [address, isConnected, refetch]);

  // Fetch NFT metadata from API using real token IDs
  useEffect(() => {
    if (realTokenIds.length > 0) {
      realTokenIds.forEach(async (tokenId) => {
        try {
          const response = await fetch(`${NFT_API_BASE}/${tokenId}`);
          const metadata = await response.json();
          if (metadata.image) {
            setNftImages(prev => ({ ...prev, [tokenId]: metadata.image }));
          }
        } catch (error) {
          console.error(`Failed to fetch NFT metadata for token ${tokenId}:`, error);
        }
      });
    }
  }, [realTokenIds]);

  // Elegant fallback handler - switch to "Generating..." placeholder on error
  const handleImageError = (tokenId: number) => {
    setImageErrors(prev => ({ ...prev, [tokenId]: true }));
  };

  // Not connected state
  if (!isConnected) {
    return (
      <GlassCard className="p-8 text-center border-dashed border-white/20">
        <div className="text-6xl mb-4 opacity-20">🔗</div>
        <h3 className="text-xl font-bold text-white mb-2">{t('myNodes.wallet_not_connected')}</h3>
        <p className="text-gray-400">
          {t('myNodes.connect_to_view')}
        </p>
      </GlassCard>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-white/5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-72 w-full bg-white/5" />
          <Skeleton className="h-72 w-full bg-white/5" />
        </div>
      </div>
    );
  }

  // No nodes state
  if (count === 0) {
    return (
      <GlassCard className="p-8 text-center border-dashed border-white/20">
        <div className="text-6xl mb-4 opacity-20">∅</div>
        <h3 className="text-xl font-bold text-white mb-2">{t('myNodes.no_nodes')}</h3>
        <p className="text-gray-400 mb-4">
          {t('myNodes.no_nodes_desc')}
        </p>
        <div className="text-xs text-gray-500 font-mono mb-4">
          {t('myNodes.contract')}: {genesisNodeAddress.slice(0, 10)}...{genesisNodeAddress.slice(-8)}
        </div>
        <button 
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors text-sm"
        >
          {t('myNodes.refresh')}
        </button>
      </GlassCard>
    );
  }

  // Use real token IDs if available, otherwise fall back to indices
  const displayTokenIds = realTokenIds.length > 0 ? realTokenIds : Array.from({ length: count }, (_, i) => i);

  // Success state - show nodes with REAL token IDs
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <span className="text-primary">◈</span> {t('myNodes.title')} ({count})
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayTokenIds.map((tokenId) => {
          // Use API image if available, fallback to default
          const primaryImage = nftImages[tokenId] || DEFAULT_IMAGE;
          // If error occurred, show elegant "Generating..." fallback
          const displayImage = imageErrors[tokenId] ? FALLBACK_IMAGE : primaryImage;
          
          // Display token ID with +1 offset for user-friendly numbering (Token #0 -> displays as #1)
          const displayId = tokenId + 1;
          
          return (
            <GlassCard key={tokenId} className="group hover:border-primary/50 transition-colors overflow-hidden">
              <div className="aspect-square bg-black/50 relative overflow-hidden">
                {/* Native img tag with elegant fallback on error */}
                <img 
                  src={displayImage}
                  alt={`Genesis Node #${displayId}`}
                  width={400}
                  height={400}
                  onError={() => handleImageError(tokenId)}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ display: 'block' }}
                />
                <div className="absolute top-2 right-2 bg-black/80 text-primary text-xs px-2 py-1 rounded font-mono border border-primary/20">
                  {t('myNodes.active')}
                </div>
                <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono border border-white/20">
                  #{displayId}
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-white mb-1">{t('myNodes.genesis_node')} #{displayId}</h4>
                <div className="flex justify-between text-xs text-gray-400 font-mono">
                  <span>{t('myNodes.boost')}: 1.1x</span>
                  <span>{t('myNodes.tier')}: ALPHA</span>
                </div>
                <div className="text-[10px] text-gray-600 mt-1 font-mono">
                  Token ID: {tokenId}
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
