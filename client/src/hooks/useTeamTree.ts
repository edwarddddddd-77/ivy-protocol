import { useState, useCallback, useMemo } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

/**
 * Team Tree Hook
 *
 * Features:
 * - Fetch user's direct referrals (L1)
 * - Lazy load sub-referrals on expansion (L2+)
 * - Cache fetched data to avoid duplicate calls
 * - Track expanded nodes
 */

export interface TreeNode {
  address: string;
  bondPower: string;
  totalRewards: string;
  level: number;
  children: TreeNode[];
  isLoading: boolean;
  isExpanded: boolean;
  childCount?: number;
}

interface CachedReferrals {
  addresses: string[];
  bondPowers: string[];
  totalRewards: string[];
}

export function useTeamTree() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // Cache for fetched referral data
  const [cache, setCache] = useState<Map<string, CachedReferrals>>(new Map());

  // Track loading states
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());

  // Track expanded nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Root tree data
  const [rootData, setRootData] = useState<CachedReferrals | null>(null);
  const [isRootLoading, setIsRootLoading] = useState(false);

  // Fetch direct referrals for any address
  const fetchDirectReferrals = useCallback(async (userAddress: string): Promise<CachedReferrals | null> => {
    // Check cache first
    if (cache.has(userAddress)) {
      return cache.get(userAddress)!;
    }

    if (!publicClient) return null;

    try {
      const result = await publicClient.readContract({
        address: addresses.IvyCore as `0x${string}`,
        abi: abis.IvyCore,
        functionName: 'getDirectReferrals',
        args: [userAddress as `0x${string}`],
      }) as [string[], bigint[], bigint[]];

      const data: CachedReferrals = {
        addresses: result[0],
        bondPowers: result[1].map((bp) => formatEther(bp)),
        totalRewards: result[2].map((r) => formatEther(r)),
      };

      // Update cache
      setCache((prev) => new Map(prev).set(userAddress, data));

      return data;
    } catch (error) {
      console.error('Failed to fetch referrals for', userAddress, error);
      return null;
    }
  }, [publicClient, cache]);

  // Fetch root level (current user's direct referrals)
  const fetchRootReferrals = useCallback(async () => {
    if (!address) return;

    setIsRootLoading(true);
    const data = await fetchDirectReferrals(address);
    setRootData(data);
    setIsRootLoading(false);
  }, [address, fetchDirectReferrals]);

  // Toggle node expansion and fetch children if needed
  const toggleExpand = useCallback(async (nodeAddress: string) => {
    const isExpanded = expandedNodes.has(nodeAddress);

    if (isExpanded) {
      // Collapse
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        next.delete(nodeAddress);
        return next;
      });
    } else {
      // Expand and fetch if not cached
      if (!cache.has(nodeAddress)) {
        setLoadingNodes((prev) => new Set(prev).add(nodeAddress));
        await fetchDirectReferrals(nodeAddress);
        setLoadingNodes((prev) => {
          const next = new Set(prev);
          next.delete(nodeAddress);
          return next;
        });
      }

      setExpandedNodes((prev) => new Set(prev).add(nodeAddress));
    }
  }, [expandedNodes, cache, fetchDirectReferrals]);

  // Build tree structure from cache
  const buildTree = useCallback((
    parentAddress: string,
    level: number,
    maxDepth: number = 3
  ): TreeNode[] => {
    if (level > maxDepth) return [];

    const data = cache.get(parentAddress);
    if (!data) return [];

    return data.addresses.map((addr, index) => {
      const isExpanded = expandedNodes.has(addr);
      const isLoading = loadingNodes.has(addr);
      const childData = cache.get(addr);

      return {
        address: addr,
        bondPower: data.bondPowers[index],
        totalRewards: data.totalRewards[index],
        level,
        isLoading,
        isExpanded,
        childCount: childData?.addresses.length,
        children: isExpanded ? buildTree(addr, level + 1, maxDepth) : [],
      };
    });
  }, [cache, expandedNodes, loadingNodes]);

  // Computed tree structure
  const tree = useMemo(() => {
    if (!address || !rootData) return [];

    // Build tree starting from user's direct referrals (L1)
    return rootData.addresses.map((addr, index) => {
      const isExpanded = expandedNodes.has(addr);
      const isLoading = loadingNodes.has(addr);
      const childData = cache.get(addr);

      return {
        address: addr,
        bondPower: rootData.bondPowers[index],
        totalRewards: rootData.totalRewards[index],
        level: 1,
        isLoading,
        isExpanded,
        childCount: childData?.addresses.length,
        children: isExpanded ? buildTree(addr, 2, 3) : [],
      };
    });
  }, [address, rootData, cache, expandedNodes, loadingNodes, buildTree]);

  // Clear all expanded nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Expand all L1 nodes
  const expandAllL1 = useCallback(async () => {
    if (!rootData) return;

    // Fetch all L1 children first
    const promises = rootData.addresses.map((addr) => {
      if (!cache.has(addr)) {
        return fetchDirectReferrals(addr);
      }
      return Promise.resolve(null);
    });

    await Promise.all(promises);

    // Expand all L1 nodes
    setExpandedNodes(new Set(rootData.addresses));
  }, [rootData, cache, fetchDirectReferrals]);

  // Get statistics
  const stats = useMemo(() => {
    if (!rootData) return { l1Count: 0, totalBondPower: '0', totalRewards: '0' };

    const l1Count = rootData.addresses.length;
    const totalBondPower = rootData.bondPowers.reduce(
      (sum, bp) => sum + parseFloat(bp),
      0
    ).toFixed(2);
    const totalRewards = rootData.totalRewards.reduce(
      (sum, r) => sum + parseFloat(r),
      0
    ).toFixed(2);

    return { l1Count, totalBondPower, totalRewards };
  }, [rootData]);

  return {
    tree,
    stats,
    isLoading: isRootLoading,
    fetchRootReferrals,
    toggleExpand,
    collapseAll,
    expandAllL1,
    expandedNodes,
  };
}
