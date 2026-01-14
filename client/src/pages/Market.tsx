import { motion } from 'framer-motion';
import { Store } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { SyncDetector } from '@/components/SyncDetector';
import { GlitchText } from '@/components/ui/GlitchText';
import { NFTMarketplace } from '@/components/NFTMarketplace';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Market() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white overflow-hidden relative selection:bg-primary selection:text-black">
      <Navbar currentPage="market" />
      <SyncDetector />

      <div className="pt-28 px-4 pb-12">
        <div className="container mx-auto max-w-7xl space-y-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="border-b border-primary/20 pb-6"
          >
            <div className="flex items-center gap-2 text-primary/60 text-sm mb-1 font-mono">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              {t('market.terminal')}
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/20 border border-primary/30">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <div>
                <GlitchText
                  text={t('market.title')}
                  className="text-4xl md:text-5xl font-bold text-white"
                />
                <p className="text-gray-400 mt-1 max-w-2xl">
                  {t('market.description')}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Marketplace Component */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <NFTMarketplace />
          </motion.div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* How to Buy */}
            <div className="p-6 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="font-bold text-blue-400 mb-3">{t('market.how_to_buy')}</h4>
              <ol className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-mono">1.</span>
                  {t('market.buy_step_1')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-mono">2.</span>
                  {t('market.buy_step_2')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-mono">3.</span>
                  {t('market.buy_step_3')}
                </li>
              </ol>
            </div>

            {/* How to Sell */}
            <div className="p-6 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <h4 className="font-bold text-purple-400 mb-3">{t('market.how_to_sell')}</h4>
              <ol className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-mono">1.</span>
                  {t('market.sell_step_1')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-mono">2.</span>
                  {t('market.sell_step_2')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-mono">3.</span>
                  {t('market.sell_step_3')}
                </li>
              </ol>
            </div>

            {/* Node Benefits */}
            <div className="p-6 rounded-lg bg-green-500/10 border border-green-500/20">
              <h4 className="font-bold text-green-400 mb-3">{t('market.node_benefits')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  {t('market.benefit_1')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  {t('market.benefit_2')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  {t('market.benefit_3')}
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
