import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Copy, Check, Users, Coins, Clock, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

export function ReferralCenter() {
  const { address, isConnected } = useAccount();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Read user's Genesis Node info (includes directReferralCount)
  const { data: userInfo } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: abis.GenesisNode,
    functionName: 'getUserInfo',
    args: [address],
    query: { 
      enabled: !!address && isConnected,
      refetchInterval: 10000, // Refresh every 10 seconds
    }
  });

  // Read user's mining stats (includes referral earnings)
  const { data: miningStats } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: 'getUserMiningStats',
    args: [address],
    query: { 
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    }
  });

  // Parse data
  const directReferrals = userInfo ? Number((userInfo as any)[2]) : 0;
  const referralEarnings = miningStats ? Number((miningStats as any)[2]) / 1e18 : 0;
  const pendingReward = miningStats ? Number((miningStats as any)[0]) / 1e18 : 0;

  // Calculate estimated pending referral rewards
  // This is an approximation based on the user's pending rewards
  // In reality, this would need to aggregate from all downlines
  const estimatedPendingReferralRewards = directReferrals > 0 ? pendingReward * 0.1 * directReferrals : 0;

  const referralLink = typeof window !== 'undefined' && address
    ? `https://www.ivyprotocol.io?ref=${address}`
    : t('referral.connect_to_generate');

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(t('referral.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassCard className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <span className="text-primary">◈</span> {t('referral.title')}
        </h3>
        <p className="text-xs text-gray-400">
          {t('referral.description')}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-mono text-primary uppercase tracking-wider">
          {t('referral.your_link')}
        </label>
        <div className="flex gap-2">
          <div className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-sm font-mono text-gray-300 truncate">
            {referralLink}
          </div>
          <Button 
            size="icon" 
            variant="outline" 
            className="border-primary/30 text-primary hover:bg-primary hover:text-black"
            onClick={handleCopy}
            disabled={!address}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        {/* Direct Referrals - Now reads from chain */}
        <div className="bg-white/5 rounded p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-3 h-3 text-primary" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{directReferrals}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('referral.direct_refers')}</div>
        </div>
        
        {/* Claimed Referral Rewards */}
        <div className="bg-white/5 rounded p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Coins className="w-3 h-3 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {referralEarnings.toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('referral.ref_rewards')}</div>
        </div>
      </div>

      {/* Pending Referral Rewards - NEW SECTION */}
      {directReferrals > 0 && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">{t('referral.pending_rewards') || 'Pending Rewards'}</span>
            </div>
            <div className="px-2 py-0.5 bg-yellow-500/20 rounded text-[10px] text-yellow-400 font-mono">
              ACCUMULATING
            </div>
          </div>
          <div className="text-2xl font-bold text-yellow-400 font-mono">
            ~{estimatedPendingReferralRewards.toFixed(2)} IVY
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            Est. from {directReferrals} direct referral{directReferrals > 1 ? 's' : ''} (10% of their mining)
          </div>
        </div>
      )}

      {/* Referral Tiers Info */}
      <div className="p-3 rounded-lg bg-black/40 border border-white/10">
        <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {t('referral.reward_tiers') || 'Reward Tiers'}
        </div>
        <div className="space-y-1 text-[10px] font-mono">
          <div className="flex justify-between">
            <span className="text-gray-500">L1 (Direct)</span>
            <span className="text-primary">10% of mining</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">L2 (Indirect)</span>
            <span className="text-purple-400">5% of mining</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">L3+ (Infinite)</span>
            <span className="text-blue-400">2% differential</span>
          </div>
        </div>
      </div>

      {/* No Referrals Message */}
      {isConnected && directReferrals === 0 && (
        <div className="text-center p-3 bg-black/20 rounded-lg border border-dashed border-white/10">
          <div className="text-gray-500 text-xs">
            Share your referral link to start earning commissions!
          </div>
        </div>
      )}
    </GlassCard>
  );
}
