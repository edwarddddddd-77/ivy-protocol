import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import addresses from '@/contracts/addresses.json';
import GenesisNodeABI from '@/contracts/abis.json';

// Error fallback image - red error indicator instead of green placeholder
const ERROR_FALLBACK_IMAGE = 'https://placehold.co/400x400/1a1a1a/ff3333?text=IMAGE%0ALOAD%0AERROR';

// API endpoint for NFT metadata
const NFT_API_BASE = '/api/nft';

export function MyNodes() {
  const { address, isConnected } = useAccount();
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [nftImages, setNftImages] = useState<Record<number, string>>({});

  // Data reading logic - KEEP THIS FIXED VERSION
  const { data: balance, isLoading, refetch } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: GenesisNodeABI.GenesisNode,
    functionName: 'balanceOf',
    args: [address],
    query: { 
      enabled: !!address && isConnected,
      staleTime: 0,
      gcTime: 0,
      refetchInterval: 5000,
      retry: 5,
      retryDelay: 1000,
    }
  });

  // Force refetch on mount and address change
  useEffect(() => {
    if (address && isConnected) {
      refetch();
    }
  }, [address, isConnected, refetch]);

  // Fetch NFT metadata from API
  useEffect(() => {
    const count = balance ? Number(balance) : 0;
    if (count > 0) {
      Array.from({ length: count }, (_, i) => i).forEach(async (tokenId) => {
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
  }, [balance]);

  const handleImageError = (tokenId: number, imageUrl: string) => {
    // Debug output for troubleshooting
    console.error("NFT Image Load Failed:", imageUrl, "Token ID:", tokenId);
    // Set error state - will show red error image instead of rolling back to green placeholder
    setImageErrors(prev => ({ ...prev, [tokenId]: true }));
  };

  const count = balance ? Number(balance) : 0;
  const tokenIds = Array.from({ length: count }, (_, i) => i);

  // Not connected state
  if (!isConnected) {
    return (
      <GlassCard className="p-8 text-center border-dashed border-white/20">
        <div className="text-6xl mb-4 opacity-20">🔗</div>
        <h3 className="text-xl font-bold text-white mb-2">WALLET NOT CONNECTED</h3>
        <p className="text-gray-400">
          Connect your wallet to view your Genesis Nodes.
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
        <h3 className="text-xl font-bold text-white mb-2">NO NODES DETECTED</h3>
        <p className="text-gray-400 mb-4">
          Initialize a Genesis Node to begin earning yield.
        </p>
        <button 
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors text-sm"
        >
          Refresh
        </button>
      </GlassCard>
    );
  }

  // Success state - show nodes
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <span className="text-primary">◈</span> MY NODES ({count})
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tokenIds.map((id) => {
          // Use API image if available, otherwise show error fallback if error occurred
          const imageUrl = nftImages[id] || ERROR_FALLBACK_IMAGE;
          const displayImage = imageErrors[id] ? ERROR_FALLBACK_IMAGE : imageUrl;
          
          return (
            <GlassCard key={id} className="group hover:border-primary/50 transition-colors overflow-hidden">
              <div className="aspect-square bg-black/50 relative overflow-hidden">
                {/* Native img tag - NO fallback to old green placeholder */}
                <img 
                  src={displayImage}
                  alt={`Genesis Node #${id}`}
                  width={400}
                  height={400}
                  onError={() => handleImageError(id, imageUrl)}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ display: 'block' }}
                />
                <div className="absolute top-2 right-2 bg-black/80 text-primary text-xs px-2 py-1 rounded font-mono border border-primary/20">
                  ACTIVE
                </div>
                <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono border border-white/20">
                  #{id}
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-white mb-1">GENESIS NODE #{id}</h4>
                <div className="flex justify-between text-xs text-gray-400 font-mono">
                  <span>BOOST: 1.1x</span>
                  <span>TIER: ALPHA</span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
