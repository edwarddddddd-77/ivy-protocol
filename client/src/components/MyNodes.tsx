import { useEffect, useState, useCallback } from 'react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import addresses from '@/contracts/addresses.json';
import GenesisNodeABI from '@/contracts/abis.json';

// Default placeholder image
const PLACEHOLDER_IMAGE = 'https://placehold.co/600x600/000000/39FF14/png?text=IVY%0AGENESIS%0ANODE';

// NFT Card Component with native img tag
function NFTCard({ tokenId }: { tokenId: number }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    console.log(`[NFTCard] Image failed for token ${tokenId}, using placeholder`);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log(`[NFTCard] Image loaded for token ${tokenId}`);
    setImageLoaded(true);
  };

  return (
    <GlassCard className="group hover:border-primary/50 transition-colors overflow-hidden">
      {/* Image Container with fixed aspect ratio */}
      <div 
        style={{ 
          position: 'relative',
          width: '100%',
          paddingBottom: '100%', // 1:1 aspect ratio
          backgroundColor: '#000',
          overflow: 'hidden'
        }}
      >
        {/* Loading skeleton */}
        {!imageLoaded && !imageError && (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)'
            }}
          >
            <div className="animate-pulse text-primary">Loading...</div>
          </div>
        )}
        
        {/* Native img tag with explicit dimensions */}
        <img 
          src={imageError ? PLACEHOLDER_IMAGE : PLACEHOLDER_IMAGE}
          alt={`Genesis Node #${tokenId}`}
          width={600}
          height={600}
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imageLoaded ? 0.9 : 0.5,
            transition: 'opacity 0.3s ease'
          }}
        />
        
        {/* Status Badge */}
        <div 
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#39FF14',
            fontSize: '10px',
            padding: '4px 8px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            border: '1px solid rgba(57,255,20,0.2)'
          }}
        >
          ACTIVE
        </div>
        
        {/* Token ID Badge */}
        <div 
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#fff',
            fontSize: '10px',
            padding: '4px 8px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          TOKEN #{tokenId}
        </div>
      </div>
      
      {/* Card Info */}
      <div style={{ padding: '16px' }}>
        <h4 style={{ 
          fontWeight: 'bold', 
          color: '#fff', 
          marginBottom: '4px',
          fontSize: '14px'
        }}>
          GENESIS NODE #{tokenId}
        </h4>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#9ca3af',
          fontFamily: 'monospace'
        }}>
          <span>BOOST: 1.1x</span>
          <span>TIER: ALPHA</span>
        </div>
      </div>
    </GlassCard>
  );
}

export function MyNodes() {
  const { address, isConnected } = useAccount();
  const [tokenIds, setTokenIds] = useState<number[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  // Get Balance
  const { 
    data: balance, 
    isLoading: balanceLoading, 
    refetch: refetchBalance, 
    error: balanceError 
  } = useReadContract({
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

  // Force refetch on wallet connect
  useEffect(() => {
    if (address && isConnected) {
      console.log('[MyNodes] Wallet connected:', address);
      console.log('[MyNodes] Contract:', addresses.GenesisNode);
      refetchBalance();
    }
  }, [address, isConnected, refetchBalance]);

  // Fetch token IDs
  const fetchTokenIds = useCallback(async () => {
    console.log('[MyNodes] fetchTokenIds called', { balance, address, publicClient: !!publicClient });
    
    if (!address) {
      console.log('[MyNodes] No address, clearing tokens');
      setTokenIds([]);
      return;
    }

    if (balance === undefined || balance === null) {
      console.log('[MyNodes] Balance undefined, waiting...');
      return;
    }
    
    const count = Number(balance);
    console.log('[MyNodes] Balance count:', count);
    
    if (count === 0) {
      console.log('[MyNodes] Balance is 0, no tokens');
      setTokenIds([]);
      return;
    }

    if (!publicClient) {
      console.log('[MyNodes] No publicClient, using fallback IDs');
      setTokenIds(Array.from({ length: count }, (_, i) => i));
      return;
    }

    setIsLoadingTokens(true);
    setFetchError(null);
    
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
          console.log(`[MyNodes] Found token at index ${i}: ${tokenId}`);
        } catch (err: any) {
          console.error(`[MyNodes] Error at index ${i}:`, err?.message || err);
          // If tokenOfOwnerByIndex fails, use index as fallback
          ids.push(i);
        }
      }
      
      setTokenIds(ids);
      console.log('[MyNodes] Final token IDs:', ids);
    } catch (err: any) {
      console.error('[MyNodes] Fetch error:', err);
      setFetchError(err?.message || 'Unknown error');
      // Fallback to sequential IDs
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
    console.log('[MyNodes Debug State]', {
      address,
      isConnected,
      balance: balance?.toString(),
      balanceLoading,
      balanceError: balanceError?.message,
      tokenIds,
      isLoadingTokens,
      fetchError,
      contractAddress: addresses.GenesisNode,
    });
  }, [address, isConnected, balance, balanceLoading, balanceError, tokenIds, isLoadingTokens, fetchError]);

  // Not connected state
  if (!isConnected) {
    return (
      <GlassCard className="p-8 text-center border-dashed border-white/20">
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.2 }}>🔗</div>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
          WALLET NOT CONNECTED
        </h3>
        <p style={{ color: '#9ca3af' }}>
          Connect your wallet to view your Genesis Nodes.
        </p>
      </GlassCard>
    );
  }

  // Loading state
  if (balanceLoading || isLoadingTokens) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Skeleton className="h-8 w-48 bg-white/5" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <Skeleton className="h-64 w-full bg-white/5" />
          <Skeleton className="h-64 w-full bg-white/5" />
        </div>
      </div>
    );
  }

  // Error state
  if (balanceError) {
    return (
      <GlassCard className="p-8 text-center" style={{ borderColor: 'rgba(239,68,68,0.2)', borderStyle: 'dashed' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.2 }}>⚠️</div>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171', marginBottom: '8px' }}>
          CONNECTION ERROR
        </h3>
        <p style={{ color: '#9ca3af', marginBottom: '8px' }}>
          Failed to fetch your node balance.
        </p>
        <p style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', marginBottom: '16px' }}>
          {balanceError.message}
        </p>
        <button 
          onClick={() => refetchBalance()}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(57,255,20,0.2)',
            color: '#39FF14',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </GlassCard>
    );
  }

  // No nodes state
  if (tokenIds.length === 0) {
    return (
      <GlassCard className="p-8 text-center border-dashed border-white/20">
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.2 }}>∅</div>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
          NO NODES DETECTED
        </h3>
        <p style={{ color: '#9ca3af', marginBottom: '8px' }}>
          Initialize a Genesis Node to begin earning yield.
        </p>
        <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>
          <p>Contract: {addresses.GenesisNode}</p>
          <p>Your Address: {address}</p>
          <p>Raw Balance: {balance?.toString() ?? 'undefined'}</p>
        </div>
      </GlassCard>
    );
  }

  // Success state - show nodes
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h3 style={{ 
        fontSize: '20px', 
        fontWeight: 'bold', 
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ color: '#39FF14' }}>◈</span> MY NODES ({tokenIds.length})
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
        gap: '16px' 
      }}>
        {tokenIds.map((id) => (
          <NFTCard key={id} tokenId={id} />
        ))}
      </div>
    </div>
  );
}
