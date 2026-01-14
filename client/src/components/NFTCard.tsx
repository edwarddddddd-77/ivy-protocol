import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Tag, ShoppingCart, X, Loader2, ExternalLink } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import type { NFTItem } from '@/hooks/useNFTMarket';

interface NFTCardProps {
  nft: NFTItem;
  isOwner: boolean;
  onList?: (tokenId: number, price: string) => Promise<boolean>;
  onUnlist?: (tokenId: number) => void;
  onBuy?: (tokenId: number) => Promise<boolean>;
}

export function NFTCard({ nft, isOwner, onList, onUnlist, onBuy }: NFTCardProps) {
  const { t } = useLanguage();
  const [showListModal, setShowListModal] = useState(false);
  const [listPrice, setListPrice] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Shorten address
  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Handle list
  const handleList = async () => {
    if (!listPrice || !onList) return;

    setIsProcessing(true);
    try {
      const success = await onList(nft.tokenId, listPrice);
      if (success) {
        setShowListModal(false);
        setListPrice('');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle unlist
  const handleUnlist = () => {
    if (onUnlist) {
      onUnlist(nft.tokenId);
    }
  };

  // Handle buy
  const handleBuy = async () => {
    if (!onBuy) return;

    setIsProcessing(true);
    try {
      await onBuy(nft.tokenId);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <GlassCard className="overflow-hidden group hover:border-primary/50 transition-all duration-300">
          {/* Image Container */}
          <div className="relative aspect-square bg-gradient-to-br from-purple-900/30 to-blue-900/30 overflow-hidden">
            {/* NFT Image */}
            <img
              src="/images/genesis-node.png"
              alt={`Genesis Node #${nft.tokenId}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/logo.png';
              }}
            />

            {/* Token ID Badge */}
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
              <span className="text-xs font-mono text-white">#{nft.tokenId}</span>
            </div>

            {/* Listed Badge */}
            {nft.isListed && (
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-primary/80 backdrop-blur-sm">
                <span className="text-xs font-bold text-black">{t('market.for_sale')}</span>
              </div>
            )}

            {/* Owner Badge */}
            {isOwner && (
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-purple-500/80 backdrop-blur-sm">
                <span className="text-xs font-bold text-white">{t('market.owned')}</span>
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            {/* Title */}
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Genesis Node
              </h4>
              <span className="text-xs font-mono text-gray-400">#{nft.tokenId}</span>
            </div>

            {/* Boost Info */}
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-mono text-xs">
                +{nft.boost}% {t('market.boost')}
              </span>
            </div>

            {/* Owner */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{t('market.owner')}</span>
              <a
                href={`https://testnet.bscscan.com/address/${nft.owner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {shortenAddress(nft.owner)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Price or Actions */}
            {nft.isListed && nft.price ? (
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">{t('market.price')}</span>
                  <span className="text-xl font-bold text-primary font-mono">
                    {nft.price} USDT
                  </span>
                </div>

                {isOwner ? (
                  <Button
                    onClick={handleUnlist}
                    variant="outline"
                    className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('market.unlist')}
                  </Button>
                ) : (
                  <Button
                    onClick={handleBuy}
                    disabled={isProcessing}
                    className="w-full bg-primary hover:bg-primary/80 text-black font-bold"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4 mr-2" />
                    )}
                    {t('market.buy_now')}
                  </Button>
                )}
              </div>
            ) : isOwner ? (
              <div className="pt-2 border-t border-white/10">
                <Button
                  onClick={() => setShowListModal(true)}
                  variant="outline"
                  className="w-full border-primary/50 text-primary hover:bg-primary/20"
                >
                  <Tag className="w-4 h-4 mr-2" />
                  {t('market.list_for_sale')}
                </Button>
              </div>
            ) : null}
          </div>
        </GlassCard>
      </motion.div>

      {/* List Modal */}
      {showListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" />
                  {t('market.list_nft')}
                </h3>
                <button
                  onClick={() => setShowListModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* NFT Preview */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-black/30 mb-6">
                <img
                  src="/images/genesis-node.png"
                  alt={`Genesis Node #${nft.tokenId}`}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <div className="font-bold text-white">Genesis Node #{nft.tokenId}</div>
                  <div className="text-sm text-gray-400">+{nft.boost}% Boost</div>
                </div>
              </div>

              {/* Price Input */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">
                  {t('market.listing_price')} (USDT)
                </label>
                <Input
                  type="number"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="1000"
                  className="bg-black/30 border-white/20 text-white font-mono"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowListModal(false)}
                  variant="outline"
                  className="flex-1 border-white/20 text-gray-400"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleList}
                  disabled={!listPrice || isProcessing}
                  className="flex-1 bg-primary hover:bg-primary/80 text-black font-bold"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {t('market.confirm_list')}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </>
  );
}
