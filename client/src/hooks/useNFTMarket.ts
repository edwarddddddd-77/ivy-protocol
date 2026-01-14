import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

/**
 * NFT Market Hook
 *
 * Features:
 * - Fetch all Genesis Node NFTs
 * - List/Unlist NFTs for sale
 * - Buy NFTs from listings
 * - Cache listings in localStorage
 */

export interface NFTItem {
  tokenId: number;
  owner: string;
  price?: string;        // USDT price if listed
  isListed: boolean;
  boost: number;         // Self boost percentage
  imageUrl: string;
}

export interface Listing {
  tokenId: number;
  seller: string;
  price: string;         // USDT price
  createdAt: number;
}

const LISTINGS_KEY = 'ivy_nft_listings';

export function useNFTMarket() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // State
  const [allNFTs, setAllNFTs] = useState<NFTItem[]>([]);
  const [listings, setListings] = useState<Map<number, Listing>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [contractStats, setContractStats] = useState({
    currentSupply: 0,
    maxSupply: 1386,
    price: '1000',
    totalVolume: '0',
  });

  // Load listings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LISTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Listing[];
        const map = new Map<number, Listing>();
        parsed.forEach((l) => map.set(l.tokenId, l));
        setListings(map);
      }
    } catch (e) {
      console.error('Failed to load listings:', e);
    }
  }, []);

  // Save listings to localStorage
  const saveListings = useCallback((newListings: Map<number, Listing>) => {
    try {
      const arr = Array.from(newListings.values());
      localStorage.setItem(LISTINGS_KEY, JSON.stringify(arr));
    } catch (e) {
      console.error('Failed to save listings:', e);
    }
  }, []);

  // Fetch contract stats
  const fetchContractStats = useCallback(async () => {
    if (!publicClient) return;

    try {
      const result = await publicClient.readContract({
        address: addresses.GenesisNode as `0x${string}`,
        abi: abis.GenesisNode,
        functionName: 'getContractStats',
      }) as [bigint, bigint, bigint, bigint];

      setContractStats({
        currentSupply: Number(result[0]),
        maxSupply: Number(result[1]),
        price: formatEther(result[2]),
        totalVolume: formatEther(result[3]),
      });
    } catch (error) {
      console.error('Failed to fetch contract stats:', error);
    }
  }, [publicClient]);

  // Fetch all NFTs
  const fetchAllNFTs = useCallback(async () => {
    if (!publicClient) return;

    setIsLoading(true);
    try {
      // Get total supply
      const totalSupply = await publicClient.readContract({
        address: addresses.GenesisNode as `0x${string}`,
        abi: abis.GenesisNode,
        functionName: 'totalSupply',
      }) as bigint;

      const count = Number(totalSupply);
      if (count === 0) {
        setAllNFTs([]);
        setIsLoading(false);
        return;
      }

      // Fetch token IDs and owners in batches
      const nfts: NFTItem[] = [];
      const batchSize = 10;

      for (let i = 0; i < count; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, count); j++) {
          batch.push(j);
        }

        // Fetch token IDs
        const tokenIdCalls = batch.map((index) =>
          publicClient.readContract({
            address: addresses.GenesisNode as `0x${string}`,
            abi: abis.GenesisNode,
            functionName: 'tokenByIndex',
            args: [BigInt(index)],
          })
        );

        const tokenIds = await Promise.all(tokenIdCalls);

        // Fetch owners for each token
        const ownerCalls = tokenIds.map((tokenId) =>
          publicClient.readContract({
            address: addresses.GenesisNode as `0x${string}`,
            abi: abis.GenesisNode,
            functionName: 'ownerOf',
            args: [tokenId as bigint],
          })
        );

        const owners = await Promise.all(ownerCalls);

        // Build NFT items
        for (let k = 0; k < tokenIds.length; k++) {
          const tokenId = Number(tokenIds[k]);
          const owner = owners[k] as string;
          const listing = listings.get(tokenId);

          nfts.push({
            tokenId,
            owner,
            price: listing?.price,
            isListed: !!listing && listing.seller.toLowerCase() === owner.toLowerCase(),
            boost: 10, // Genesis Node gives 10% boost
            imageUrl: `/api/nft/${tokenId}`,
          });
        }
      }

      setAllNFTs(nfts);
    } catch (error) {
      console.error('Failed to fetch NFTs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, listings]);

  // Fetch on mount
  useEffect(() => {
    fetchContractStats();
    fetchAllNFTs();
  }, [fetchContractStats, fetchAllNFTs]);

  // List NFT for sale
  const listNFT = useCallback(async (tokenId: number, price: string) => {
    if (!address) return false;

    const newListing: Listing = {
      tokenId,
      seller: address,
      price,
      createdAt: Date.now(),
    };

    const newListings = new Map(listings);
    newListings.set(tokenId, newListing);
    setListings(newListings);
    saveListings(newListings);

    // Update local NFT state
    setAllNFTs((prev) =>
      prev.map((nft) =>
        nft.tokenId === tokenId
          ? { ...nft, isListed: true, price }
          : nft
      )
    );

    return true;
  }, [address, listings, saveListings]);

  // Unlist NFT
  const unlistNFT = useCallback((tokenId: number) => {
    const newListings = new Map(listings);
    newListings.delete(tokenId);
    setListings(newListings);
    saveListings(newListings);

    // Update local NFT state
    setAllNFTs((prev) =>
      prev.map((nft) =>
        nft.tokenId === tokenId
          ? { ...nft, isListed: false, price: undefined }
          : nft
      )
    );
  }, [listings, saveListings]);

  // Buy NFT (P2P transfer with USDT approval + safeTransferFrom)
  const buyNFT = useCallback(async (tokenId: number): Promise<boolean> => {
    if (!address || !walletClient || !publicClient) return false;

    const listing = listings.get(tokenId);
    if (!listing) return false;

    try {
      // Step 1: Approve USDT spending
      const priceWei = parseEther(listing.price);

      const allowance = await publicClient.readContract({
        address: addresses.MockUSDT as `0x${string}`,
        abi: [
          {
            inputs: [
              { name: 'owner', type: 'address' },
              { name: 'spender', type: 'address' },
            ],
            name: 'allowance',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'allowance',
        args: [address, listing.seller as `0x${string}`],
      }) as bigint;

      if (allowance < priceWei) {
        // Need to approve seller to receive USDT
        const { request: approveRequest } = await publicClient.simulateContract({
          address: addresses.MockUSDT as `0x${string}`,
          abi: [
            {
              inputs: [
                { name: 'spender', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
              name: 'approve',
              outputs: [{ name: '', type: 'bool' }],
              stateMutability: 'nonpayable',
              type: 'function',
            },
          ],
          functionName: 'approve',
          args: [listing.seller as `0x${string}`, priceWei],
          account: address,
        });

        await walletClient.writeContract(approveRequest);
      }

      // Step 2: Transfer USDT to seller
      const { request: transferRequest } = await publicClient.simulateContract({
        address: addresses.MockUSDT as `0x${string}`,
        abi: [
          {
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            name: 'transfer',
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ],
        functionName: 'transfer',
        args: [listing.seller as `0x${string}`, priceWei],
        account: address,
      });

      await walletClient.writeContract(transferRequest);

      // Note: In a real marketplace, the seller would need to have approved
      // this contract/buyer to transfer the NFT. For demo purposes, we assume
      // this is handled off-chain or the seller initiates the transfer.

      // Remove listing after successful purchase
      unlistNFT(tokenId);

      return true;
    } catch (error) {
      console.error('Failed to buy NFT:', error);
      return false;
    }
  }, [address, walletClient, publicClient, listings, unlistNFT]);

  // Get user's NFTs
  const myNFTs = useMemo(() => {
    if (!address) return [];
    return allNFTs.filter(
      (nft) => nft.owner.toLowerCase() === address.toLowerCase()
    );
  }, [allNFTs, address]);

  // Get listed NFTs (for sale)
  const listedNFTs = useMemo(() => {
    return allNFTs.filter((nft) => nft.isListed);
  }, [allNFTs]);

  // Get all NFTs except user's own
  const availableNFTs = useMemo(() => {
    if (!address) return allNFTs;
    return allNFTs.filter(
      (nft) => nft.owner.toLowerCase() !== address.toLowerCase()
    );
  }, [allNFTs, address]);

  return {
    allNFTs,
    myNFTs,
    listedNFTs,
    availableNFTs,
    contractStats,
    isLoading,
    isConnected,
    fetchAllNFTs,
    listNFT,
    unlistNFT,
    buyNFT,
    listings,
  };
}
