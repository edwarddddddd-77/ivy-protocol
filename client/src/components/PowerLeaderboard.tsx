import { useReadContract } from 'wagmi';
import { GlassCard } from '@/components/ui/GlassCard';
import { Trophy, TrendingUp, Award } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

export function PowerLeaderboard() {
  const { t } = useLanguage();

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

  const totalPoolPower = totalPoolBondPower ? Number(totalPoolBondPower as any) / 1e18 : 0;

  // TODO: Get actual leaderboard data from contract events or backend API
  // For now, showing placeholder data structure
  const leaderboardData = [
    // { address: '0x1234...5678', bondPower: 50000, percentage: 25.5, rank: 1 },
    // { address: '0x8765...4321', bondPower: 30000, percentage: 15.3, rank: 2 },
    // { address: '0xabcd...efgh', bondPower: 20000, percentage: 10.2, rank: 3 },
  ];

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-400';
      case 2:
        return 'text-gray-300';
      case 3:
        return 'text-orange-400';
      default:
        return 'text-gray-500';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Award className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-400" />;
      default:
        return <span className="text-gray-500 font-mono text-sm">#{rank}</span>;
    }
  };

  return (
    <GlassCard className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Power Leaderboard</h3>
            <p className="text-xs text-gray-400 font-mono">Top miners by bond power</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Total Network Power</div>
          <div className="text-xl font-bold text-primary font-mono">
            {totalPoolPower.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      {leaderboardData.length > 0 ? (
        <div className="space-y-2">
          {leaderboardData.map((entry, index) => (
            <div
              key={entry.address}
              className={`p-3 rounded-lg border transition-colors ${
                entry.rank <= 3
                  ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
                  : 'bg-black/40 border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div>
                    <div className={`font-mono text-sm ${entry.rank <= 3 ? 'text-white font-bold' : 'text-gray-300'}`}>
                      {shortenAddress(entry.address)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.percentage.toFixed(2)}% of network
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono font-bold ${entry.rank <= 3 ? 'text-primary' : 'text-white'}`}>
                    {entry.bondPower.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Power</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-600 opacity-50" />
          <p className="text-gray-500 font-mono text-sm mb-2">No leaderboard data available yet</p>
          <p className="text-gray-600 text-xs">
            Leaderboard data will be populated from contract events or backend API
          </p>
        </div>
      )}

      {/* Coming Soon Note */}
      <div className="mt-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <div className="text-xs text-blue-400 font-mono">
          <span className="font-bold">📊 Coming Soon:</span> Real-time leaderboard powered by blockchain events
        </div>
      </div>
    </GlassCard>
  );
}
