import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Wallet, TrendingUp, Clock, Coins, Zap, Sparkles, Shield, Landmark, FileText, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReferral } from '@/contexts/ReferralContext';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

export function TreasuryPanel() {
  const { address, isConnected } = useAccount();
  const { t } = useLanguage();
  const { referrer } = useReferral();
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedBondId, setSelectedBondId] = useState<number | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isCompounding, setIsCompounding] = useState(false);
  const [showCompoundModal, setShowCompoundModal] = useState(false);
  const [compoundAmount, setCompoundAmount] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawMode, setWithdrawMode] = useState<'standard' | 'instant' | null>(null);

  // Read user's fund allocation (whitepaper compliant)
  const { data: fundAllocation, refetch: refetchAllocation } = useReadContract({
    address: addresses.IvyBond as `0x${string}`,
    abi: abis.IvyBond,
    functionName: 'getFundAllocation',
    args: [address],
    query: { enabled: !!address && isConnected }
  });

  // Read user's Bond NFT IDs
  const { data: bondIds, refetch: refetchBondIds } = useReadContract({
    address: addresses.IvyBond as `0x${string}`,
    abi: abis.IvyBond,
    functionName: 'getUserBondIds',
    args: [address],
    query: { enabled: !!address && isConnected }
  });

  // Read mining stats from IvyCore
  const { data: miningStats, refetch: refetchMining } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: 'getUserMiningStats',
    args: [address],
    query: { enabled: !!address && isConnected }
  });

  // Read vesting info (for withdraw functionality)
  const { data: vestingInfo, refetch: refetchVesting } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: 'getVestingInfo',
    args: [address],
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    }
  });

  // Read total pool bond power (for user power percentage)
  const { data: totalPoolBondPower } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: 'totalPoolBondPower',
    args: [],
    query: {
      enabled: isConnected,
      refetchInterval: 10000,
    }
  });

  // Read USDT balance
  const { data: usdtBalance, refetch: refetchUsdtBalance } = useReadContract({
    address: addresses.MockUSDT as `0x${string}`,
    abi: abis.MockUSDT,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address && isConnected }
  });

  // Read USDT allowance for IvyBond
  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: addresses.MockUSDT as `0x${string}`,
    abi: abis.MockUSDT,
    functionName: 'allowance',
    args: [address, addresses.IvyBond],
    query: { enabled: !!address && isConnected }
  });

  // Read user's boost from GenesisNode
  const { data: totalBoost } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: abis.GenesisNode,
    functionName: 'getTotalBoost',
    args: [address],
    query: { enabled: !!address && isConnected }
  });

  // Read user's Genesis Node info for detailed boost breakdown
  const { data: userInfo } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: abis.GenesisNode,
    functionName: 'getUserInfo',
    args: [address],
    query: { enabled: !!address && isConnected }
  });

  // Write contracts
  const { writeContract: approveUSDT, data: approveHash } = useWriteContract();
  const { writeContract: deposit, data: depositHash } = useWriteContract();
  const { writeContract: compoundVested, data: compoundHash } = useWriteContract();
  const { writeContract: harvestRewards, data: harvestHash } = useWriteContract();
  const { writeContract: syncUser, data: syncHash } = useWriteContract();
  const { writeContract: claimVested, data: claimHash } = useWriteContract();
  const { writeContract: instantCashOut, data: cashOutHash } = useWriteContract();

  // Wait for transactions
  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isDepositLoading, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  const { isLoading: isCompoundLoading, isSuccess: isCompoundSuccess } = useWaitForTransactionReceipt({
    hash: compoundHash,
  });

  const { isLoading: isSyncLoading, isSuccess: isSyncSuccess } = useWaitForTransactionReceipt({
    hash: syncHash,
  });

  const { isLoading: isClaimLoading, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  const { isLoading: isCashOutLoading, isSuccess: isCashOutSuccess } = useWaitForTransactionReceipt({
    hash: cashOutHash,
  });

  const { isLoading: isHarvestLoading, isSuccess: isHarvestSuccess } = useWaitForTransactionReceipt({
    hash: harvestHash,
  });

  // Parse fund allocation data (whitepaper compliant)
  // Contract returns: [totalDeposited, redeemablePrincipal(40%), miningPower(50%), donatedAmount(10%)]
  const totalDeposited = fundAllocation ? Number((fundAllocation as any)[0]) / 1e18 : 0;
  const rwaAssets = fundAllocation ? Number((fundAllocation as any)[1]) / 1e18 : 0;        // 40% (redeemablePrincipal)
  const baseMiningPower = fundAllocation ? Number((fundAllocation as any)[2]) / 1e18 : 0;  // 50% (miningPower = Bond Power)
  const reserveAmount = fundAllocation ? Number((fundAllocation as any)[3]) / 1e18 : 0;    // 10% (donatedAmount)
  const miningPrincipal = baseMiningPower;  // For display consistency (50% LP = mining principal)

  // Parse getUserMiningStats return: [bondPower, pendingRewards, totalVested, totalClaimed, claimableNow]
  const syncedBondPower = miningStats ? Number((miningStats as any)[0]) / 1e18 : 0;  // IvyCore synced power
  const pendingReward = miningStats ? Number((miningStats as any)[1]) / 1e18 : 0;
  const totalVested = miningStats ? Number((miningStats as any)[2]) / 1e18 : 0;
  const totalClaimed = miningStats ? Number((miningStats as any)[3]) / 1e18 : 0;
  const claimableNow = miningStats ? Number((miningStats as any)[4]) / 1e18 : 0;

  // Parse getVestingInfo return: [totalVested, totalClaimed, vestingStartTime, claimableNow, remainingLocked, vestingProgress]
  const vestingStartTime = vestingInfo ? Number((vestingInfo as any)[2]) : 0;
  const remainingToVest = vestingInfo ? Number((vestingInfo as any)[0]) / 1e18 - Number((vestingInfo as any)[1]) / 1e18 : 0;

  // Calculate time until unlock (30 days = 2592000 seconds)
  const VESTING_PERIOD = 30 * 24 * 60 * 60; // 30 days in seconds
  const now = Math.floor(Date.now() / 1000);
  const timeUntilUnlock = vestingStartTime > 0 ? Math.max(0, (vestingStartTime + VESTING_PERIOD) - now) : 0;
  const isUnlocked = timeUntilUnlock === 0 && remainingToVest > 0;

  // IVY Price (Testnet: hardcoded 1 USDT, Mainnet: from oracle)
  const ivyPriceUSDT = 1; // TODO: Read from oracle on mainnet
  const ivyToPowerRate = ivyPriceUSDT * 1.1; // 1 IVY = price × 1.1 Power (with 10% compound bonus)

  // Calculate user power percentage
  const totalPoolPower = totalPoolBondPower ? Number(totalPoolBondPower as any) / 1e18 : 0;
  const userPowerPercentage = totalPoolPower > 0 ? (syncedBondPower / totalPoolPower) * 100 : 0;
  
  // Boost percentages
  const userBoostBps = totalBoost ? Number(totalBoost as any) : 0;
  const userBoostPercent = userBoostBps / 100;
  
  const selfBoostBps = userInfo ? Number((userInfo as any)[3]) : 0;
  const teamAuraBps = userInfo ? Number((userInfo as any)[4]) : 0;
  const selfBoostPercent = selfBoostBps / 100;
  const teamAuraPercent = teamAuraBps / 100;

  // Calculate Effective Mining Power = Base Mining Power × (1 + TotalBoost%)
  const effectiveMiningPower = baseMiningPower * (1 + userBoostPercent / 100);
  const hasBoost = userBoostPercent > 0;

  const usdtBalanceNum = usdtBalance ? Number(usdtBalance as any) / 1e18 : 0;
  const depositAmountBigInt = depositAmount ? parseEther(depositAmount) : BigInt(0);
  const hasApproval = usdtAllowance ? BigInt(usdtAllowance as any) >= depositAmountBigInt : false;
  const hasEnoughBalance = usdtBalanceNum >= Number(depositAmount || 0);

  // Bond NFT count
  const bondCount = bondIds ? (bondIds as any[]).length : 0;

  // Handle approve
  const handleApprove = async () => {
    if (!address || !depositAmount) return;
    
    setIsApproving(true);
    try {
      approveUSDT({
        address: addresses.MockUSDT as `0x${string}`,
        abi: abis.MockUSDT,
        functionName: 'approve',
        args: [addresses.IvyBond, parseEther(depositAmount) * BigInt(10)],
      });
      toast.info('Approval transaction submitted...');
    } catch (error) {
      toast.error('Approval failed');
      setIsApproving(false);
    }
  };

  // Handle deposit (mints Bond NFT)
  const handleDeposit = async () => {
    if (!address || !depositAmount) return;
    
    setIsDepositing(true);
    try {
      const referrerAddress = referrer || '0x0000000000000000000000000000000000000000';
      console.log('[TreasuryPanel] Depositing with referrer:', referrerAddress);
      
      deposit({
        address: addresses.IvyBond as `0x${string}`,
        abi: abis.IvyBond,
        functionName: 'deposit',
        args: [parseEther(depositAmount), referrerAddress as `0x${string}`],
      });
      toast.info('Minting Bond NFT...');
    } catch (error) {
      toast.error('Deposit failed');
      setIsDepositing(false);
    }
  };

  // Handle compound
  const handleCompound = async () => {
    if (!address || selectedBondId === null) return;

    // Validate compound amount
    const amount = Number(compoundAmount);
    if (!compoundAmount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > pendingReward) {
      toast.error(`Amount exceeds available vIVY (${pendingReward.toFixed(4)})`);
      return;
    }

    setIsCompounding(true);
    try {
      compoundVested({
        address: addresses.IvyCore as `0x${string}`,
        abi: abis.IvyCore,
        functionName: 'compoundVestedPartial',
        args: [BigInt(selectedBondId), parseEther(compoundAmount)],
      });
      toast.info(`Compounding ${Number(compoundAmount).toFixed(4)} vIVY into Bond NFT...`);
    } catch (error) {
      toast.error('Compound failed');
      setIsCompounding(false);
    }
  };

  // Handle standard claim (30 days unlock)
  const handleClaimVested = async () => {
    if (!address) return;

    if (!isUnlocked) {
      toast.error('Vesting period not completed yet. Please wait or use Instant Cash Out.');
      return;
    }

    if (remainingToVest === 0) {
      toast.error('Nothing to claim');
      return;
    }

    try {
      claimVested({
        address: addresses.IvyCore as `0x${string}`,
        abi: abis.IvyCore,
        functionName: 'claimVested',
        args: [],
      });
      toast.info(`Claiming ${remainingToVest.toFixed(4)} IVY...`);
    } catch (error) {
      toast.error('Claim failed');
    }
  };

  // Handle instant cash out (50% penalty)
  const handleInstantCashOut = async () => {
    if (!address) return;

    if (remainingToVest === 0) {
      toast.error('Nothing to cash out');
      return;
    }

    try {
      instantCashOut({
        address: addresses.IvyCore as `0x${string}`,
        abi: abis.IvyCore,
        functionName: 'instantCashOut',
        args: [],
      });
      const received = remainingToVest * 0.5;
      toast.info(`Instant cash out: ${received.toFixed(4)} IVY (50% penalty applied)...`);
    } catch (error) {
      toast.error('Cash out failed');
    }
  };

  // Handle harvest (convert vIVY to locked IVY)
  const handleHarvest = async () => {
    if (!address) return;

    if (pendingReward === 0) {
      toast.error(t('harvest.no_vivy'));
      return;
    }

    try {
      harvestRewards({
        address: addresses.IvyCore as `0x${string}`,
        abi: abis.IvyCore,
        functionName: 'harvest',
        args: [],
      });
      toast.info(t('harvest.info_toast').replace('{amount}', pendingReward.toFixed(4)));
    } catch (error) {
      toast.error('Harvest failed');
    }
  };

  // Handle transaction success
  useEffect(() => {
    if (isApproveSuccess && isApproving) {
      setIsApproving(false);
      toast.success('USDT Approved!');
      refetchAllowance();
    }
  }, [isApproveSuccess, isApproving, refetchAllowance]);

  useEffect(() => {
    if (isDepositSuccess && isDepositing) {
      setIsDepositing(false);
      toast.success('Bond NFT Minted! 🎉');

      // ✅ Critical: Sync user to IvyCore after deposit
      // This updates mining power in IvyCore so rewards start accumulating
      toast.info('Syncing mining power...');
      syncUser({
        address: addresses.IvyCore as `0x${string}`,
        abi: abis.IvyCore,
        functionName: 'syncUser',
        args: [address as `0x${string}`],
      });

      setDepositAmount('');
      refetchAllocation();
      refetchBondIds();
      refetchMining();
      refetchUsdtBalance();
    }
  }, [isDepositSuccess, isDepositing]);

  useEffect(() => {
    if (isSyncSuccess) {
      toast.success('Mining power synced! Rewards will start accumulating. ⚡');
      refetchMining();
    }
  }, [isSyncSuccess]);

  useEffect(() => {
    if (isCompoundSuccess && isCompounding) {
      setIsCompounding(false);
      toast.success('vIVY Compounded Successfully! +10% Bonus Power 🎉');
      setShowCompoundModal(false);
      setCompoundAmount('');
      refetchAllocation();
      refetchMining();
    }
  }, [isCompoundSuccess, isCompounding]);

  useEffect(() => {
    if (isClaimSuccess) {
      toast.success(`Successfully claimed ${remainingToVest.toFixed(4)} IVY! 🎉`);
      setShowWithdrawModal(false);
      refetchMining();
      refetchVesting();
    }
  }, [isClaimSuccess]);

  useEffect(() => {
    if (isCashOutSuccess) {
      const received = remainingToVest * 0.5;
      toast.success(`Instant cash out complete! Received ${received.toFixed(4)} IVY 💰`);
      setShowWithdrawModal(false);
      refetchMining();
      refetchVesting();
    }
  }, [isCashOutSuccess]);

  useEffect(() => {
    if (isHarvestSuccess) {
      toast.success(t('harvest.success').replace('{amount}', pendingReward.toFixed(4)));
      refetchMining();
      refetchVesting();
    }
  }, [isHarvestSuccess]);

  // Quick amount buttons
  const quickAmounts = [100, 500, 1000, 5000];

  if (!isConnected) {
    return (
      <GlassCard className="p-6 h-full">
        <div className="text-center py-8">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">{t('common.connect_wallet')}</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <FileText className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Bond NFT Treasury</h3>
          <p className="text-xs text-gray-400">ERC721 Mining Bonds (Whitepaper V2.5)</p>
        </div>
      </div>

      {/* Bond NFT Count */}
      <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">My Bond NFTs</span>
          </div>
          <div className="text-xl font-bold text-purple-400 font-mono">{bondCount}</div>
        </div>
      </div>

      {/* Total Deposit */}
      <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-gray-400">Total Deposit (总投入)</span>
        </div>
        <div className="text-3xl font-bold text-white font-mono">
          {totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-lg text-gray-400 ml-2">USDT</span>
        </div>
      </div>

      {/* Fund Split Visualization - 50/40/10 */}
      {totalDeposited > 0 && (
        <div className="mb-6 space-y-3">
          {/* Mining Principal (50% - Tranche B) - HIGHLIGHTED */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/20 to-green-500/20 border-2 border-primary/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold text-white">Mining Principal (矿机本金 50%)</span>
              </div>
              <div className="px-2 py-0.5 bg-primary/30 rounded text-[10px] text-primary font-bold">
                TRANCHE B
              </div>
            </div>
            <div className="text-2xl font-bold text-primary font-mono">
              {miningPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm text-gray-400 ml-2">USDT</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              Only this portion generates IVY mining rewards
            </div>
          </div>

          {/* RWA Assets (40% - Tranche A) */}
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">RWA Assets (国债 40%)</span>
              </div>
              <div className="text-lg font-bold text-purple-400 font-mono">
                {rwaAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs text-gray-500 ml-1">USDT</span>
              </div>
            </div>
          </div>

          {/* Reserve (10% - Tranche C) */}
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Reserve (储备金 10%)</span>
              </div>
              <div className="text-lg font-bold text-yellow-400 font-mono">
                {reserveAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs text-gray-500 ml-1">USDT</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Effective Mining Power with Boost */}
      {totalDeposited > 0 && (
        <div className={`mb-6 p-4 rounded-lg border ${hasBoost ? 'bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30' : 'bg-black/40 border-white/10'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${hasBoost ? 'text-primary' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-400">Effective Mining Power</span>
            </div>
            {hasBoost && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/20 rounded-full">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-primary font-bold">+{userBoostPercent}% BOOST</span>
              </div>
            )}
          </div>
          
          <div className="text-3xl font-bold font-mono">
            <span className={hasBoost ? 'text-primary' : 'text-white'}>
              {effectiveMiningPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-lg text-gray-400 ml-2">Power</span>
          </div>
          
          {/* Boost Breakdown */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-[10px] text-gray-500 font-mono">
              Formula: {baseMiningPower.toLocaleString()} (Bond Power) × (1 + {userBoostPercent}%) = {effectiveMiningPower.toLocaleString()}
            </div>
            {hasBoost && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selfBoostPercent > 0 && (
                  <div className="px-2 py-1 bg-primary/10 rounded text-[10px] font-mono text-primary border border-primary/20">
                    Self Boost: +{selfBoostPercent}%
                  </div>
                )}
                {teamAuraPercent > 0 && (
                  <div className="px-2 py-1 bg-purple-500/10 rounded text-[10px] font-mono text-purple-400 border border-purple-500/20">
                    Team Aura: +{teamAuraPercent}%
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Network Power Share */}
          {totalPoolPower > 0 && syncedBondPower > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-400">Network Power Share</div>
                <div className="text-sm font-bold font-mono text-cyan-400">
                  {userPowerPercentage.toFixed(4)}%
                </div>
              </div>
              <div className="mt-2 bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  style={{ width: `${Math.min(userPowerPercentage, 100)}%` }}
                ></div>
              </div>
              <div className="text-[9px] text-gray-500 mt-1 flex items-center justify-between">
                <span>Your Power: {syncedBondPower.toLocaleString()}</span>
                <span>Total: {totalPoolPower.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IVY Price Info */}
      <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-green-400" />
            <span className="text-sm font-bold text-white">IVY Price & Power Rate</span>
          </div>
          <div className="px-2 py-0.5 bg-green-500/20 rounded text-[10px] text-green-400 font-mono">
            TESTNET
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-gray-400 mb-1">Current IVY Price</div>
            <div className="text-2xl font-bold text-green-400 font-mono">
              ${ivyPriceUSDT.toFixed(2)}
            </div>
            <div className="text-[10px] text-gray-500 mt-1">USDT per IVY</div>
          </div>

          <div>
            <div className="text-[10px] text-gray-400 mb-1">Compound Rate</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {ivyToPowerRate.toFixed(2)}
            </div>
            <div className="text-[10px] text-gray-500 mt-1">Power per IVY (+10% bonus)</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-green-500/20">
          <div className="text-[10px] text-gray-400 mb-1">Formula:</div>
          <div className="text-[11px] font-mono text-gray-300">
            1 IVY = ${ivyPriceUSDT} × 1.1 (compound bonus) = {ivyToPowerRate} Power
          </div>
        </div>
      </div>

      {/* Yield Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-black/40 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-xs text-gray-400">Pending Yield (vIVY)</span>
          </div>
          <div className="text-lg font-bold text-primary font-mono">
            {pendingReward.toFixed(2)} vIVY
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            Mining rewards (can harvest or compound)
          </div>
        </div>

        <div className="p-3 rounded-lg bg-black/40 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400">Total Claimed</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {totalClaimed.toFixed(2)} IVY
          </div>
        </div>
      </div>

      {/* Harvest Section (Convert vIVY to Locked IVY) */}
      {pendingReward > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">{t('harvest.title')}</span>
            </div>
            <div className="px-2 py-0.5 bg-cyan-500/20 rounded text-[10px] text-cyan-400 font-bold">
              {t('harvest.lock_badge')}
            </div>
          </div>
          <div className="text-[10px] text-gray-400 mb-3">
            {t('harvest.description')}
          </div>
          <div className="mb-3 p-3 rounded bg-cyan-500/10 border border-cyan-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300">{t('harvest.available')}</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">{pendingReward.toFixed(4)} vIVY</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            onClick={handleHarvest}
            disabled={isHarvestLoading}
          >
            {isHarvestLoading ? t('harvest.harvesting') : t('harvest.button').replace('{amount}', pendingReward.toFixed(4))}
          </Button>
        </div>
      )}

      {/* Vesting Unlock Section */}
      {remainingToVest > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-blue-400" />
                Locked IVY (30-Day Vesting)
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                {isUnlocked ? 'Ready to claim!' : `Unlocks in ${Math.ceil(timeUntilUnlock / 86400)} days`}
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-400 font-mono">
              {remainingToVest.toFixed(2)} IVY
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              onClick={() => {
                setWithdrawMode('standard');
                setShowWithdrawModal(true);
              }}
              disabled={!isUnlocked}
            >
              Standard Unlock (100%)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              onClick={() => {
                setWithdrawMode('instant');
                setShowWithdrawModal(true);
              }}
            >
              Instant (50% Penalty)
            </Button>
          </div>
        </div>
      )}

      {/* Compound Section (if user has bonds) */}
      {bondCount > 0 && (
        <div className="mb-6 p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-white">Compound (复投)</span>
            </div>
            <div className="px-2 py-0.5 bg-orange-500/20 rounded text-[10px] text-orange-400 font-bold">
              +10% BONUS
            </div>
          </div>
          <div className="text-[10px] text-gray-400 mb-2">
            Whitepaper: "复投部分的资金给予 10% 的算力加成"
          </div>
          <Button 
            variant="outline"
            size="sm"
            className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
            onClick={() => setShowCompoundModal(true)}
          >
            Compound into Bond NFT
          </Button>
        </div>
      )}

      {/* Manual Sync Button (if user has bonds but IvyCore not synced) */}
      {bondCount > 0 && baseMiningPower > 0 && syncedBondPower === 0 && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-bold text-yellow-400">Mining Power Not Synced</div>
              <div className="text-[10px] text-gray-400">Click below to start earning rewards</div>
            </div>
            <Button
              size="sm"
              className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
              onClick={() => {
                syncUser({
                  address: addresses.IvyCore as `0x${string}`,
                  abi: abis.IvyCore,
                  functionName: 'syncUser',
                  args: [address as `0x${string}`],
                });
                toast.info('Syncing mining power...');
              }}
              disabled={isSyncLoading}
            >
              {isSyncLoading ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </div>
      )}

      {/* Deposit Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Mint New Bond NFT</span>
          <span className="text-xs text-gray-500 font-mono">
            Balance: {usdtBalanceNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
          </span>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2">
          {quickAmounts.map(amount => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              className="flex-1 text-xs border-white/10 hover:border-primary/50 hover:text-primary"
              onClick={() => setDepositAmount(amount.toString())}
            >
              {amount}
            </Button>
          ))}
        </div>

        {/* Input */}
        <div className="relative">
          <Input
            type="number"
            placeholder="Enter amount..."
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="bg-black/50 border-white/10 text-white pr-16"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            USDT
          </span>
        </div>

        {/* Preview Fund Split */}
        {depositAmount && Number(depositAmount) >= 10 && (
          <div className="p-3 rounded bg-primary/5 border border-primary/10 space-y-2">
            <div className="text-[10px] text-gray-400 font-bold">Your deposit will be split:</div>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
              <div className="text-center p-2 bg-primary/10 rounded">
                <div className="text-primary font-bold">{(Number(depositAmount) * 0.5).toLocaleString()}</div>
                <div className="text-gray-500">Mining (50%)</div>
              </div>
              <div className="text-center p-2 bg-purple-500/10 rounded">
                <div className="text-purple-400 font-bold">{(Number(depositAmount) * 0.4).toLocaleString()}</div>
                <div className="text-gray-500">RWA (40%)</div>
              </div>
              <div className="text-center p-2 bg-yellow-500/10 rounded">
                <div className="text-yellow-400 font-bold">{(Number(depositAmount) * 0.1).toLocaleString()}</div>
                <div className="text-gray-500">Reserve (10%)</div>
              </div>
            </div>
          </div>
        )}

        {/* Validation */}
        {depositAmount && Number(depositAmount) < 10 && (
          <div className="text-xs text-yellow-400">Minimum deposit: 10 USDT</div>
        )}
        
        {depositAmount && !hasEnoughBalance && (
          <div className="text-xs text-red-400">Insufficient balance. Use faucet.</div>
        )}

        {/* Action Buttons */}
        {!hasApproval && depositAmount && Number(depositAmount) >= 10 ? (
          <Button 
            className="w-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
            onClick={handleApprove}
            disabled={isApproving || isApproveLoading || !hasEnoughBalance}
          >
            {isApproving || isApproveLoading ? 'Approving...' : 'Approve USDT'}
          </Button>
        ) : (
          <Button 
            className="w-full bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 font-mono"
            onClick={handleDeposit}
            disabled={
              isDepositing || 
              isDepositLoading || 
              !depositAmount || 
              Number(depositAmount) < 10 || 
              !hasEnoughBalance
            }
          >
            {isDepositing || isDepositLoading ? 'Minting Bond NFT...' : 'Mint Bond NFT & Earn'}
          </Button>
        )}
      </div>

      {/* Compound Modal */}
      {showCompoundModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4">Compound vIVY into Bond NFT</h3>

            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Select Bond NFT</label>
              <select
                className="w-full bg-black/50 border border-white/10 rounded p-2 text-white"
                value={selectedBondId ?? ''}
                onChange={(e) => setSelectedBondId(Number(e.target.value))}
              >
                <option value="">Select a bond...</option>
                {bondIds && (bondIds as any[]).map((id: any) => (
                  <option key={id.toString()} value={id.toString()}>
                    Bond NFT #{id.toString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4 p-3 rounded bg-blue-500/10 border border-blue-500/20">
              <div className="text-[10px] text-gray-400 mb-1">Available vIVY (Pending Rewards):</div>
              <div className="text-2xl font-bold text-white">{pendingReward.toFixed(4)} vIVY</div>
            </div>

            {/* Compound Amount Input */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Compound Amount (vIVY)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter amount..."
                  value={compoundAmount}
                  onChange={(e) => setCompoundAmount(e.target.value)}
                  className="bg-black/50 border-white/10 text-white"
                />
                <Button
                  variant="outline"
                  onClick={() => setCompoundAmount(pendingReward.toString())}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  MAX
                </Button>
              </div>
              {compoundAmount && Number(compoundAmount) > pendingReward && (
                <div className="text-xs text-red-400 mt-1">
                  Amount exceeds available vIVY
                </div>
              )}
            </div>

            {compoundAmount && Number(compoundAmount) > 0 && (
              <div className="mb-4 p-3 rounded bg-orange-500/10 border border-orange-500/20">
                <div className="text-[10px] text-gray-400">Compound Process:</div>
                <div className="text-[11px] text-gray-300 mt-2 space-y-1">
                  <div>1. vIVY → Convert to IVY → Burn to 0xdead</div>
                  <div>2. Query IVY price (Testnet: 1 IVY = 1 USDT)</div>
                  <div>3. Calculate power with 10% bonus</div>
                </div>
                <div className="mt-3 pt-3 border-t border-orange-500/20">
                  <div className="text-[10px] text-gray-400">Bonus Power Calculation:</div>
                  <div className="text-sm font-mono text-orange-400">
                    {Number(compoundAmount).toFixed(2)} vIVY × 1 USDT × 110% = {(Number(compoundAmount) * 1.1).toFixed(2)} Power
                  </div>
                </div>
              </div>
            )}

            {pendingReward === 0 && (
              <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20">
                <div className="text-sm text-red-400">No vIVY available to compound</div>
                <div className="text-[10px] text-gray-400 mt-1">You need to harvest rewards first</div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCompoundModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-orange-500/20 text-orange-400 border border-orange-500/30"
                onClick={handleCompound}
                disabled={isCompounding || isCompoundLoading || !compoundAmount || Number(compoundAmount) <= 0 || Number(compoundAmount) > pendingReward || selectedBondId === null}
              >
                {isCompounding || isCompoundLoading ? 'Compounding...' : 'Compound vIVY'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4">
              {withdrawMode === 'standard' ? 'Standard Unlock (30 Days)' : 'Instant Cash Out (50% Penalty)'}
            </h3>

            <div className="mb-4 p-3 rounded bg-blue-500/10 border border-blue-500/20">
              <div className="text-[10px] text-gray-400 mb-1">Locked IVY Amount:</div>
              <div className="text-2xl font-bold text-white">{remainingToVest.toFixed(4)} IVY</div>
            </div>

            {withdrawMode === 'standard' && (
              <>
                {isUnlocked ? (
                  <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/20">
                    <div className="text-sm text-green-400 font-bold mb-2">✅ Unlock Complete!</div>
                    <div className="text-[11px] text-gray-300">
                      You can now claim your full locked amount with no penalty.
                    </div>
                    <div className="mt-3 pt-3 border-t border-green-500/20">
                      <div className="text-[10px] text-gray-400">You will receive:</div>
                      <div className="text-xl font-mono text-green-400">
                        {remainingToVest.toFixed(4)} IVY (100%)
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <div className="text-sm text-yellow-400 font-bold mb-2">⏳ Still Locked</div>
                    <div className="text-[11px] text-gray-300">
                      Your IVY will unlock in {Math.ceil(timeUntilUnlock / 86400)} days ({Math.floor(timeUntilUnlock / 3600)} hours).
                    </div>
                    <div className="mt-2 text-[10px] text-gray-400">
                      You can use Instant Cash Out to receive 50% immediately.
                    </div>
                  </div>
                )}
              </>
            )}

            {withdrawMode === 'instant' && (
              <div className="mb-4 p-3 rounded bg-orange-500/10 border border-orange-500/20">
                <div className="text-sm text-orange-400 font-bold mb-2">⚠️ Warning: 50% Penalty</div>
                <div className="text-[11px] text-gray-300 mb-3">
                  Instant cash out burns 50% of your locked IVY as a penalty for early withdrawal.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-green-500/10 rounded">
                    <div className="text-[10px] text-gray-400">You Receive</div>
                    <div className="text-sm font-mono text-green-400">
                      {(remainingToVest * 0.5).toFixed(4)} IVY
                    </div>
                    <div className="text-[9px] text-gray-500">(50%)</div>
                  </div>
                  <div className="p-2 bg-red-500/10 rounded">
                    <div className="text-[10px] text-gray-400">Burned</div>
                    <div className="text-sm font-mono text-red-400">
                      {(remainingToVest * 0.5).toFixed(4)} IVY
                    </div>
                    <div className="text-[9px] text-gray-500">(50%)</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowWithdrawModal(false)}
              >
                Cancel
              </Button>
              {withdrawMode === 'standard' ? (
                <Button
                  className="flex-1 bg-green-500/20 text-green-400 border border-green-500/30"
                  onClick={handleClaimVested}
                  disabled={isClaimLoading || !isUnlocked}
                >
                  {isClaimLoading ? 'Claiming...' : 'Claim IVY'}
                </Button>
              ) : (
                <Button
                  className="flex-1 bg-orange-500/20 text-orange-400 border border-orange-500/30"
                  onClick={handleInstantCashOut}
                  disabled={isCashOutLoading}
                >
                  {isCashOutLoading ? 'Processing...' : 'Confirm Cash Out'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
