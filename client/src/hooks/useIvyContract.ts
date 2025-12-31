import { useReadContract, useWriteContract, useAccount, useBalance } from "wagmi";
import addresses from "../contracts/addresses.json";
import abis from "../contracts/abis.json";
import { formatEther } from "viem";

export function useIvyContract() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Read: Daily Mint Amount
  const { data: dailyMintAmount } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "calculateDailyMint",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    }
  });

  // Read: Circuit Breaker Status
  const { data: cbStatus } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "cbStatus",
    query: {
      refetchInterval: 2000,
    }
  });

  // Read: Effective Alpha (for Rotation Speed)
  const { data: effectiveAlpha } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: "getEffectiveAlpha",
    query: {
      refetchInterval: 2000,
    }
  });

  // Read: User IVY Balance
  const { data: ivyBalance } = useReadContract({
    address: addresses.IvyToken as `0x${string}`,
    abi: abis.IvyToken,
    functionName: "balanceOf",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: 2000,
    }
  });

  // Write: Mint Daily
  const mintDaily = async () => {
    if (!address) throw new Error("Wallet not connected");
    return writeContractAsync({
      address: addresses.IvyCore as `0x${string}`,
      abi: abis.IvyCore,
      functionName: "mintDaily",
      args: [address],
    });
  };

  return {
    dailyMintAmount: dailyMintAmount ? formatEther(dailyMintAmount as bigint) : "0",
    cbStatus: cbStatus as any, // { level, triggerTime, triggerPrice, forcedAlpha, isActive }
    effectiveAlpha: effectiveAlpha ? Number(formatEther(effectiveAlpha as bigint)) : 1.2,
    ivyBalance: ivyBalance ? formatEther(ivyBalance as bigint) : "0",
    mintDaily,
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
