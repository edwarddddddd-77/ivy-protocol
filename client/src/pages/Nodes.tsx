import { useAccount } from 'wagmi';
import { useLocation } from 'wouter';
import { motion } from "framer-motion";
import { GlassCard } from '@/components/ui/GlassCard';
import { GlitchText } from '@/components/ui/GlitchText';
import { IdentityPanel } from '@/components/IdentityPanel';
import { ReferralCenter } from '@/components/ReferralCenter';
import { Navbar } from '@/components/Navbar';
import { MyNodes } from '@/components/MyNodes';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Nodes() {
  const { isConnected } = useAccount();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  if (!isConnected) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-white">
        <Navbar currentPage="nodes" />
        <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
          <GlassCard className="p-8 text-center max-w-md w-full">
            <h2 className="text-2xl font-bold text-primary mb-4">{t('common.access_denied')}</h2>
            <p className="text-gray-400 mb-6">
              Secure connection required. {t('common.connect_wallet')}
            </p>
            <a 
              href="/"
              className="inline-block px-6 py-3 border-2 border-primary text-primary font-mono text-sm hover:bg-primary hover:text-black transition-colors"
            >
              {t('common.return_home')}
            </a>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white overflow-hidden relative selection:bg-[#39FF14] selection:text-black">
      <Navbar currentPage="nodes" />

      <div className="pt-28 px-4 pb-12">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="border-b border-primary/20 pb-6"
          >
            <div className="flex items-center gap-2 text-primary/60 text-sm mb-1 font-mono">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              {t('nodes.console')}
            </div>
            <GlitchText 
              text={t('nodes.title')} 
              className="text-4xl md:text-5xl font-bold text-white"
            />
            <p className="text-gray-400 mt-2 max-w-2xl">
              {t('nodes.description')}
            </p>
          </motion.div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Identity Panel */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-1"
            >
              <IdentityPanel />
            </motion.div>

            {/* Right Column: My Nodes + Referral */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-2 space-y-8"
            >
              {/* My Nodes Display */}
              <MyNodes />

              {/* Referral Center */}
              <ReferralCenter />
            </motion.div>
          </div>

          {/* Node Benefits Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-primary">◈</span> {t('nodes.privileges')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="text-3xl font-bold text-primary mb-2">+10%</div>
                  <div className="text-sm text-white font-bold">{t('nodes.self_boost')}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {t('nodes.self_boost_desc')}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <div className="text-3xl font-bold text-purple-400 mb-2">+2%</div>
                  <div className="text-sm text-white font-bold">{t('nodes.team_aura')}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {t('nodes.team_aura_desc')}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="text-3xl font-bold text-blue-400 mb-2">1,386</div>
                  <div className="text-sm text-white font-bold">{t('nodes.max_supply')}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {t('nodes.max_supply_desc')}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
