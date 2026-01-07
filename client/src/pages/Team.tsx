import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, Award, Zap, Copy, Check,
  UserPlus, Activity, BarChart3, Target, ArrowUpRight
} from "lucide-react";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTeamStats } from "@/hooks/useTeamStats";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { useReferral } from "@/contexts/ReferralContext";

export default function Team() {
  const { t } = useLanguage();
  const { address } = useAccount();
  const { summary, teamStats, directReferrals, performance } = useTeamStats();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { referralLink } = useReferral();

  // Copy referral link
  const handleCopyReferral = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied!");
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Copy address
  const handleCopyAddress = (addr: string, index: number) => {
    navigator.clipboard.writeText(addr);
    toast.success("Address copied!");
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
                  Team Performance
                </span>
              </h1>
              <p className="text-slate-400 font-mono text-sm mt-1">
                Track your referral network and earnings
              </p>
            </div>
          </div>

          {/* Referral Link Card */}
          {address && (
            <Card className="bg-slate-900/50 border-[#39FF14]/30 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Your Referral Link
                  </p>
                  <p className="text-sm font-mono text-[#39FF14] break-all">
                    {referralLink || `${window.location.origin}/?ref=${address}`}
                  </p>
                </div>
                <Button
                  onClick={handleCopyReferral}
                  className="bg-[#39FF14] text-black hover:bg-[#39FF14]/80 font-mono text-sm gap-2"
                >
                  {copiedIndex === -1 ? (
                    <><Check className="w-4 h-4" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy Link</>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Direct Referrals */}
          <StatsCard
            icon={<UserPlus className="w-5 h-5" />}
            label="Direct Referrals"
            value={summary?.directReferralCount.toString() || "0"}
            color="green"
            delay={0.1}
          />

          {/* Total Team Size */}
          <StatsCard
            icon={<Users className="w-5 h-5" />}
            label="Total Team Size"
            value={summary?.totalTeamSize.toString() || "0"}
            subValue="(up to 20 levels)"
            color="blue"
            delay={0.2}
          />

          {/* Total Rewards */}
          <StatsCard
            icon={<Award className="w-5 h-5" />}
            label="Total Rewards"
            value={`${formatNumber(summary?.totalReferralRewards || "0")} IVY`}
            color="purple"
            delay={0.3}
          />

          {/* Genesis Node Status */}
          <StatsCard
            icon={<Zap className="w-5 h-5" />}
            label="Genesis Node"
            value={summary?.hasGenesisNode ? "✅ Active" : "❌ Inactive"}
            subValue={summary?.hasGenesisNode ? "+10% Boost" : ""}
            color={summary?.hasGenesisNode ? "green" : "gray"}
            delay={0.4}
          />
        </div>

        {/* Team Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm p-6">
            <h2 className="text-xl font-display font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#39FF14]" />
              Team Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricItem
                label="Total Bond Power"
                value={`${formatNumber(teamStats?.totalBondPower || "0")} USDT`}
                icon={<Target className="w-4 h-4" />}
              />
              <MetricItem
                label="Active Members"
                value={`${teamStats?.activeMembers || 0} / ${teamStats?.totalMembers || 0}`}
                icon={<Activity className="w-4 h-4" />}
                percentage={
                  teamStats?.totalMembers
                    ? ((teamStats.activeMembers / teamStats.totalMembers) * 100).toFixed(1)
                    : "0"
                }
              />
              <MetricItem
                label="Avg Bond Power"
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
              Direct Referrals ({directReferrals?.addresses.length || 0})
            </h2>

            {directReferrals && directReferrals.addresses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
                        Bond Power
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
                        My Rewards
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
                        Status
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
                              {isActive ? 'Active' : 'Inactive'}
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
                <p>No direct referrals yet</p>
                <p className="text-xs mt-2">Share your referral link to get started</p>
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
                <h3 className="font-display font-bold text-lg">Maximize Your Earnings</h3>
                <ul className="space-y-1 text-sm text-slate-300 font-mono">
                  <li>• L1 Direct Referrals: <span className="text-[#39FF14]">10%</span> of their rewards</li>
                  <li>• L2 Indirect Referrals: <span className="text-[#39FF14]">5%</span> of their rewards</li>
                  <li>• Team Bonus (GenesisNode): <span className="text-[#39FF14]">2%</span> from entire network</li>
                  <li>• Peer Bonus: <span className="text-[#39FF14]">0.5%</span> from neighboring nodes</li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>
      </main>
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
    >
      <Card className={`${colors[color]} backdrop-blur-sm p-4 border`}>
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg bg-black/30 ${iconColors[color]}`}>
            {icon}
          </div>
        </div>
        <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-2xl font-display font-bold text-white">
          {value}
        </p>
        {subValue && (
          <p className="text-xs font-mono text-slate-500 mt-1">
            {subValue}
          </p>
        )}
      </Card>
    </motion.div>
  );
}

// Metric Item Component
function MetricItem({
  label,
  value,
  icon,
  percentage
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  percentage?: string;
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
          {percentage}% Active
        </p>
      )}
    </div>
  );
}
