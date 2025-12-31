import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import addresses from '@/contracts/addresses.json';
import GenesisNodeABI from '@/contracts/abis.json';

// Since we don't have a backend indexer yet, we'll fetch the first few tokens
// In production, you'd use The Graph or a backend API
export function MyNodes() {
  const { address } = useAccount();
  const [tokenIds, setTokenIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Get Balance
  const { data: balance } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: GenesisNodeABI.GenesisNode,
    functionName: 'balanceOf',
    args: [address],
  });

  // 2. Fetch Token IDs (Naive implementation for demo - fetches one by one)
  // Note: Hooks can't be called in loops. We'll use a separate effect to fetch IDs
  // once we know the balance. For this demo, we'll just show a placeholder if balance > 0
  // or fetch the first one.
  
  useEffect(() => {
    if (balance) {
      // In a real app, use a multicall or indexer
      // For now, we'll just simulate loading the IDs
      const count = Number(balance);
      const ids = Array.from({ length: count }, (_, i) => i); // Mock IDs for display
      setTokenIds(ids);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [balance]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full bg-white/5" />;
  }

  if (tokenIds.length === 0) {
    return (
      <GlassCard className="p-8 text-center border-dashed border-white/20">
        <div className="text-6xl mb-4 opacity-20">∅</div>
        <h3 className="text-xl font-bold text-white mb-2">NO NODES DETECTED</h3>
        <p className="text-gray-400">
          Initialize a Genesis Node to begin earning yield.
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
              {/* NFT Image */}
              <img 
                src={`/api/nft/${id}`} 
                alt={`Node #${id}`}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
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
