import { useEffect, useState, useCallback, useMemo } from 'react';
import { usePublicClient, useAccount, useReadContract } from 'wagmi';
import { parseAbiItem, formatEther } from 'viem';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

/**
 * Reward History Hook
 *
 * Fetches and combines:
 * 1. Referral reward history from contract (getReferralRewardHistory)
 * 2. Mining reward events from blockchain logs (RewardsHarvested, VestedCompounded)
 */

const STORAGE_KEY = 'ivy_reward_history';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 10;

export type RewardType = 'mining_harvest' | 'mining_compound' | 'referral_harvest' | 'referral_compound' | 'referral';

export interface RewardHistoryItem {
  id: string;
  type: RewardType;
  timestamp: number;
  amount: string;
  level?: number;        // For referral: 1=L1, 2=L2, 3=Team, 4=Peer
  fromUser?: string;     // For referral rewards
  txHash?: string;
  blockNumber?: number;
}

interface CachedData {
  miningHistory: RewardHistoryItem[];
  timestamp: number;
  userAddress: string;
}

export type FilterType = 'all' | 'mining' | 'referral';

export function useRewardHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // State
  const [miningHistory, setMiningHistory] = useState<RewardHistoryItem[]>([]);
  const [isLoadingMining, setIsLoadingMining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch referral reward history from contract
  const { data: referralHistoryData, isLoading: isLoadingReferral, refetch: refetchReferral } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: 'getReferralRewardHistory',
    args: [
      address || '0x0000000000000000000000000000000000000000',
      BigInt(0),
      BigInt(100), // Fetch up to 100 records
    ],
    query: {
      enabled: !!address,
      staleTime: 60000, // 1 minute
    },
  });

  // Parse referral history from contract
  const referralHistory = useMemo(() => {
    if (!referralHistoryData) return [];

    const [records] = referralHistoryData as [any[], bigint];

    return records.map((record, index) => ({
      id: `referral-${record.timestamp}-${index}`,
      type: 'referral' as RewardType,
      timestamp: Number(record.timestamp),
      amount: formatEther(record.amount as bigint),
      level: Number(record.level),
      fromUser: record.fromUser as string,
    }));
  }, [referralHistoryData]);

  // Fetch mining events from blockchain
  const fetchMiningHistory = useCallback(async (forceRefresh = false) => {
    if (!publicClient || !address) {
      return;
    }

    try {
      // Check cache first
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached && !forceRefresh) {
        const data: CachedData = JSON.parse(cached);
        if (
          data.userAddress === address &&
          Date.now() - data.timestamp < CACHE_DURATION &&
          data.miningHistory.length > 0
        ) {
          setMiningHistory(data.miningHistory);
          return;
        }
      }

      setIsLoadingMining(true);
      setError(null);

      // Fetch RewardsHarvested events
      const harvestLogs = await publicClient.getLogs({
        address: addresses.IvyCore as `0x${string}`,
        event: parseAbiItem('event RewardsHarvested(address indexed user, uint256 amount)'),
        args: { user: address },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      // Fetch VestedCompounded events
      const compoundLogs = await publicClient.getLogs({
        address: addresses.IvyCore as `0x${string}`,
        event: parseAbiItem('event VestedCompounded(address indexed user, uint256 indexed tokenId, uint256 pendingIvy, uint256 bonusPower)'),
        args: { user: address },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      // Fetch ReferralRewardsHarvested events
      const referralHarvestLogs = await publicClient.getLogs({
        address: addresses.IvyCore as `0x${string}`,
        event: parseAbiItem('event ReferralRewardsHarvested(address indexed user, uint256 amount)'),
        args: { user: address },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      // Fetch ReferralRewardsCompounded events
      const referralCompoundLogs = await publicClient.getLogs({
        address: addresses.IvyCore as `0x${string}`,
        event: parseAbiItem('event ReferralRewardsCompounded(address indexed user, uint256 indexed tokenId, uint256 amount, uint256 powerAdded)'),
        args: { user: address },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      // Get block timestamps for all events
      const allLogs = [...harvestLogs, ...compoundLogs, ...referralHarvestLogs, ...referralCompoundLogs];
      const blockNumbers = [...new Set(allLogs.map(log => log.blockNumber))];

      const blockTimestamps: Record<string, number> = {};
      await Promise.all(
        blockNumbers.map(async (blockNum) => {
          if (blockNum) {
            const block = await publicClient.getBlock({ blockNumber: blockNum });
            blockTimestamps[blockNum.toString()] = Number(block.timestamp);
          }
        })
      );

      // Process harvest events
      const harvestHistory: RewardHistoryItem[] = harvestLogs.map((log, index) => ({
        id: `harvest-${log.transactionHash}-${index}`,
        type: 'mining_harvest' as RewardType,
        timestamp: blockTimestamps[log.blockNumber?.toString() || ''] || 0,
        amount: formatEther(log.args.amount as bigint),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber ? Number(log.blockNumber) : undefined,
      }));

      // Process compound events
      const compoundHistory: RewardHistoryItem[] = compoundLogs.map((log, index) => ({
        id: `compound-${log.transactionHash}-${index}`,
        type: 'mining_compound' as RewardType,
        timestamp: blockTimestamps[log.blockNumber?.toString() || ''] || 0,
        amount: formatEther(log.args.pendingIvy as bigint),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber ? Number(log.blockNumber) : undefined,
      }));

      // Process referral harvest events
      const refHarvestHistory: RewardHistoryItem[] = referralHarvestLogs.map((log, index) => ({
        id: `ref-harvest-${log.transactionHash}-${index}`,
        type: 'referral_harvest' as RewardType,
        timestamp: blockTimestamps[log.blockNumber?.toString() || ''] || 0,
        amount: formatEther(log.args.amount as bigint),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber ? Number(log.blockNumber) : undefined,
      }));

      // Process referral compound events
      const refCompoundHistory: RewardHistoryItem[] = referralCompoundLogs.map((log, index) => ({
        id: `ref-compound-${log.transactionHash}-${index}`,
        type: 'referral_compound' as RewardType,
        timestamp: blockTimestamps[log.blockNumber?.toString() || ''] || 0,
        amount: formatEther(log.args.amount as bigint),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber ? Number(log.blockNumber) : undefined,
      }));

      const allHistory = [...harvestHistory, ...compoundHistory, ...refHarvestHistory, ...refCompoundHistory];

      // Cache the results
      const cacheData: CachedData = {
        miningHistory: allHistory,
        timestamp: Date.now(),
        userAddress: address,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));

      setMiningHistory(allHistory);
    } catch (err: any) {
      console.error('Error fetching mining history:', err);
      setError(err.message || 'Failed to fetch mining history');

      // Try to use cached data as fallback
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const data: CachedData = JSON.parse(cached);
        if (data.userAddress === address && data.miningHistory.length > 0) {
          setMiningHistory(data.miningHistory);
        }
      }
    } finally {
      setIsLoadingMining(false);
    }
  }, [publicClient, address]);

  // Initial fetch
  useEffect(() => {
    fetchMiningHistory();
  }, [fetchMiningHistory]);

  // Combine and filter history
  const allHistory = useMemo(() => {
    const combined = [...miningHistory, ...referralHistory];

    // Sort by timestamp descending (newest first)
    combined.sort((a, b) => b.timestamp - a.timestamp);

    return combined;
  }, [miningHistory, referralHistory]);

  // Filtered history based on current filter
  const filteredHistory = useMemo(() => {
    if (filter === 'all') return allHistory;

    if (filter === 'mining') {
      return allHistory.filter(item =>
        item.type === 'mining_harvest' || item.type === 'mining_compound'
      );
    }

    if (filter === 'referral') {
      return allHistory.filter(item =>
        item.type === 'referral' ||
        item.type === 'referral_harvest' ||
        item.type === 'referral_compound'
      );
    }

    return allHistory;
  }, [allHistory, filter]);

  // Paginated history
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredHistory.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredHistory, currentPage]);

  // Total pages
  const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const headers = ['Time', 'Type', 'Amount (IVY)', 'Level', 'From User', 'TxHash'];
    const rows = filteredHistory.map(item => [
      new Date(item.timestamp * 1000).toISOString(),
      item.type,
      item.amount,
      item.level?.toString() || '',
      item.fromUser || '',
      item.txHash || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `ivy-reward-history-${address?.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }, [filteredHistory, address]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  return {
    // Data
    history: paginatedHistory,
    allHistory: filteredHistory,
    totalRecords: filteredHistory.length,

    // Loading states
    isLoading: isLoadingMining || isLoadingReferral,
    error,

    // Pagination
    currentPage,
    totalPages,
    pageSize: PAGE_SIZE,
    setPage: setCurrentPage,
    nextPage: () => setCurrentPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setCurrentPage(p => Math.max(p - 1, 1)),

    // Filter
    filter,
    setFilter,

    // Actions
    refetch: () => {
      fetchMiningHistory(true);
      refetchReferral();
    },
    exportToCSV,
  };
}
