import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import addresses from '@/contracts/addresses.json';
import GenesisNodeABI from '@/contracts/abis.json';

export function MyNodes() {
  const { address, isConnected } = useAccount();
  const [retryCount, setRetryCount] = useState(0);

  const { data: balance, isLoading, isError, error, refetch } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: GenesisNodeABI.GenesisNode,
    functionName: 'balanceOf',
    args: [address],
    query: { 
      enabled: !!address && isConnected,
      staleTime: 0,
      gcTime: 0,
      refetchInterval: 3000,
      retry: 5,
      retryDelay: 1000,
    }
  });

  // Force refetch on mount and address change
  useEffect(() => {
    if (address && isConnected) {
      console.log('[MyNodes] Forcing refetch for address:', address);
      refetch();
    }
  }, [address, isConnected, refetch]);

  // Manual retry button handler
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    refetch();
  };

  const count = balance ? Number(balance) : 0;

  return (
    <div style={{ padding: '20px', backgroundColor: '#111', color: '#fff', fontFamily: 'monospace', border: '2px solid #333' }}>
      <h2 style={{ color: 'lime' }}>DEBUG: MyNodes Component</h2>
      <hr />
      <p><strong>Connected:</strong> {isConnected ? '✅ YES' : '❌ NO'}</p>
      <p><strong>Address:</strong> {address || 'N/A'}</p>
      <p><strong>Contract:</strong> {addresses.GenesisNode}</p>
      <hr />
      <p><strong>isLoading:</strong> {isLoading ? '⏳ YES' : 'NO'}</p>
      <p><strong>isError:</strong> {isError ? '❌ YES' : 'NO'}</p>
      {isError && <p style={{ color: 'red' }}><strong>Error:</strong> {error?.message}</p>}
      <p><strong>Raw Balance:</strong> {balance?.toString() ?? 'undefined'}</p>
      <p style={{ fontSize: '24px', color: 'yellow' }}><strong>Count: {count}</strong></p>
      <p><strong>Retry Count:</strong> {retryCount}</p>
      <button 
        onClick={handleRetry}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: 'lime', 
          color: 'black', 
          border: 'none', 
          cursor: 'pointer',
          marginTop: '10px',
          fontWeight: 'bold'
        }}
      >
        🔄 FORCE REFRESH
      </button>
      <hr />
      {count > 0 ? (
        <div>
          <h3 style={{ color: 'lime' }}>✅ YOUR NODES ({count}):</h3>
          {Array.from({ length: count }, (_, i) => (
            <div key={i} style={{ border: '3px solid lime', margin: '10px', padding: '10px', backgroundColor: '#000' }}>
              <p style={{ color: 'lime' }}>Token Index: {i}</p>
              <img 
                src="https://placehold.co/200x200/000/0f0?text=NODE" 
                alt={`Node ${i}`}
                width="200"
                height="200"
                style={{ display: 'block' }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p style={{ color: 'orange', fontSize: '18px' }}>⚠️ NO NODES FOUND (Count = 0)</p>
          <p style={{ color: '#888', fontSize: '12px' }}>If you own NFTs, click FORCE REFRESH or check RPC connection.</p>
        </div>
      )}
    </div>
  );
}
