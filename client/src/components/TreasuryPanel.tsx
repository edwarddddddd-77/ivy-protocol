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
  const [compoundAmount, setCompoundAmount] = useState('');
  const [selectedBondId, setSelectedBondId] = useState<number | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isCompounding, setIsCompounding] = useState(false);
  const [showCompoundModal, setShowCompoundModal] = useState(false);

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
  const { writeContract: compound, data: compoundHash } = useWriteContract();

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

  // Parse fund allocation data (whitepaper compliant)
  const totalDeposited = fundAllocation ? Number((fundAllocation as any)[0]) / 1e18 : 0;
  const miningPrincipal = fundAllocation ? Number((fundAllocation as any)[1]) / 1e18 : 0;  // 50%
  const rwaAssets = fundAllocation ? Number((fundAllocation as any)[2]) / 1e18 : 0;        // 40%
  const reserveAmount = fundAllocation ? Number((fundAllocation as any)[3]) / 1e18 : 0;    // 10%
  const baseMiningPower = fundAllocation ? Number((fundAllocation as any)[4]) / 1e18 : 0;  // Bond Power

  const pendingReward = miningStats ? Number((miningStats as any)[0]) / 1e18 : 0;
  const totalClaimed = miningStats ? Number((miningStats as any)[1]) / 1e18 : 0;
  const referralEarnings = miningStats ? Number((miningStats as any)[2]) / 1e18 : 0;
  
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
    if (!address || !compoundAmount || selectedBondId === null) return;
    
    setIsCompounding(true);
    try {
      compound({
        address: addresses.IvyBond as `0x${string}`,
        abi: abis.IvyBond,
        functionName: 'compound',
        args: [BigInt(selectedBondId), parseEther(compoundAmount)],
      });
      toast.info('Compounding into Bond NFT...');
    } catch (error) {
      toast.error('Compound failed');
      setIsCompounding(false);
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
      setDepositAmount('');
      refetchAllocation();
      refetchBondIds();
      refetchMining();
      refetchUsdtBalance();
    }
  }, [isDepositSuccess, isDepositing]);

  useEffect(() => {
    if (isCompoundSuccess && isCompounding) {
      setIsCompounding(false);
      toast.success('Compound Successful! +10% Bonus Power');
      setCompoundAmount('');
      setShowCompoundModal(false);
      refetchAllocation();
      refetchMining();
      refetchUsdtBalance();
    }
  }, [isCompoundSuccess, isCompounding]);

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
        </div>
      )}

      {/* Yield Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-black/40 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-xs text-gray-400">Pending Yield</span>
          </div>
          <div className="text-lg font-bold text-primary font-mono">
            {pendingReward.toFixed(2)} IVY
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
            <h3 className="text-lg font-bold text-white mb-4">Compound into Bond NFT</h3>
            
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
            
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Compound Amount (USDT)</label>
              <Input
                type="number"
                placeholder="Enter amount..."
                value={compoundAmount}
                onChange={(e) => setCompoundAmount(e.target.value)}
                className="bg-black/50 border-white/10 text-white"
              />
            </div>
            
            {compoundAmount && Number(compoundAmount) > 0 && (
              <div className="mb-4 p-3 rounded bg-orange-500/10 border border-orange-500/20">
                <div className="text-[10px] text-gray-400">Bonus Power Calculation:</div>
                <div className="text-sm font-mono text-orange-400">
                  {(Number(compoundAmount) * 0.5).toLocaleString()} × 110% = {(Number(compoundAmount) * 0.5 * 1.1).toLocaleString()} Power
                </div>
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
                disabled={isCompounding || isCompoundLoading || !compoundAmount || selectedBondId === null}
              >
                {isCompounding || isCompoundLoading ? 'Compounding...' : 'Compound'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
