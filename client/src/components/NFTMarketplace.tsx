import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Store, Grid3X3, List, Search, RefreshCw, Loader2,
  TrendingUp, Users, Coins, Shield
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NFTCard } from '@/components/NFTCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNFTMarket } from '@/hooks/useNFTMarket';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'list';
type FilterTab = 'all' | 'listed' | 'my_nfts';

export function NFTMarketplace() {
  const { t } = useLanguage();
  const {
    allNFTs,
    myNFTs,
    listedNFTs,
    contractStats,
    isLoading,
    isConnected,
    fetchAllNFTs,
    listNFT,
    unlistNFT,
    buyNFT,
  } = useNFTMarket();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered NFTs based on tab and search
  const filteredNFTs = useMemo(() => {
    let nfts = [];

    switch (filterTab) {
      case 'listed':
        nfts = listedNFTs;
        break;
      case 'my_nfts':
        nfts = myNFTs;
        break;
      default:
        nfts = allNFTs;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      nfts = nfts.filter(
        (nft) =>
          nft.tokenId.toString().includes(query) ||
          nft.owner.toLowerCase().includes(query)
      );
    }

    return nfts;
  }, [allNFTs, listedNFTs, myNFTs, filterTab, searchQuery]);

  // Handle list NFT
  const handleList = async (tokenId: number, price: string): Promise<boolean> => {
    const success = await listNFT(tokenId, price);
    if (success) {
      toast.success(t('market.toast_listed'));
    } else {
      toast.error(t('market.toast_list_failed'));
    }
    return success;
  };

  // Handle unlist NFT
  const handleUnlist = (tokenId: number) => {
    unlistNFT(tokenId);
    toast.success(t('market.toast_unlisted'));
  };

  // Handle buy NFT
  const handleBuy = async (tokenId: number): Promise<boolean> => {
    const success = await buyNFT(tokenId);
    if (success) {
      toast.success(t('market.toast_bought'));
    } else {
      toast.error(t('market.toast_buy_failed'));
    }
    return success;
  };

  // Check if user owns NFT
  const isOwner = (ownerAddress: string): boolean => {
    if (!isConnected) return false;
    return myNFTs.some(
      (nft) => nft.owner.toLowerCase() === ownerAddress.toLowerCase()
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Coins className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">{t('market.total_supply')}</div>
              <div className="text-xl font-bold text-white font-mono">
                {contractStats.currentSupply}/{contractStats.maxSupply}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Store className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">{t('market.listed_count')}</div>
              <div className="text-xl font-bold text-white font-mono">
                {listedNFTs.length}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">{t('market.mint_price')}</div>
              <div className="text-xl font-bold text-white font-mono">
                {contractStats.price} USDT
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">{t('market.my_holdings')}</div>
              <div className="text-xl font-bold text-white font-mono">
                {myNFTs.length}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Controls */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${
                filterTab === 'all'
                  ? 'bg-primary/20 text-primary'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('market.tab_all')} ({allNFTs.length})
            </button>
            <button
              onClick={() => setFilterTab('listed')}
              className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${
                filterTab === 'listed'
                  ? 'bg-primary/20 text-primary'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('market.tab_listed')} ({listedNFTs.length})
            </button>
            {isConnected && (
              <button
                onClick={() => setFilterTab('my_nfts')}
                className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${
                  filterTab === 'my_nfts'
                    ? 'bg-primary/20 text-primary'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {t('market.tab_my_nfts')} ({myNFTs.length})
              </button>
            )}
          </div>

          {/* Search & View Mode */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('market.search_placeholder')}
                className="pl-10 bg-black/30 border-white/10 text-white"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <Button
              onClick={fetchAllNFTs}
              variant="outline"
              size="icon"
              className="border-white/10 text-gray-400 hover:text-white"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* NFT Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-gray-400 font-mono">{t('market.loading')}</span>
        </div>
      ) : filteredNFTs.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">{t('market.no_nfts')}</h3>
          <p className="text-gray-500 font-mono text-sm">
            {filterTab === 'my_nfts'
              ? t('market.no_owned_nfts')
              : filterTab === 'listed'
              ? t('market.no_listed_nfts')
              : t('market.no_nfts_found')}
          </p>
        </GlassCard>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-4'
          }
        >
          {filteredNFTs.map((nft, index) => (
            <motion.div
              key={nft.tokenId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <NFTCard
                nft={nft}
                isOwner={isOwner(nft.owner)}
                onList={handleList}
                onUnlist={handleUnlist}
                onBuy={handleBuy}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
