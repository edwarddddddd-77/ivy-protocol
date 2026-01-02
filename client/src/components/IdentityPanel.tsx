import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Shield, Zap, Users, CheckCircle, XCircle } from 'lucide-react';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

const NODE_PRICE = BigInt('1000000000000000000000'); // 1000 USDT

export function IdentityPanel() {
  const { address, isConnected } = useAccount();
  const [isApproving, setIsApproving] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  // Read user's Genesis Node info
  const { data: userInfo, isLoading: isLoadingUserInfo, refetch: refetchUserInfo } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: abis.GenesisNode,
    functionName: 'getUserInfo',
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

  // Read USDT allowance
  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: addresses.MockUSDT as `0x${string}`,
    abi: abis.MockUSDT,
    functionName: 'allowance',
    args: [address, addresses.GenesisNode],
    query: { enabled: !!address && isConnected && addresses.MockUSDT !== '0x0000000000000000000000000000000000000000' }
  });

  // Contract stats
  const { data: contractStats } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: abis.GenesisNode,
    functionName: 'getContractStats',
    query: { enabled: isConnected }
  });

  // Write contracts
  const { writeContract: approveUSDT, data: approveHash } = useWriteContract();
  const { writeContract: mintNode, data: mintHash } = useWriteContract();

  // Wait for transactions
  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isMintLoading, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  // Parse data
  const nftBalance = userInfo ? Number((userInfo as any)[0]) : 0;
  const selfBoost = userInfo ? Number((userInfo as any)[3]) : 0;
  const teamAura = userInfo ? Number((userInfo as any)[4]) : 0;
  const totalBoost = userInfo ? Number((userInfo as any)[5]) : 0;
  const directDownlines = userInfo ? Number((userInfo as any)[2]) : 0;

  const currentSupply = contractStats ? Number((contractStats as any)[0]) : 0;
  const maxSupply = contractStats ? Number((contractStats as any)[1]) : 1386;

  const hasApproval = usdtAllowance ? BigInt(usdtAllowance as any) >= NODE_PRICE : false;
  const hasEnoughBalance = usdtBalance ? BigInt(usdtBalance as any) >= NODE_PRICE : false;

  const isGenesisHolder = nftBalance > 0;

  // Handle approve
  const handleApprove = async () => {
    if (!address || addresses.MockUSDT === '0x0000000000000000000000000000000000000000') {
      toast.error('MockUSDT not deployed yet');
      return;
    }
    
    setIsApproving(true);
    try {
      approveUSDT({
        address: addresses.MockUSDT as `0x${string}`,
        abi: abis.MockUSDT,
        functionName: 'approve',
        args: [addresses.GenesisNode, NODE_PRICE * BigInt(10)], // Approve 10x for convenience
      });
      toast.info('Approval transaction submitted...');
    } catch (error) {
      toast.error('Approval failed');
      setIsApproving(false);
    }
  };

  // Handle mint
  const handleMint = async () => {
    if (!address) return;
    
    setIsMinting(true);
    try {
      mintNode({
        address: addresses.GenesisNode as `0x${string}`,
        abi: abis.GenesisNode,
        functionName: 'mint',
        args: ['0x0000000000000000000000000000000000000000'], // No referrer for now
      });
      toast.info('Mint transaction submitted...');
    } catch (error) {
      toast.error('Mint failed');
      setIsMinting(false);
    }
  };

  // Handle transaction success
  if (isApproveSuccess && isApproving) {
    setIsApproving(false);
    toast.success('USDT Approved!');
    refetchAllowance();
  }

  if (isMintSuccess && isMinting) {
    setIsMinting(false);
    toast.success('Genesis Node Minted!');
    refetchUserInfo();
    refetchUsdtBalance();
  }

  if (!isConnected) {
    return (
      <GlassCard className="p-6 h-full">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">Connect wallet to view identity</p>
        </div>
      </GlassCard>
    );
  }

  if (isLoadingUserInfo) {
    return (
      <GlassCard className="p-6 h-full">
        <Skeleton className="h-8 w-48 mb-4 bg-white/5" />
        <Skeleton className="h-32 w-full bg-white/5" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/20 rounded-lg">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">IDENTITY & ACCESS</h3>
          <p className="text-xs text-gray-400">Genesis Node Membership</p>
        </div>
      </div>

      {/* Identity Status */}
      <div className="mb-6 p-4 rounded-lg bg-black/40 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Current Identity</span>
          {isGenesisHolder ? (
            <span className="flex items-center gap-2 text-primary font-mono text-sm">
              <CheckCircle className="w-4 h-4" />
              GENESIS NODE (ACTIVE)
            </span>
          ) : (
            <span className="flex items-center gap-2 text-gray-500 font-mono text-sm">
              <XCircle className="w-4 h-4" />
              VISITOR
            </span>
          )}
        </div>
        
        {isGenesisHolder && (
          <div className="text-xs text-gray-500 font-mono">
            Holding: {nftBalance} Node{nftBalance > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Boost Status */}
      <div className="mb-6 space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          PRIVILEGE BOOSTS
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border ${selfBoost > 0 ? 'bg-primary/10 border-primary/30' : 'bg-black/40 border-white/10'}`}>
            <div className="text-xs text-gray-400 mb-1">Self Boost</div>
            <div className={`text-lg font-bold font-mono ${selfBoost > 0 ? 'text-primary' : 'text-gray-500'}`}>
              +{selfBoost / 100}%
            </div>
            <div className={`text-[10px] ${selfBoost > 0 ? 'text-primary/60' : 'text-gray-600'}`}>
              {selfBoost > 0 ? '✓ ACTIVE' : '○ INACTIVE'}
            </div>
          </div>
          
          <div className={`p-3 rounded-lg border ${teamAura > 0 ? 'bg-purple-500/10 border-purple-500/30' : 'bg-black/40 border-white/10'}`}>
            <div className="text-xs text-gray-400 mb-1">Team Aura</div>
            <div className={`text-lg font-bold font-mono ${teamAura > 0 ? 'text-purple-400' : 'text-gray-500'}`}>
              +{teamAura / 100}%
            </div>
            <div className={`text-[10px] ${teamAura > 0 ? 'text-purple-400/60' : 'text-gray-600'}`}>
              {teamAura > 0 ? '✓ ACTIVE' : '○ INACTIVE'}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Total Mining Boost</span>
            <span className="text-xl font-bold text-white font-mono">+{totalBoost / 100}%</span>
          </div>
        </div>
      </div>

      {/* Network Stats */}
      <div className="mb-6 p-3 rounded-lg bg-black/40 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Your Network</span>
        </div>
        <div className="text-2xl font-bold text-white font-mono">{directDownlines}</div>
        <div className="text-xs text-gray-500">Direct Referrals</div>
      </div>

      {/* Supply Info */}
      <div className="mb-6 p-3 rounded-lg bg-black/40 border border-white/10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">Supply</span>
          <span className="text-xs text-gray-400 font-mono">{currentSupply} / {maxSupply}</span>
        </div>
        <div className="w-full bg-black/50 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-primary to-purple-500 h-2 rounded-full transition-all"
            style={{ width: `${(currentSupply / maxSupply) * 100}%` }}
          />
        </div>
      </div>

      {/* Action Button */}
      {!isGenesisHolder && (
        <div className="space-y-3">
          <div className="text-center p-3 bg-black/40 rounded-lg border border-white/10">
            <div className="text-xs text-gray-400 mb-1">Node Price</div>
            <div className="text-2xl font-bold text-primary font-mono">1,000 USDT</div>
          </div>

          {!hasEnoughBalance && addresses.MockUSDT !== '0x0000000000000000000000000000000000000000' && (
            <div className="text-xs text-red-400 text-center">
              Insufficient USDT balance. Use faucet below.
            </div>
          )}

          {!hasApproval ? (
            <Button 
              className="w-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
              onClick={handleApprove}
              disabled={isApproving || isApproveLoading || !hasEnoughBalance || addresses.MockUSDT === '0x0000000000000000000000000000000000000000'}
            >
              {isApproving || isApproveLoading ? '[ APPROVING... ]' : '[ APPROVE USDT ]'}
            </Button>
          ) : (
            <Button 
              className="w-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 font-mono"
              onClick={handleMint}
              disabled={isMinting || isMintLoading || !hasEnoughBalance}
            >
              {isMinting || isMintLoading ? '[ MINTING... ]' : '[ BUY GENESIS NODE ]'}
            </Button>
          )}
        </div>
      )}

      {isGenesisHolder && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 text-center">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="text-sm text-white font-bold">GENESIS MEMBER</div>
          <div className="text-xs text-gray-400">All privileges unlocked</div>
        </div>
      )}
    </GlassCard>
  );
}
