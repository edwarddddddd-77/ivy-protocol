import { useEffect, useState, useCallback } from 'react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import addresses from '@/contracts/addresses.json';
import GenesisNodeABI from '@/contracts/abis.json';

export function MyNodes() {
  const { address, isConnected } = useAccount();
  const [tokenIds, setTokenIds] = useState<number[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const publicClient = usePublicClient();

  // 1. Get Balance with refetch
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance, error: balanceError } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: GenesisNodeABI.GenesisNode,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 5000,
      staleTime: 2000,
      retry: 3,
    }
  });

  // 2. Force refetch when wallet connects or address changes
  useEffect(() => {
    if (address && isConnected) {
      console.log('[MyNodes] Wallet connected, refetching balance...');
      refetchBalance();
    }
  }, [address, isConnected, refetchBalance]);

  // 3. Fetch actual token IDs using tokenOfOwnerByIndex
  const fetchTokenIds = useCallback(async () => {
    if (!balance || !address || !publicClient) {
      setTokenIds([]);
      return;
    }
    
    const count = Number(balance);
    console.log('[MyNodes] Balance:', count);
    
    if (count === 0) {
      setTokenIds([]);
      return;
    }

    setIsLoadingTokens(true);
    
    try {
      const ids: number[] = [];
      
      for (let i = 0; i < count; i++) {
        try {
          const tokenId = await publicClient.readContract({
            address: addresses.GenesisNode as `0x${string}`,
            abi: GenesisNodeABI.GenesisNode,
            functionName: 'tokenOfOwnerByIndex',
            args: [address, BigInt(i)],
          });
          ids.push(Number(tokenId));
          console.log(`[MyNodes] Token at index ${i}: ${tokenId}`);
        } catch (err) {
          console.error(`[MyNodes] Error fetching token at index ${i}:`, err);
        }
      }
      
      setTokenIds(ids);
      console.log('[MyNodes] All token IDs:', ids);
    } catch (err) {
      console.error('[MyNodes] Error fetching token IDs:', err);
      // Fallback: just use sequential IDs based on balance
      setTokenIds(Array.from({ length: count }, (_, i) => i));
    } finally {
      setIsLoadingTokens(false);
    }
  }, [balance, address, publicClient]);

  useEffect(() => {
    fetchTokenIds();
  }, [fetchTokenIds]);

  // Debug logging
  useEffect(() => {
    console.log('[MyNodes Debug]', {
      address,
      isConnected,
      balance: balance?.toString(),
      balanceError: balanceError?.message,
      tokenIds,
      contractAddress: addresses.GenesisNode,
      isLoadingTokens,
    });
  }, [address, isConnected, balance, balanceError, tokenIds, isLoadingTokens]);

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

  if (balanceLoading || isLoadingTokens) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-white/5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full bg-white/5" />
          <Skeleton className="h-64 w-full bg-white/5" />
        </div>
      </div>
    );
  }

  // Show error state if balance fetch failed
  if (balanceError) {
    return (
      <GlassCard className="p-8 text-center border-dashed border-red-500/20">
        <div className="text-6xl mb-4 opacity-20">⚠️</div>
        <h3 className="text-xl font-bold text-red-400 mb-2">CONNECTION ERROR</h3>
        <p className="text-gray-400 mb-2">
          Failed to fetch your node balance. Please try again.
        </p>
        <p className="text-xs text-gray-500 font-mono mb-4">
          {balanceError.message}
        </p>
        <button 
          onClick={() => refetchBalance()}
          className="px-4 py-2 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
        >
          Retry
        </button>
      </GlassCard>
    );
  }

  if (tokenIds.length === 0) {
    return (
      <GlassCard className="p-8 text-center border-dashed border-white/20">
        <div className="text-6xl mb-4 opacity-20">∅</div>
        <h3 className="text-xl font-bold text-white mb-2">NO NODES DETECTED</h3>
        <p className="text-gray-400 mb-2">
          Initialize a Genesis Node to begin earning yield.
        </p>
        <p className="text-xs text-gray-500 font-mono">
          Contract: {addresses.GenesisNode.slice(0, 10)}...{addresses.GenesisNode.slice(-6)}
        </p>
        <p className="text-xs text-gray-500 font-mono">
          Raw Balance: {balance?.toString() ?? 'undefined'}
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <span className="text-primary">◈</span> MY NODES ({tokenIds.length})
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tokenIds.map((id) => (
          <GlassCard key={id} className="group hover:border-primary/50 transition-colors">
            <div className="aspect-square bg-black/50 relative overflow-hidden">
              {/* NFT Image - use placeholder directly for reliability */}
              <img 
                src="https://placehold.co/600x400/000000/00ff00/png?text=IVY+GENESIS+NODE"
                alt={`Genesis Node #${id}`}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute top-2 right-2 bg-black/80 text-primary text-xs px-2 py-1 rounded font-mono border border-primary/20">
                ACTIVE
              </div>
              <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono border border-white/20">
                ID: {id}
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
        ))}
      </div>
    </div>
  );
}
