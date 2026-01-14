import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, Award, Zap, Copy, Check,
  UserPlus, Activity, BarChart3, Target, ArrowUpRight,
  Coins, RefreshCw, Clock
} from "lucide-react";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { SyncDetector } from "@/components/SyncDetector";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTeamStats } from "@/hooks/useTeamStats";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "sonner";
import { PowerLeaderboard } from "@/components/PowerLeaderboard";
import { parseEther } from "viem";
import addresses from "@/contracts/addresses.json";
import abis from "@/contracts/abis.json";
export default function Team() {
  const { t } = useLanguage();
  const { address } = useAccount();
  const { summary, teamStats, directReferrals, performance, referralRewards, refetch } = useTeamStats();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [isCompounding, setIsCompounding] = useState(false);
  const [showCompoundModal, setShowCompoundModal] = useState(false);
  const [selectedBondId, setSelectedBondId] = useState<number | null>(null);

  // Read user's Bond NFT IDs (for compound functionality)
  const { data: bondIds, refetch: refetchBondIds } = useReadContract({
    address: addresses.IvyBond as `0x${string}`,
    abi: abis.IvyBond,
    functionName: 'getUserBondIds',
    args: [address],
    query: { enabled: !!address }
  });

  // Write contracts for referral rewards
  const { writeContract: harvestReferral, data: harvestHash } = useWriteContract();
  const { writeContract: compoundReferral, data: compoundHash } = useWriteContract();

  // Wait for transactions
  const { isLoading: isHarvestLoading, isSuccess: isHarvestSuccess } = useWaitForTransactionReceipt({
    hash: harvestHash,
  });
  const { isLoading: isCompoundLoading, isSuccess: isCompoundSuccess } = useWaitForTransactionReceipt({
    hash: compoundHash,
  });

  // Handle harvest referral rewards (only claimable amount)
  const handleHarvestReferral = async () => {
    if (!address) return;
    const claimableAmount = parseFloat(referralRewards?.claimable || "0");
    if (claimableAmount <= 0) {
      toast.error(t('team.no_pending_rewards'));
      return;
    }

    setIsHarvesting(true);
    try {
      harvestReferral({
        address: addresses.IvyCore as `0x${string}`,
        abi: abis.IvyCore,
        functionName: 'harvestReferralRewards',
        args: [],
      });
      toast.info(`Harvesting ${claimableAmount.toFixed(4)} IVY referral rewards...`);
    } catch (error) {
      toast.error('Harvest failed');
      setIsHarvesting(false);
    }
  };

  // Handle compound referral rewards (only claimable amount)
  const handleCompoundReferral = async () => {
    if (!address || selectedBondId === null) return;
    const claimableAmount = parseFloat(referralRewards?.claimable || "0");
    if (claimableAmount <= 0) {
      toast.error(t('team.no_pending_rewards'));
      return;
    }

    setIsCompounding(true);
    try {
      compoundReferral({
        address: addresses.IvyCore as `0x${string}`,
        abi: abis.IvyCore,
        functionName: 'compoundReferralRewards',
        args: [BigInt(selectedBondId)],
      });
      toast.info(`Compounding ${claimableAmount.toFixed(4)} IVY with +10% bonus...`);
    } catch (error) {
      toast.error('Compound failed');
      setIsCompounding(false);
    }
  };

  // Handle transaction success
  useEffect(() => {
    if (isHarvestSuccess && isHarvesting) {
      setIsHarvesting(false);
      toast.success(t('team.referral_harvest_success'));
      refetch.pendingReferral();
      refetch.summary();
    }
  }, [isHarvestSuccess, isHarvesting]);

  useEffect(() => {
    if (isCompoundSuccess && isCompounding) {
      setIsCompounding(false);
      toast.success(t('team.referral_compound_success'));
      setShowCompoundModal(false);
      setSelectedBondId(null);
      refetch.pendingReferral();
      refetch.summary();
      refetchBondIds();
    }
  }, [isCompoundSuccess, isCompounding]);

  const bondCount = bondIds ? (bondIds as any[]).length : 0;
  // Referral rewards breakdown
  const claimableAmount = parseFloat(referralRewards?.claimable || "0");
  const settlingAmount = parseFloat(referralRewards?.settling || "0");
  const totalAmount = parseFloat(referralRewards?.total || "0");

  // Copy referral link
  const handleCopyReferral = () => {
    if (address) {
      const link = `https://www.ivyprotocol.io?ref=${address}`;
      navigator.clipboard.writeText(link);
      toast.success(t('team.link_copied'));
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Copy address
  const handleCopyAddress = (addr: string, index: number) => {
    navigator.clipboard.writeText(addr);
    toast.success(t('team.address_copied'));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Shorten address
  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Format number with commas
  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white overflow-hidden relative selection:bg-[#39FF14] selection:text-black">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/images/circuit-bg.png')] opacity-20 bg-repeat bg-[length:400px_400px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950"></div>
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-slate-950 to-transparent"></div>
      </div>

      {/* Navbar */}
      <Navbar currentPage="team" />
      <SyncDetector />

      <main className="relative z-10 container mx-auto px-4 pt-28 pb-12 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#39FF14]/10 rounded-lg flex items-center justify-center border border-[#39FF14]/30">
              <Users className="w-6 h-6 text-[#39FF14]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                  {t('team.title')}
                </span>
              </h1>
              <p className="text-slate-400 font-mono text-sm mt-1">
                {t('team.subtitle')}
              </p>
            </div>
          </div>

          {/* Referral Link Card */}
          {address && (
            <Card className="bg-slate-900/50 border-[#39FF14]/30 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                    {t('team.referral_link')}
                  </p>
                  <p className="text-sm font-mono text-[#39FF14] break-all">
                    {address ? `https://www.ivyprotocol.io?ref=${address}` : 'Connect wallet to generate link'}
                  </p>
                </div>
                <Button
                  onClick={handleCopyReferral}
                  className="bg-[#39FF14] text-black hover:bg-[#39FF14]/80 font-mono text-sm gap-2"
                >
                  {copiedIndex === -1 ? (
                    <><Check className="w-4 h-4" /> {t('team.copied')}</>
                  ) : (
                    <><Copy className="w-4 h-4" /> {t('team.copy_link')}</>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {/* Direct Referrals */}
          <StatsCard
            icon={<UserPlus className="w-5 h-5" />}
            label={t('team.direct_referrals')}
            value={summary?.directReferralCount.toString() || "0"}
            color="green"
            delay={0.1}
          />

          {/* Total Team Size */}
          <StatsCard
            icon={<Users className="w-5 h-5" />}
            label={t('team.total_team')}
            value={summary?.totalTeamSize.toString() || "0"}
            subValue={t('team.up_to_levels')}
            color="blue"
            delay={0.2}
          />

          {/* Total Earned (cumulative historical, never decreases) */}
          <StatsCard
            icon={<Award className="w-5 h-5" />}
            label={t('team.total_earned')}
            value={`${formatNumber(summary?.totalReferralRewards || "0")} IVY`}
            subValue={t('team.lifetime_total')}
            color="purple"
            delay={0.3}
          />

          {/* Genesis Node Status */}
          <StatsCard
            icon={<Zap className="w-5 h-5" />}
            label={t('team.genesis_node')}
            value={summary?.hasGenesisNode ? `✅ ${t('team.active')}` : `❌ ${t('team.inactive')}`}
            subValue={summary?.hasGenesisNode ? `+10% ${t('team.boost')}` : ""}
            color={summary?.hasGenesisNode ? "green" : "gray"}
            delay={0.4}
          />
        </div>

        {/* My Referral Rewards Card (V2.1 - Split View) */}
        {address && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Card className="bg-gradient-to-r from-[#39FF14]/10 to-emerald-500/10 border-[#39FF14]/40 backdrop-blur-sm p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-[#39FF14]/20 rounded-lg flex items-center justify-center">
                  <Coins className="w-5 h-5 text-[#39FF14]" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-white">
                    {t('team.my_referral_rewards')}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {t('team.referral_rewards_desc')}
                  </p>
                </div>
              </div>

              {/* Rewards Breakdown */}
              <div className="space-y-4 mb-5">
                {/* Claimable - Can withdraw now */}
                <div className="flex items-center justify-between p-3 bg-[#39FF14]/10 rounded-lg border border-[#39FF14]/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#39FF14]"></div>
                    <span className="text-sm font-mono text-slate-300">{t('team.claimable')}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-display font-bold text-[#39FF14]">
                      {formatNumber(claimableAmount)} IVY
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{t('team.can_withdraw_now')}</div>
                  </div>
                </div>

                {/* Settling - Waiting for referrals to sync */}
                <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                    <span className="text-sm font-mono text-slate-300">{t('team.settling')}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-display font-bold text-yellow-400">
                      {formatNumber(settlingAmount)} IVY
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{t('team.referrals_mining')}</div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-700"></div>

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-slate-400">{t('team.total')}</span>
                  <div className="text-2xl font-display font-bold text-white">
                    {formatNumber(totalAmount)} IVY
                  </div>
                </div>
              </div>

              {/* Action Buttons - Only for claimable amount */}
              <div className="flex gap-3">
                <Button
                  onClick={handleHarvestReferral}
                  disabled={claimableAmount <= 0 || isHarvesting || isHarvestLoading}
                  className="flex-1 bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/40 hover:bg-[#39FF14]/30 font-mono text-sm gap-2"
                >
                  <Clock className="w-4 h-4" />
                  {isHarvesting || isHarvestLoading ? t('team.harvesting_referral') : t('team.harvest_referral')}
                </Button>
                <Button
                  onClick={() => setShowCompoundModal(true)}
                  disabled={claimableAmount <= 0 || bondCount === 0}
                  className="flex-1 bg-orange-500/20 text-orange-400 border border-orange-500/40 hover:bg-orange-500/30 font-mono text-sm gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('team.compound_referral')}
                </Button>
              </div>

              {/* Info Text */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{t('team.harvest_referral_desc')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  <span>{t('team.compound_referral_desc')}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Team Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm p-6">
            <h2 className="text-xl font-display font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#39FF14]" />
              {t('team.team_metrics')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricItem
                label={t('team.total_bond_power')}
                value={`${formatNumber(teamStats?.totalBondPower || "0")} USDT`}
                icon={<Target className="w-4 h-4" />}
              />
              <MetricItem
                label={t('team.active_members')}
                value={`${teamStats?.activeMembers || 0} / ${teamStats?.totalMembers || 0}`}
                icon={<Activity className="w-4 h-4" />}
                percentage={
                  teamStats?.totalMembers
                    ? ((teamStats.activeMembers / teamStats.totalMembers) * 100).toFixed(1)
                    : "0"
                }
                activeText={t('team.active_rate')}
              />
              <MetricItem
                label={t('team.avg_bond_power')}
                value={`${formatNumber(performance?.avgBondPower || "0")} USDT`}
                icon={<TrendingUp className="w-4 h-4" />}
              />
            </div>
          </Card>
        </motion.div>

        {/* Direct Referrals Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm p-6">
            <h2 className="text-xl font-display font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#39FF14]" />
              {t('team.direct_list')} ({directReferrals?.addresses.length || 0})
            </h2>

            {directReferrals && directReferrals.addresses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
                        {t('team.member')}
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
                        {t('team.bond_power')}
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
                        {t('team.my_rewards')}
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
                        {t('team.status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {directReferrals.addresses.map((addr, index) => {
                      const isActive = parseFloat(directReferrals.bondPowers[index]) > 0;
                      return (
                        <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-slate-300">
                                {shortenAddress(addr)}
                              </span>
                              <button
                                onClick={() => handleCopyAddress(addr, index)}
                                className="text-slate-500 hover:text-[#39FF14] transition-colors"
                              >
                                {copiedIndex === index ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-sm">
                            {formatNumber(directReferrals.bondPowers[index])} USDT
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-sm text-[#39FF14]">
                            {formatNumber(directReferrals.totalRewards[index])} IVY
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${
                              isActive
                                ? 'bg-[#39FF14]/20 text-[#39FF14]'
                                : 'bg-slate-800 text-slate-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#39FF14]' : 'bg-slate-500'}`}></span>
                              {isActive ? t('team.active') : t('team.inactive')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 font-mono text-sm">
                <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('team.no_referrals')}</p>
                <p className="text-xs mt-2">{t('team.share_link')}</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Tips Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-gradient-to-r from-[#39FF14]/10 to-transparent border-[#39FF14]/30 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#39FF14]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <ArrowUpRight className="w-5 h-5 text-[#39FF14]" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-lg">{t('team.maximize_earnings')}</h3>
                <ul className="space-y-1 text-sm text-slate-300 font-mono">
                  <li>• {t('team.reward_l1')}: <span className="text-[#39FF14]">10%</span> {t('team.reward_l1_desc')}</li>
                  <li>• {t('team.reward_l2')}: <span className="text-[#39FF14]">5%</span> {t('team.reward_l2_desc')}</li>
                  <li>• {t('team.reward_l3')}: <span className="text-[#39FF14]">2%</span> {t('team.reward_l3_desc')}</li>
                  <li>• {t('team.reward_peer')}: <span className="text-[#39FF14]">0.5%</span> {t('team.reward_peer_desc')}</li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Power Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <PowerLeaderboard />
        </motion.div>
      </main>

      {/* Compound Referral Rewards Modal */}
      {showCompoundModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-700"
          >
            <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-orange-400" />
              {t('team.compound_referral')}
            </h3>

            {/* Claimable Amount */}
            <div className="mb-4 p-4 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/30">
              <div className="text-xs text-slate-400 mb-1">{t('team.claimable')}:</div>
              <div className="text-2xl font-display font-bold text-[#39FF14]">
                {formatNumber(claimableAmount)} IVY
              </div>
            </div>

            {/* Select Bond NFT */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block font-mono">
                {t('team.select_bond_to_compound')}
              </label>
              <select
                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white font-mono"
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

            {/* Bonus Calculation */}
            {selectedBondId !== null && claimableAmount > 0 && (
              <div className="mb-4 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <div className="text-xs text-slate-400 mb-2">{t('team.compound_referral_desc')}:</div>
                <div className="font-mono text-orange-400">
                  <div>{formatNumber(claimableAmount)} IVY × 1.1 = <span className="text-lg font-bold">{formatNumber(claimableAmount * 1.1)}</span> Power</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => {
                  setShowCompoundModal(false);
                  setSelectedBondId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-orange-500/20 text-orange-400 border border-orange-500/40 hover:bg-orange-500/30"
                onClick={handleCompoundReferral}
                disabled={isCompounding || isCompoundLoading || selectedBondId === null || claimableAmount <= 0}
              >
                {isCompounding || isCompoundLoading ? t('team.compounding_referral') : t('team.compound_referral')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Stats Card Component
function StatsCard({
  icon,
  label,
  value,
  subValue,
  color,
  delay
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: 'green' | 'blue' | 'purple' | 'gray';
  delay: number;
}) {
  const colors = {
    green: 'border-[#39FF14]/30 bg-[#39FF14]/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    gray: 'border-slate-700 bg-slate-800/50',
  };

  const iconColors = {
    green: 'text-[#39FF14]',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    gray: 'text-slate-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="h-full"
    >
      <Card className={`${colors[color]} backdrop-blur-sm p-4 border h-full min-h-[140px] flex flex-col`}>
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg bg-black/30 ${iconColors[color]}`}>
            {icon}
          </div>
        </div>
        <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-2xl font-display font-bold text-white flex-grow flex items-center">
          {value}
        </p>
        <div className="h-4 mt-1">
          {subValue && (
            <p className="text-xs font-mono text-slate-500">
              {subValue}
            </p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// Metric Item Component
function MetricItem({
  label,
  value,
  icon,
  percentage,
  activeText
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  percentage?: string;
  activeText?: string;
}) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
        {icon}
        {label}
      </div>
      <p className="text-xl font-display font-bold text-white">
        {value}
      </p>
      {percentage && (
        <p className="text-xs font-mono text-[#39FF14] mt-1">
          {percentage}% {activeText || 'Active'}
        </p>
      )}
    </div>
  );
}
