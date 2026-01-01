import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import addresses from '@/contracts/addresses.json';
import GenesisNodeABI from '@/contracts/abis.json';

export function MyNodes() {
  const { address, isConnected } = useAccount();

  const { data: balance } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: GenesisNodeABI.GenesisNode,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address && isConnected }
  });

  const count = balance ? Number(balance) : 0;

  return (
    <div style={{ padding: '20px', backgroundColor: '#111', color: '#fff', fontFamily: 'monospace' }}>
      <h2>DEBUG: MyNodes Component</h2>
      <p>Connected: {isConnected ? 'YES' : 'NO'}</p>
      <p>Address: {address || 'N/A'}</p>
      <p>Contract: {addresses.GenesisNode}</p>
      <p>Balance: {balance?.toString() ?? 'loading...'}</p>
      <p>Count: {count}</p>
      <hr />
      {count > 0 ? (
        <div>
          <h3>YOUR NODES:</h3>
          {Array.from({ length: count }, (_, i) => (
            <div key={i} style={{ border: '2px solid lime', margin: '10px', padding: '10px' }}>
              <p>Token Index: {i}</p>
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
        <p style={{ color: 'yellow' }}>NO NODES FOUND</p>
      )}
    </div>
  );
}
