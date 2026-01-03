import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Wallet, TrendingUp, Clock, Coins, ArrowRight, Zap, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

export function TreasuryPanel() {
  const { address, isConnected } = useAccount();
  const { t } = useLanguage();
  const [depositAmount, setDepositAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);

  // Read user's bond info
  const { data: bondInfo, isLoading: isLoadingBond, refetch: refetchBond } = useReadContract({
    address: addresses.IvyBond as `0x${string}`,
    abi: abis.IvyBond,
    functionName: 'getBondInfo',
    args: [address],
    query: { enabled: !!address && isConnected && addresses.IvyBond !== '0x0000000000000000000000000000000000000000' }
  });

  // Read mining stats from IvyCore
  const { data: miningStats, refetch: refetchMining } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: 'getUserMiningStats',
    args: [address],
    query: { enabled: !!address && isConnected }
  });

  // Read USDT balance
  const { data: usdtBalance, refetch: refetchUsdtBalance } = useReadContract({
    address: addresses.MockUSDT as `0x${string}`,
    abi: abis.MockUSDT,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address && isConnected && addresses.MockUSDT !== '0x0000000000000000000000000000000000000000' }
  });

  // Read USDT allowance for IvyBond
  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: addresses.MockUSDT as `0x${string}`,
    abi: abis.MockUSDT,
    functionName: 'allowance',
    args: [address, addresses.IvyBond],
    query: { enabled: !!address && isConnected && addresses.MockUSDT !== '0x0000000000000000000000000000000000000000' }
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

  // Wait for transactions
  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isDepositLoading, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  // Parse data
  const totalDeposited = bondInfo ? Number((bondInfo as any)[0]) / 1e18 : 0;
  const bondPower = bondInfo ? Number((bondInfo as any)[2]) / 1e18 : 0;
  const shareOfPool = bondInfo ? Number((bondInfo as any)[3]) / 100 : 0;

  const pendingReward = miningStats ? Number((miningStats as any)[0]) / 1e18 : 0;
  const totalClaimed = miningStats ? Number((miningStats as any)[1]) / 1e18 : 0;
  const referralEarnings = miningStats ? Number((miningStats as any)[2]) / 1e18 : 0;
  
  // Boost percentages (stored in basis points, 1000 = 10%)
  const userBoostBps = totalBoost ? Number(totalBoost as any) : 0;
  const userBoostPercent = userBoostBps / 100; // Convert to percentage
  
  // Detailed boost breakdown from userInfo
  const selfBoostBps = userInfo ? Number((userInfo as any)[3]) : 0;
  const teamAuraBps = userInfo ? Number((userInfo as any)[4]) : 0;
  const selfBoostPercent = selfBoostBps / 100;
  const teamAuraPercent = teamAuraBps / 100;

  // Calculate Mining Power = Principal * (1 + TotalBoost%)
  const miningPower = totalDeposited * (1 + userBoostPercent / 100);
  const hasBoost = userBoostPercent > 0;

  const usdtBalanceNum = usdtBalance ? Number(usdtBalance as any) / 1e18 : 0;
  const depositAmountBigInt = depositAmount ? parseEther(depositAmount) : BigInt(0);
  const hasApproval = usdtAllowance ? BigInt(usdtAllowance as any) >= depositAmountBigInt : false;
  const hasEnoughBalance = usdtBalanceNum >= Number(depositAmount || 0);

  // Handle approve
  const handleApprove = async () => {
    if (!address || !depositAmount || addresses.MockUSDT === '0x0000000000000000000000000000000000000000') {
      toast.error('Invalid input or MockUSDT not deployed');
      return;
    }
    
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

  // Handle deposit
  const handleDeposit = async () => {
    if (!address || !depositAmount || addresses.IvyBond === '0x0000000000000000000000000000000000000000') {
      toast.error('Invalid input or IvyBond not deployed');
      return;
    }
    
    setIsDepositing(true);
    try {
      deposit({
        address: addresses.IvyBond as `0x${string}`,
        abi: abis.IvyBond,
        functionName: 'deposit',
        args: [parseEther(depositAmount)],
      });
      toast.info('Deposit transaction submitted...');
    } catch (error) {
      toast.error('Deposit failed');
      setIsDepositing(false);
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
      toast.success('Deposit Successful!');
      setDepositAmount('');
      refetchBond();
      refetchMining();
      refetchUsdtBalance();
    }
  }, [isDepositSuccess, isDepositing, refetchBond, refetchMining, refetchUsdtBalance]);

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
          <Wallet className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{t('treasury.title')}</h3>
          <p className="text-xs text-gray-400">{t('treasury.subtitle')}</p>
        </div>
      </div>

      {/* My Principal (本金) */}
      <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-gray-400">{t('treasury.my_principal')}</span>
        </div>
        <div className="text-3xl font-bold text-white font-mono">
          {totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-lg text-gray-400 ml-2">USDT</span>
        </div>
        {bondPower > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {t('treasury.pool_share')}: {shareOfPool.toFixed(4)}%
          </div>
        )}
      </div>

      {/* Mining Power (挖矿算力) - NEW SECTION */}
      <div className={`mb-6 p-4 rounded-lg border ${hasBoost ? 'bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30' : 'bg-black/40 border-white/10'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${hasBoost ? 'text-primary' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-400">{t('treasury.mining_power') || 'Mining Power'}</span>
          </div>
          {hasBoost && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/20 rounded-full">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-primary font-bold">BOOST ACTIVE</span>
            </div>
          )}
        </div>
        
        <div className="text-3xl font-bold font-mono">
          <span className={hasBoost ? 'text-primary' : 'text-white'}>
            {miningPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-lg text-gray-400 ml-2">Power</span>
        </div>
        
        {/* Boost Breakdown */}
        {hasBoost && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-xs text-gray-400 mb-2">Boost Breakdown:</div>
            <div className="flex flex-wrap gap-2">
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
              <div className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white border border-white/10">
                Total: +{userBoostPercent}%
              </div>
            </div>
            <div className="text-[10px] text-gray-500 mt-2 font-mono">
              Formula: {totalDeposited.toLocaleString()} × (1 + {userBoostPercent}%) = {miningPower.toLocaleString()}
            </div>
          </div>
        )}
        
        {/* No Boost Message */}
        {!hasBoost && totalDeposited > 0 && (
          <div className="mt-2 text-[10px] text-gray-500">
            💡 Purchase a Genesis Node to get +10% mining boost!
          </div>
        )}
      </div>

      {/* Yield Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-black/40 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-xs text-gray-400">{t('treasury.est_daily')}</span>
          </div>
          <div className="text-lg font-bold text-primary font-mono">
            {pendingReward.toFixed(2)} IVY
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-black/40 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400">{t('treasury.total_claimed')}</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {totalClaimed.toFixed(2)} IVY
          </div>
        </div>
      </div>

      {/* Referral Earnings */}
      <div className="mb-6 p-3 rounded-lg bg-black/40 border border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">{t('treasury.referral_earnings')}</span>
          <span className="text-lg font-bold text-purple-400 font-mono">
            {referralEarnings.toFixed(2)} IVY
          </span>
        </div>
      </div>

      {/* Fund Flow Diagram */}
      <div className="mb-6 p-3 rounded-lg bg-black/40 border border-white/10">
        <div className="text-xs text-gray-400 mb-2">{t('treasury.fund_distribution')}</div>
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className="text-center">
            <div className="text-blue-400">50%</div>
            <div className="text-gray-500">{t('treasury.liquidity')}</div>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-600" />
          <div className="text-center">
            <div className="text-purple-400">40%</div>
            <div className="text-gray-500">{t('treasury.rwa')}</div>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-600" />
          <div className="text-center">
            <div className="text-green-400">10%</div>
            <div className="text-gray-500">{t('treasury.reserve')}</div>
          </div>
        </div>
      </div>

      {/* Deposit Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{t('treasury.deposit_usdt')}</span>
          <span className="text-xs text-gray-500 font-mono">
            {t('treasury.balance')}: {usdtBalanceNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
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

        {/* Preview Mining Power after deposit */}
        {depositAmount && Number(depositAmount) >= 10 && (
          <div className="p-2 rounded bg-primary/5 border border-primary/10">
            <div className="text-[10px] text-gray-400">After deposit, your Mining Power will be:</div>
            <div className="text-sm font-bold text-primary font-mono">
              {((totalDeposited + Number(depositAmount)) * (1 + userBoostPercent / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })} Power
              {hasBoost && <span className="text-[10px] text-gray-400 ml-1">(+{userBoostPercent}% boost)</span>}
            </div>
          </div>
        )}

        {/* Validation Messages */}
        {depositAmount && Number(depositAmount) < 10 && (
          <div className="text-xs text-yellow-400">
            Minimum deposit: 10 USDT
          </div>
        )}
        
        {depositAmount && !hasEnoughBalance && (
          <div className="text-xs text-red-400">
            Insufficient balance. Use faucet.
          </div>
        )}

        {/* Action Buttons */}
        {addresses.IvyBond === '0x0000000000000000000000000000000000000000' ? (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
            <div className="text-yellow-400 text-sm">{t('treasury.not_deployed')}</div>
            <div className="text-xs text-gray-500">{t('treasury.deploy_first')}</div>
          </div>
        ) : !hasApproval && depositAmount && Number(depositAmount) >= 10 ? (
          <Button 
            className="w-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
            onClick={handleApprove}
            disabled={isApproving || isApproveLoading || !hasEnoughBalance}
          >
            {isApproving || isApproveLoading ? t('common.approving') : t('common.approve')}
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
            {isDepositing || isDepositLoading ? t('treasury.depositing') : t('treasury.deposit_earn')}
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
