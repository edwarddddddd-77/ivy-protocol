import { useAccount, useReadContracts } from 'wagmi';
import { GlassCard } from '@/components/ui/GlassCard';
import { Trophy, TrendingUp, Award, User, Users, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMemo } from 'react';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

// Known users for testnet leaderboard (will be replaced with indexer on mainnet)
const KNOWN_USERS = [
  '0x1140471923924D0dc15b6Df516c44212E9E59695',
  '0x7e2DF46BbFFCd7C61b66a46858e58bC410FA1AAE',
  '0x1f9E611B492929b25565268f426396BF7C08EB26',
];

export function PowerLeaderboard() {
  const { t } = useLanguage();
  const { address, isConnected } = useAccount();

  // Read total pool bond power and all known users' mining stats in one call
  const contracts = useMemo(() => {
    const calls: any[] = [
      {
        address: addresses.IvyCore as `0x${string}`,
        abi: abis.IvyCore,
        functionName: 'totalPoolBondPower',
        args: [],
      },
    ];

    // Add calls for each known user
    KNOWN_USERS.forEach((userAddr) => {
      calls.push({
        address: addresses.IvyCore as `0x${string}`,
        abi: abis.IvyCore,
        functionName: 'getUserMiningStats',
        args: [userAddr],
      });
    });

    return calls;
  }, []);

  const { data: results } = useReadContracts({
    contracts,
    query: {
      refetchInterval: 10000,
    },
  });

  // Parse results
  const totalPoolPower = results?.[0]?.result ? Number(results[0].result as any) / 1e18 : 0;

  // Build leaderboard data
  const leaderboardData = useMemo(() => {
    if (!results || results.length < 2) return [];

    const users: { address: string; power: number; sharePercent: number }[] = [];

    KNOWN_USERS.forEach((userAddr, index) => {
      const statsResult = results[index + 1]; // +1 because first result is totalPoolBondPower
      if (statsResult?.result) {
        const power = Number((statsResult.result as any)[0]) / 1e18;
        if (power > 0) {
          users.push({
            address: userAddr,
            power,
            sharePercent: totalPoolPower > 0 ? (power / totalPoolPower) * 100 : 0,
          });
        }
      }
    });

    // Sort by power descending
    return users.sort((a, b) => b.power - a.power);
  }, [results, totalPoolPower]);

  // Find current user's rank
  const currentUserRank = useMemo(() => {
    if (!address) return null;
    const index = leaderboardData.findIndex(
      (u) => u.address.toLowerCase() === address.toLowerCase()
    );
    return index >= 0 ? index + 1 : null;
  }, [leaderboardData, address]);

  const currentUserData = useMemo(() => {
    if (!address) return null;
    return leaderboardData.find(
      (u) => u.address.toLowerCase() === address.toLowerCase()
    );
  }, [leaderboardData, address]);

  const getRankBadge = (rank: number | string) => {
    if (rank === 1) return { icon: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (rank === 2) return { icon: '🥈', color: 'text-gray-300', bg: 'bg-gray-500/20' };
    if (rank === 3) return { icon: '🥉', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { icon: '🏅', color: 'text-blue-400', bg: 'bg-blue-500/20' };
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const rankBadge = currentUserRank ? getRankBadge(currentUserRank) : null;

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
            <span className="text-xs text-gray-400">{t('leaderboard.network_power')}</span>
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
            {leaderboardData.length}
          </div>
        </div>
      </div>

      {/* My Rank Card */}
      {isConnected && currentUserData ? (
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
                    #{currentUserRank}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">{t('leaderboard.power')}</div>
                <div className="text-xl font-bold text-primary font-mono">
                  {currentUserData.power.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-gray-500">
                  {currentUserData.sharePercent.toFixed(2)}% {t('leaderboard.share')}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : isConnected ? (
        <div className="mb-6 p-4 rounded-lg bg-black/40 border border-white/10 text-center">
          <User className="w-8 h-8 mx-auto mb-2 text-gray-500" />
          <p className="text-sm text-gray-400">{t('leaderboard.no_data')}</p>
          <p className="text-xs text-gray-500 mt-1">{t('leaderboard.deposit_to_join')}</p>
        </div>
      ) : null}

      {/* Real Leaderboard */}
      <div className="space-y-2">
        <div className="text-xs text-gray-400 mb-2 font-mono">
          Top {Math.min(leaderboardData.length, 10)}
        </div>

        {leaderboardData.length > 0 ? (
          leaderboardData.slice(0, 10).map((user, index) => {
            const rank = index + 1;
            const isCurrentUser = address?.toLowerCase() === user.address.toLowerCase();
            const badge = getRankBadge(rank);

            return (
              <div
                key={user.address}
                className={`p-3 rounded-lg border transition-colors ${
                  isCurrentUser
                    ? 'bg-gradient-to-r from-primary/20 to-green-500/20 border-primary/50'
                    : rank <= 3
                    ? 'bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border-yellow-500/20'
                    : 'bg-black/20 border-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center">
                      {rank <= 3 ? (
                        <span className="text-lg">{badge.icon}</span>
                      ) : (
                        <span className="text-gray-500 font-mono text-sm">#{rank}</span>
                      )}
                    </div>
                    <div>
                      <div className={`font-mono text-sm ${isCurrentUser ? 'text-primary font-bold' : 'text-white'}`}>
                        {formatAddress(user.address)}
                        {isCurrentUser && <span className="ml-2 text-xs text-primary">(You)</span>}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {user.sharePercent.toFixed(2)}% share
                      </div>
                    </div>
                  </div>
                  <div className={`font-mono font-bold ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-orange-400' : 'text-white'}`}>
                    {user.power.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">
            No miners yet
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="mt-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <div className="text-xs text-blue-400">
          <span className="font-bold">📊 {t('leaderboard.note_title')}:</span> {t('leaderboard.note_desc')}
        </div>
      </div>
    </GlassCard>
  );
}
