import { motion } from 'framer-motion';
import { Clock, Download, ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Gift, Coins, Users } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRewardHistory, FilterType, RewardType } from '@/hooks/useRewardHistory';

/**
 * RewardHistory Component
 *
 * Displays paginated reward history with filtering:
 * - Mining rewards (Harvest/Compound)
 * - Referral rewards (L1/L2/Team/Peer)
 */

// BSCScan URL for testnet
const BSCSCAN_URL = 'https://testnet.bscscan.com/tx/';

export function RewardHistory() {
  const { t } = useLanguage();
  const {
    history,
    totalRecords,
    isLoading,
    error,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    setPage,
    filter,
    setFilter,
    refetch,
    exportToCSV,
  } = useRewardHistory();

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Shorten address
  const shortenAddress = (addr: string) => {
    if (!addr) return '-';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Shorten tx hash
  const shortenTxHash = (hash: string) => {
    if (!hash) return '-';
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  // Get type label and color
  const getTypeInfo = (type: RewardType, level?: number) => {
    switch (type) {
      case 'mining_harvest':
        return { label: t('reward_history.harvest'), color: 'text-green-400', bg: 'bg-green-500/20' };
      case 'mining_compound':
        return { label: t('reward_history.compound'), color: 'text-blue-400', bg: 'bg-blue-500/20' };
      case 'referral_harvest':
        return { label: t('reward_history.referral_harvest'), color: 'text-purple-400', bg: 'bg-purple-500/20' };
      case 'referral_compound':
        return { label: t('reward_history.referral_compound'), color: 'text-orange-400', bg: 'bg-orange-500/20' };
      case 'referral':
        // Level-based referral rewards
        switch (level) {
          case 1:
            return { label: t('reward_history.l1_referral'), color: 'text-[#39FF14]', bg: 'bg-[#39FF14]/20' };
          case 2:
            return { label: t('reward_history.l2_referral'), color: 'text-cyan-400', bg: 'bg-cyan-500/20' };
          case 3:
            return { label: t('reward_history.team_bonus'), color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
          case 4:
            return { label: t('reward_history.peer_bonus'), color: 'text-pink-400', bg: 'bg-pink-500/20' };
          default:
            return { label: t('reward_history.referral'), color: 'text-purple-400', bg: 'bg-purple-500/20' };
        }
      default:
        return { label: type, color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
  };

  // Get icon for type
  const getTypeIcon = (type: RewardType) => {
    if (type.includes('mining')) {
      return <Coins className="w-4 h-4" />;
    }
    if (type.includes('referral')) {
      return <Users className="w-4 h-4" />;
    }
    return <Gift className="w-4 h-4" />;
  };

  // Filter tabs
  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('reward_history.all') },
    { key: 'mining', label: t('reward_history.mining') },
    { key: 'referral', label: t('reward_history.referral') },
  ];

  return (
    <GlassCard className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Clock className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('reward_history.title')}</h3>
            <p className="text-xs text-gray-400 font-mono">
              {totalRecords} {t('reward_history.records')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={refetch}
            variant="outline"
            size="sm"
            className="border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={exportToCSV}
            disabled={totalRecords === 0}
            variant="outline"
            size="sm"
            className="border-white/10 text-gray-400 hover:text-white hover:bg-white/10 gap-1"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('reward_history.export')}</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
              filter === tab.key
                ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/40'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && history.length === 0 && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 text-gray-500 animate-spin" />
          <p className="text-gray-400 font-mono text-sm">{t('reward_history.loading')}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && history.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 font-mono text-sm">{t('reward_history.no_records')}</p>
        </div>
      )}

      {/* History Table */}
      {history.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2 text-xs font-mono text-gray-400 uppercase tracking-wider">
                  {t('reward_history.time')}
                </th>
                <th className="text-left py-3 px-2 text-xs font-mono text-gray-400 uppercase tracking-wider">
                  {t('reward_history.type')}
                </th>
                <th className="text-right py-3 px-2 text-xs font-mono text-gray-400 uppercase tracking-wider">
                  {t('reward_history.amount')}
                </th>
                <th className="text-left py-3 px-2 text-xs font-mono text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  {t('reward_history.from')}
                </th>
                <th className="text-right py-3 px-2 text-xs font-mono text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  {t('reward_history.tx_hash')}
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, index) => {
                const typeInfo = getTypeInfo(item.type, item.level);
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-2 font-mono text-sm text-gray-300">
                      {formatDate(item.timestamp)}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${typeInfo.bg} ${typeInfo.color}`}>
                        {getTypeIcon(item.type)}
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-sm text-[#39FF14]">
                      +{parseFloat(item.amount).toFixed(4)} IVY
                    </td>
                    <td className="py-3 px-2 font-mono text-sm text-gray-400 hidden md:table-cell">
                      {item.fromUser ? shortenAddress(item.fromUser) : '-'}
                    </td>
                    <td className="py-3 px-2 text-right hidden sm:table-cell">
                      {item.txHash ? (
                        <a
                          href={`${BSCSCAN_URL}${item.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {shortenTxHash(item.txHash)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-gray-500">-</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-500 font-mono">
            {t('reward_history.page')} {currentPage} / {totalPages}
          </p>

          <div className="flex gap-2">
            <Button
              onClick={prevPage}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Page numbers (show up to 5 pages) */}
            <div className="hidden sm:flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded font-mono text-sm transition-all ${
                      currentPage === pageNum
                        ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/40'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
