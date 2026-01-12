import { useAccount, useReadContract } from 'wagmi';
import { GlassCard } from '@/components/ui/GlassCard';
import { Trophy, TrendingUp, Award, User, Users, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

export function PowerLeaderboard() {
  const { t } = useLanguage();
  const { address, isConnected } = useAccount();

  // Read total pool bond power
  const { data: totalPoolBondPower } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: 'totalPoolBondPower',
    args: [],
    query: {
      refetchInterval: 10000,
    }
  });

  // Read user's mining stats
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

  const totalPoolPower = totalPoolBondPower ? Number(totalPoolBondPower as any) / 1e18 : 0;
  const userBondPower = miningStats ? Number((miningStats as any)[0]) / 1e18 : 0;
  const userSharePercent = totalPoolPower > 0 ? (userBondPower / totalPoolPower) * 100 : 0;

  // Estimate rough rank based on power share (simplified estimation)
  const estimatedRank = userBondPower > 0
    ? Math.max(1, Math.ceil(100 / userSharePercent))
    : '-';

  const getRankBadge = (rank: number | string) => {
    if (rank === 1) return { icon: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (rank === 2) return { icon: '🥈', color: 'text-gray-300', bg: 'bg-gray-500/20' };
    if (rank === 3) return { icon: '🥉', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { icon: '🏅', color: 'text-blue-400', bg: 'bg-blue-500/20' };
  };

  const rankBadge = typeof estimatedRank === 'number' ? getRankBadge(estimatedRank) : null;

  return (
    <GlassCard className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('leaderboard.title')}</h3>
            <p className="text-xs text-gray-400 font-mono">{t('leaderboard.top_miners')}</p>
          </div>
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-green-500/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs text-gray-400">Total Network Power</span>
          </div>
          <div className="text-2xl font-bold text-primary font-mono">
            {totalPoolPower.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">{t('leaderboard.total_users')}</span>
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {totalPoolPower > 0 ? '—' : '0'}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Indexing required</div>
        </div>
      </div>

      {/* My Rank Card */}
      {isConnected && userBondPower > 0 ? (
        <div className="mb-6">
          <div className="text-xs text-gray-400 mb-2 font-mono">{t('leaderboard.my_rank')}</div>
          <div className={`p-4 rounded-lg border ${rankBadge?.bg || 'bg-black/40'} border-primary/30`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-3xl">
                  {rankBadge?.icon || '🏅'}
                </div>
                <div>
                  <div className="text-sm text-gray-400">{t('leaderboard.rank')}</div>
                  <div className={`text-2xl font-bold font-mono ${rankBadge?.color || 'text-white'}`}>
                    #{estimatedRank}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">{t('leaderboard.power')}</div>
                <div className="text-xl font-bold text-primary font-mono">
                  {userBondPower.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-500">
                  {userSharePercent.toFixed(2)}% {t('leaderboard.share')}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : isConnected ? (
        <div className="mb-6 p-4 rounded-lg bg-black/40 border border-white/10 text-center">
          <User className="w-8 h-8 mx-auto mb-2 text-gray-500" />
          <p className="text-sm text-gray-400">{t('leaderboard.no_data')}</p>
          <p className="text-xs text-gray-500 mt-1">Deposit USDT to join the leaderboard</p>
        </div>
      ) : null}

      {/* Top 10 Placeholder */}
      <div className="space-y-2">
        <div className="text-xs text-gray-400 mb-2 font-mono">Top 10</div>

        {/* Placeholder rows */}
        {[1, 2, 3, 4, 5].map((rank) => (
          <div
            key={rank}
            className={`p-3 rounded-lg border transition-colors ${
              rank <= 3
                ? 'bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border-yellow-500/20'
                : 'bg-black/20 border-white/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 text-center">
                  {rank === 1 && <span className="text-lg">🥇</span>}
                  {rank === 2 && <span className="text-lg">🥈</span>}
                  {rank === 3 && <span className="text-lg">🥉</span>}
                  {rank > 3 && <span className="text-gray-500 font-mono text-sm">#{rank}</span>}
                </div>
                <div className="w-24 h-4 bg-gray-700/50 rounded animate-pulse"></div>
              </div>
              <div className="w-16 h-4 bg-gray-700/50 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Note */}
      <div className="mt-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <div className="text-xs text-blue-400">
          <span className="font-bold">📊 Note:</span> Full leaderboard requires event indexing (The Graph / Backend API).
          Your rank is estimated based on your share of total network power.
        </div>
      </div>
    </GlassCard>
  );
}
