import { useMemo } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

/**
 * ROI Calculator Hook
 *
 * Calculates estimated returns based on:
 * - Deposit amount
 * - Current daily emission
 * - Total pool power
 * - Genesis Node boost
 */

export interface ROIResult {
  // Daily estimates
  dailyIVY: number;
  dailyUSDT: number;

  // Weekly estimates
  weeklyIVY: number;
  weeklyUSDT: number;

  // Monthly estimates (30 days)
  monthlyIVY: number;
  monthlyUSDT: number;

  // Yearly estimates (365 days)
  yearlyIVY: number;
  yearlyUSDT: number;

  // APY percentage
  apy: number;

  // Pool share percentage
  poolShare: number;

  // Effective power (with boost)
  effectivePower: number;
}

export function useROICalculator(depositAmount: number) {
  const { address } = useAccount();

  // Read current daily emission
  const { data: currentDailyEmission } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: 'currentDailyEmission',
  });

  // Read total pool bond power
  const { data: totalPoolBondPower } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: 'totalPoolBondPower',
  });

  // Read user's Genesis Node boost
  const { data: userBoost } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: abis.GenesisNode,
    functionName: 'getTotalBoost',
    args: [address],
    query: { enabled: !!address },
  });

  // Read user's NFT balance (to check if has Genesis Node)
  const { data: nftBalance } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: abis.GenesisNode,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address },
  });

  // Parse values
  const dailyEmission = currentDailyEmission
    ? Number(formatEther(currentDailyEmission as bigint))
    : 30000; // Default 30k IVY/day

  const totalPoolPower = totalPoolBondPower
    ? Number(totalPoolBondPower as bigint) / 1e18
    : 0;

  const boost = userBoost ? Number(userBoost as bigint) / 100 : 0; // Convert from basis points
  const hasGenesisNode = nftBalance ? Number(nftBalance as bigint) > 0 : false;

  // IVY price (testnet = 1 USDT, mainnet will use oracle)
  const ivyPriceUSDT = 1;

  // Calculate ROI
  const result = useMemo<ROIResult>(() => {
    if (depositAmount <= 0) {
      return {
        dailyIVY: 0,
        dailyUSDT: 0,
        weeklyIVY: 0,
        weeklyUSDT: 0,
        monthlyIVY: 0,
        monthlyUSDT: 0,
        yearlyIVY: 0,
        yearlyUSDT: 0,
        apy: 0,
        poolShare: 0,
        effectivePower: 0,
      };
    }

    // Calculate mining power (50% of deposit goes to mining)
    const miningPrincipal = depositAmount * 0.5;

    // Apply Genesis Node boost (10% if has node)
    const boostMultiplier = hasGenesisNode ? 1 + boost / 100 : 1;
    const effectivePower = miningPrincipal * boostMultiplier;

    // Calculate pool share after adding user's power
    const newTotalPoolPower = totalPoolPower + effectivePower;
    const poolShare = newTotalPoolPower > 0 ? (effectivePower / newTotalPoolPower) * 100 : 0;

    // Calculate daily IVY earnings
    const dailyIVY = newTotalPoolPower > 0
      ? (effectivePower / newTotalPoolPower) * dailyEmission
      : 0;

    // Calculate USDT value
    const dailyUSDT = dailyIVY * ivyPriceUSDT;

    // Calculate other periods
    const weeklyIVY = dailyIVY * 7;
    const weeklyUSDT = weeklyIVY * ivyPriceUSDT;

    const monthlyIVY = dailyIVY * 30;
    const monthlyUSDT = monthlyIVY * ivyPriceUSDT;

    const yearlyIVY = dailyIVY * 365;
    const yearlyUSDT = yearlyIVY * ivyPriceUSDT;

    // Calculate APY (annual percentage yield)
    // Based on: (yearly earnings / initial deposit) * 100
    const apy = depositAmount > 0 ? (yearlyUSDT / depositAmount) * 100 : 0;

    return {
      dailyIVY,
      dailyUSDT,
      weeklyIVY,
      weeklyUSDT,
      monthlyIVY,
      monthlyUSDT,
      yearlyIVY,
      yearlyUSDT,
      apy,
      poolShare,
      effectivePower,
    };
  }, [depositAmount, dailyEmission, totalPoolPower, boost, hasGenesisNode, ivyPriceUSDT]);

  return {
    ...result,
    // Additional data for display
    dailyEmission,
    totalPoolPower,
    boost,
    hasGenesisNode,
    ivyPriceUSDT,
  };
}
