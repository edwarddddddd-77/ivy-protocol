import { useReadContract, useWriteContract, useAccount } from "wagmi";
import addresses from "../contracts/addresses.json";
import abis from "../contracts/abis.json";
import { formatEther } from "viem";
import { getSmartRefreshInterval } from "@/config/refreshIntervals";

export function useIvyContract() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Read: Current Daily Emission (from IvyCore)
  const { data: currentDailyEmission, isLoading: isLoadingEmission } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "currentDailyEmission",
    query: {
      refetchInterval: getSmartRefreshInterval('PROTOCOL_STATS'),
    }
  });

  // Read: Protocol Stats (totalMinted, hardCap, emissionFactor, pidMultiplier, totalPoolBondPower, emissionPerSecond)
  const { data: protocolStats, isLoading: isLoadingStats } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "getProtocolStats",
    query: {
      refetchInterval: getSmartRefreshInterval('PROTOCOL_STATS'),
    }
  });

  // Read: Genesis Node Total Supply
  const { data: nodeTotalSupply, isLoading: isLoadingNodes } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: abis.GenesisNode,
    functionName: "totalSupply",
    query: {
      refetchInterval: getSmartRefreshInterval('NODE_SUPPLY'),
    }
  });

  // Read: User IVY Balance
  const { data: ivyBalance, isLoading: isLoadingBalance } = useReadContract({
    address: addresses.IvyToken as `0x${string}`,
    abi: abis.IvyToken,
    functionName: "balanceOf",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: getSmartRefreshInterval('USER_BALANCE'),
    }
  });

  // Read: User Mining Stats
  const { data: userMiningStats } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "getUserMiningStats",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: getSmartRefreshInterval('MINING_STATS'),
    }
  });

  // Read: User Vesting Info
  const { data: vestingInfo } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "getVestingInfo",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: getSmartRefreshInterval('VESTING_INFO'),
    }
  });

  // Read: Pending IVY (real-time with smart intervals)
  const { data: pendingIvy } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "pendingIvy",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: getSmartRefreshInterval('PENDING_IVY'),
    }
  });

  // Parse protocol stats
  const stats = protocolStats as any;
  const pidMultiplier = stats ? Number(formatEther(stats[3] as bigint)) : 1.0;
  const emissionFactor = stats ? Number(formatEther(stats[2] as bigint)) : 1.0;

  // Write: Harvest (move pending to vesting)
  const harvest = async () => {
    if (!address) throw new Error("Wallet not connected");
    return writeContractAsync({
      address: addresses.IvyCore as `0x${string}`,
      abi: abis.IvyCore,
      functionName: "harvest",
    });
  };

  // Write: Claim Vested (30-day linear release)
  const claimVested = async () => {
    if (!address) throw new Error("Wallet not connected");
    return writeContractAsync({
      address: addresses.IvyCore as `0x${string}`,
      abi: abis.IvyCore,
      functionName: "claimVested",
    });
  };

  // Write: Instant Cash Out (50% burn)
  const instantCashOut = async () => {
    if (!address) throw new Error("Wallet not connected");
    return writeContractAsync({
      address: addresses.IvyCore as `0x${string}`,
      abi: abis.IvyCore,
      functionName: "instantCashOut",
    });
  };

  // Write: Sync User (update bond power)
  const syncUser = async () => {
    if (!address) throw new Error("Wallet not connected");
    return writeContractAsync({
      address: addresses.IvyCore as `0x${string}`,
      abi: abis.IvyCore,
      functionName: "syncUser",
      args: [address],
    });
  };

  // Combined loading state for dashboard
  const isLoading = isLoadingEmission || isLoadingStats || isLoadingNodes;

  return {
    // Loading State
    isLoading,

    // Dashboard Data
    dailyMintAmount: currentDailyEmission ? formatEther(currentDailyEmission as bigint) : "30000",
    nodeTotalSupply: nodeTotalSupply ? Number(nodeTotalSupply) : 0,
    pidMultiplier: pidMultiplier,
    effectiveAlpha: pidMultiplier * emissionFactor,  // Combined multiplier for UI

    // User Data
    ivyBalance: ivyBalance ? formatEther(ivyBalance as bigint) : "0",
    pendingIvy: pendingIvy ? formatEther(pendingIvy as bigint) : "0",
    
    // Mining Stats
    userMiningStats: userMiningStats as any,
    
    // Vesting Info
    vestingInfo: vestingInfo as any,
    
    // Protocol Stats
    protocolStats: stats,
    
    // Circuit Breaker (simplified for now)
    cbStatus: { isActive: false, level: 0 },
    
    // Actions
    harvest,
    claimVested,
    instantCashOut,
    syncUser,
    mintGenesisNode: async () => {
      if (!address) throw new Error("Wallet not connected");
      const referrer = localStorage.getItem('ivy_referrer') || '0x0000000000000000000000000000000000000000';
      return writeContractAsync({
        address: addresses.GenesisNode as `0x${string}`,
        abi: abis.GenesisNode,
        functionName: "mint",
        args: [address, referrer],
      });
    },
    address,
  };
}
