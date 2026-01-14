import { useAccount, useReadContract } from 'wagmi';
import { GlassCard } from '@/components/ui/GlassCard';
import { Trophy, User, Users, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

export function PowerLeaderboard() {
  const { t } = useLanguage();
  const { address, isConnected } = useAccount();

  // Read total pool bond power
  const { data: totalPoolPower } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: 'totalPoolBondPower',
    query: {
      refetchInterval: 10000,
    },
  });

  // Read current user's mining stats
  const { data: userStats } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: 'getUserMiningStats',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });

  // Parse values
  const totalPower = totalPoolPower ? Number(totalPoolPower as any) / 1e18 : 0;
  const myPower = userStats ? Number((userStats as any)[0]) / 1e18 : 0;
  const mySharePercent = totalPower > 0 && myPower > 0 ? (myPower / totalPower) * 100 : 0;

  return (
    <GlassCard className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-yellow-500/20 rounded-lg">
          <Trophy className="w-6 h-6 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{t('leaderboard.title')}</h3>
          <p className="text-xs text-gray-400 font-mono">{t('leaderboard.network_overview')}</p>
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
            {totalPower.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">USDT</div>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">{t('leaderboard.my_power')}</span>
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {myPower.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">USDT</div>
        </div>
      </div>

      {/* My Share */}
      {isConnected && myPower > 0 ? (
        <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🏆</div>
              <div>
                <div className="text-sm text-gray-400">{t('leaderboard.my_share')}</div>
                <div className="text-2xl font-bold text-yellow-400 font-mono">
                  {mySharePercent.toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">{t('leaderboard.of_network')}</div>
              <div className="text-sm text-gray-400 font-mono">
                {myPower.toLocaleString(undefined, { maximumFractionDigits: 0 })} / {totalPower.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>
      ) : isConnected ? (
        <div className="p-4 rounded-lg bg-black/40 border border-white/10 text-center">
          <User className="w-8 h-8 mx-auto mb-2 text-gray-500" />
          <p className="text-sm text-gray-400">{t('leaderboard.no_data')}</p>
          <p className="text-xs text-gray-500 mt-1">{t('leaderboard.deposit_to_join')}</p>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-black/40 border border-white/10 text-center">
          <User className="w-8 h-8 mx-auto mb-2 text-gray-500" />
          <p className="text-sm text-gray-400">{t('leaderboard.connect_wallet')}</p>
        </div>
      )}
    </GlassCard>
  );
}
