import { useEffect, useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import addresses from '@/contracts/addresses.json';

/**
 * useUserIndex - Discovers users from UserSynced events
 *
 * Features:
 * - Fetches UserSynced events from IvyCore contract
 * - Caches discovered users in localStorage
 * - Automatically refreshes on interval
 * - Deduplicates addresses
 */

const STORAGE_KEY = 'ivy_indexed_users';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  users: string[];
  timestamp: number;
  contractAddress: string;
}

export function useUserIndex() {
  const [users, setUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  const fetchUsers = useCallback(async (forceRefresh = false) => {
    if (!publicClient) {
      setError('No public client available');
      setIsLoading(false);
      return;
    }

    try {
      // Check cache first
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached && !forceRefresh) {
        const data: CachedData = JSON.parse(cached);
        // Use cache if valid and same contract
        if (
          data.contractAddress === addresses.IvyCore &&
          Date.now() - data.timestamp < CACHE_DURATION &&
          data.users.length > 0
        ) {
          setUsers(data.users);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);

      // Fetch UserSynced events
      // Event signature: UserSynced(address indexed user, uint256 bondPower, uint256 rewardDebt)
      const logs = await publicClient.getLogs({
        address: addresses.IvyCore as `0x${string}`,
        event: parseAbiItem('event UserSynced(address indexed user, uint256 bondPower, uint256 rewardDebt)'),
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      // Extract unique user addresses
      const userSet = new Set<string>();
      logs.forEach((log) => {
        if (log.args.user) {
          userSet.add(log.args.user as string);
        }
      });

      const uniqueUsers = Array.from(userSet);

      // Cache the results
      const cacheData: CachedData = {
        users: uniqueUsers,
        timestamp: Date.now(),
        contractAddress: addresses.IvyCore,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));

      setUsers(uniqueUsers);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching user index:', err);
      setError(err.message || 'Failed to fetch users');

      // Try to use cached data as fallback
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const data: CachedData = JSON.parse(cached);
        if (data.users.length > 0) {
          setUsers(data.users);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUsers(true);
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [fetchUsers]);

  return {
    users,
    isLoading,
    error,
    refetch: () => fetchUsers(true),
    userCount: users.length,
  };
}
