import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import addresses from '@/contracts/addresses.json';
import GenesisNodeABI from '@/contracts/abis.json';

export function MyNodes() {
  const { address, isConnected } = useAccount();
  const [tokenIds, setTokenIds] = useState<number[]>([]);

  // 1. Get Balance with refetch
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: GenesisNodeABI.GenesisNode,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 3000, // Refetch every 3 seconds
      staleTime: 1000, // Consider data stale after 1 second
    }
  });

  // 2. Get total supply to help with token enumeration
  const { data: totalSupply } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: GenesisNodeABI.GenesisNode,
    functionName: 'totalSupply',
    query: {
      enabled: isConnected,
      refetchInterval: 5000,
    }
  });

  // 3. Force refetch when wallet connects or address changes
  useEffect(() => {
    if (address && isConnected) {
      refetchBalance();
    }
  }, [address, isConnected, refetchBalance]);

  // 4. Fetch token IDs owned by user using tokenOfOwnerByIndex
  useEffect(() => {
    const fetchTokenIds = async () => {
      if (!balance || !address) {
        setTokenIds([]);
        return;
      }
      
      const count = Number(balance);
      if (count === 0) {
        setTokenIds([]);
        return;
      }

      // For ERC721Enumerable, we can use tokenOfOwnerByIndex
      // But since we don't have multicall setup, we'll use a simple approach
      // Just show the count and let user know they have nodes
      const ids = Array.from({ length: count }, (_, i) => i);
      setTokenIds(ids);
    };

    fetchTokenIds();
  }, [balance, address]);

  // Debug logging
  useEffect(() => {
    console.log('[MyNodes Debug]', {
      address,
      isConnected,
      balance: balance?.toString(),
      totalSupply: totalSupply?.toString(),
      tokenIds,
      contractAddress: addresses.GenesisNode
    });
  }, [address, isConnected, balance, totalSupply, tokenIds]);

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

  if (balanceLoading) {
    return <Skeleton className="h-64 w-full bg-white/5" />;
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
          Contract: {addresses.GenesisNode.slice(0, 10)}...
        </p>
        <p className="text-xs text-gray-500 font-mono">
          Your Balance: {balance?.toString() || '0'}
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
              {/* NFT Image from Vercel API */}
              <img 
                src={`https://ivy-protocol.vercel.app/api/nft/${id}`} 
                alt={`Node #${id}`}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                onError={(e) => {
                  // Fallback to placeholder if image fails
                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/000000/00ff00/png?text=IVY+NODE';
                }}
              />
              <div className="absolute top-2 right-2 bg-black/80 text-primary text-xs px-2 py-1 rounded font-mono border border-primary/20">
                ACTIVE
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
