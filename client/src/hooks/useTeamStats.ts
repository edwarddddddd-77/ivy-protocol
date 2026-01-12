import { useReadContract, useAccount } from "wagmi";
import addresses from "../contracts/addresses.json";
import abis from "../contracts/abis.json";
import { formatEther } from "viem";
import { getSmartRefreshInterval } from "@/config/refreshIntervals";

export function useTeamStats() {
  const { address } = useAccount();

  // Read: User Referral Summary
  const { data: referralSummary, refetch: refetchSummary } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "getUserReferralSummary",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: getSmartRefreshInterval('MINING_STATS'),
    }
  });

  // Read: Pending Referral Rewards (V2.0 - Real-time)
  const { data: pendingReferralRewards, refetch: refetchPendingReferral } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "getPendingReferralRewards",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: getSmartRefreshInterval('MINING_STATS'),
    }
  });

  // Read: Direct Referral Count from GenesisNode (more reliable)
  const { data: genesisDirectCount } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: abis.GenesisNode,
    functionName: "directReferralCount",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: getSmartRefreshInterval('MINING_STATS'),
    }
  });

  // Read: Team Statistics
  const { data: teamStats, refetch: refetchTeamStats } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "getTeamStats",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: getSmartRefreshInterval('MINING_STATS'),
    }
  });

  // Read: Direct Referrals
  const { data: directReferrals, refetch: refetchDirectReferrals } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "getDirectReferrals",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: getSmartRefreshInterval('MINING_STATS'),
    }
  });

  // Read: Team Performance
  const { data: teamPerformance } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "getTeamPerformance",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: getSmartRefreshInterval('MINING_STATS'),
    }
  });

  // Parse referral summary (use GenesisNode count as primary source)
  const summary = referralSummary as any;
  const genesisCount = genesisDirectCount ? Number(genesisDirectCount) : 0;
  const parsedSummary = summary ? {
    // Use GenesisNode count if available (more reliable), fallback to IvyCore
    directReferralCount: genesisCount > 0 ? genesisCount : Number(summary[0]),
    totalTeamSize: Number(summary[1]),
    totalReferralRewards: formatEther(summary[2] as bigint),
    rewardHistoryCount: Number(summary[3]),
    hasGenesisNode: Boolean(summary[4]),
  } : (genesisCount > 0 ? {
    directReferralCount: genesisCount,
    totalTeamSize: 0,
    totalReferralRewards: "0",
    rewardHistoryCount: 0,
    hasGenesisNode: false,
  } : null);

  // Parse pending referral rewards (V2.0)
  const parsedPendingReferral = pendingReferralRewards
    ? formatEther(pendingReferralRewards as bigint)
    : "0";

  // Parse team stats
  const stats = teamStats as any;
  const parsedTeamStats = stats ? {
    totalMembers: Number(stats[0]),
    totalBondPower: formatEther(stats[1] as bigint),
    activeMembers: Number(stats[2]),
    directCount: Number(stats[3]),
  } : null;

  // Parse direct referrals
  const directRefs = directReferrals as any;
  const parsedDirectReferrals = directRefs ? {
    addresses: directRefs[0] as string[],
    bondPowers: (directRefs[1] as bigint[]).map((bp: bigint) => formatEther(bp)),
    totalRewards: (directRefs[2] as bigint[]).map((r: bigint) => formatEther(r)),
  } : null;

  // Parse team performance
  const perf = teamPerformance as any;
  const parsedPerformance = perf ? {
    rank: Number(perf[0]),
    teamBondPower: formatEther(perf[1] as bigint),
    teamActiveRate: Number(perf[2]) / 100, // Convert from basis points to percentage
    avgBondPower: formatEther(perf[3] as bigint),
  } : null;

  return {
    summary: parsedSummary,
    teamStats: parsedTeamStats,
    directReferrals: parsedDirectReferrals,
    performance: parsedPerformance,
    pendingReferralRewards: parsedPendingReferral,
    refetch: {
      summary: refetchSummary,
      teamStats: refetchTeamStats,
      directReferrals: refetchDirectReferrals,
      pendingReferral: refetchPendingReferral,
    },
  };
}
