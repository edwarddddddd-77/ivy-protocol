import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Wallet, TrendingUp, Clock, Coins, ArrowRight } from 'lucide-react';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

export function TreasuryPanel() {
  const { address, isConnected } = useAccount();
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
  const userBoost = totalBoost ? Number(totalBoost as any) / 100 : 0;

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
  if (isApproveSuccess && isApproving) {
    setIsApproving(false);
    toast.success('USDT Approved!');
    refetchAllowance();
  }

  if (isDepositSuccess && isDepositing) {
    setIsDepositing(false);
    toast.success('Deposit Successful!');
    setDepositAmount('');
    refetchBond();
    refetchMining();
    refetchUsdtBalance();
  }

  // Quick amount buttons
  const quickAmounts = [100, 500, 1000, 5000];

  if (!isConnected) {
    return (
      <GlassCard className="p-6 h-full">
        <div className="text-center py-8">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">Connect wallet to view treasury</p>
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
          <h3 className="text-lg font-bold text-white">TREASURY & YIELD</h3>
          <p className="text-xs text-gray-400">Investment & Mining Rewards</p>
        </div>
      </div>

      {/* My Principal */}
      <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-gray-400">My Principal</span>
        </div>
        <div className="text-3xl font-bold text-white font-mono">
          {totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-lg text-gray-400 ml-2">USDT</span>
        </div>
        {bondPower > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            Bond Power: {bondPower.toLocaleString()} | Pool Share: {shareOfPool.toFixed(2)}%
          </div>
        )}
      </div>

      {/* Yield Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-black/40 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-xs text-gray-400">Est. Daily Yield</span>
          </div>
          <div className="text-lg font-bold text-primary font-mono">
            {pendingReward.toFixed(2)} IVY
          </div>
          {userBoost > 0 && (
            <div className="text-[10px] text-primary/60">
              +{userBoost}% boost applied
            </div>
          )}
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

      {/* Referral Earnings */}
      <div className="mb-6 p-3 rounded-lg bg-black/40 border border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Referral Earnings</span>
          <span className="text-lg font-bold text-purple-400 font-mono">
            {referralEarnings.toFixed(2)} IVY
          </span>
        </div>
      </div>

      {/* Fund Flow Diagram */}
      <div className="mb-6 p-3 rounded-lg bg-black/40 border border-white/10">
        <div className="text-xs text-gray-400 mb-2">Fund Distribution (50/40/10)</div>
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className="text-center">
            <div className="text-blue-400">50%</div>
            <div className="text-gray-500">Liquidity</div>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-600" />
          <div className="text-center">
            <div className="text-purple-400">40%</div>
            <div className="text-gray-500">RWA</div>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-600" />
          <div className="text-center">
            <div className="text-green-400">10%</div>
            <div className="text-gray-500">Reserve</div>
          </div>
        </div>
      </div>

      {/* Deposit Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Deposit USDT</span>
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

        {/* Validation Messages */}
        {depositAmount && Number(depositAmount) < 10 && (
          <div className="text-xs text-yellow-400">
            Minimum deposit: 10 USDT
          </div>
        )}
        
        {depositAmount && !hasEnoughBalance && (
          <div className="text-xs text-red-400">
            Insufficient balance. Use faucet below.
          </div>
        )}

        {/* Action Buttons */}
        {addresses.IvyBond === '0x0000000000000000000000000000000000000000' ? (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
            <div className="text-yellow-400 text-sm">IvyBond contract not deployed yet</div>
            <div className="text-xs text-gray-500">Deploy contracts to enable deposits</div>
          </div>
        ) : !hasApproval && depositAmount && Number(depositAmount) >= 10 ? (
          <Button 
            className="w-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
            onClick={handleApprove}
            disabled={isApproving || isApproveLoading || !hasEnoughBalance}
          >
            {isApproving || isApproveLoading ? '[ APPROVING... ]' : '[ APPROVE USDT ]'}
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
            {isDepositing || isDepositLoading ? '[ DEPOSITING... ]' : '[ DEPOSIT & EARN ]'}
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
