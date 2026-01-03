import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useLanguage } from '@/contexts/LanguageContext';
import { FaucetModal } from '@/components/FaucetModal';

interface NavbarProps {
  currentPage?: 'home' | 'nodes' | 'yield';
}

export function Navbar({ currentPage }: NavbarProps) {
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const navItems = [
    { key: 'protocol', label: t('nav.protocol'), path: '/', page: 'home' as const },
    { key: 'nodes', label: t('nav.nodes'), path: '/nodes', page: 'nodes' as const },
    { key: 'yield', label: t('nav.yield'), path: '/yield', page: 'yield' as const },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 p-4 md:p-6 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="container flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setLocation('/')}
          >
            <div className="relative w-10 h-10 md:w-12 md:h-12 overflow-hidden rounded-lg border border-[#39FF14]/30 bg-black/50 backdrop-blur-sm group-hover:border-[#39FF14] transition-colors">
              <img 
                src="/images/logo.png" 
                alt="Ivy Protocol Logo" 
                className="w-full h-full object-cover scale-110 mix-blend-screen"
              />
              <div className="absolute inset-0 bg-[#39FF14]/10 mix-blend-overlay"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg md:text-xl tracking-wider text-white group-hover:text-[#39FF14] transition-colors">
                IVY PROTOCOL
              </span>
              <span className="font-mono text-[8px] md:text-[10px] text-[#39FF14] tracking-[0.2em] uppercase">
                Structured Bond Layer
              </span>
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <motion.nav 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden md:flex items-center gap-6"
          >
            {/* Nav Links */}
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setLocation(item.path)}
                className={`font-mono text-sm uppercase tracking-wider relative group transition-colors ${
                  currentPage === item.page 
                    ? 'text-[#39FF14]' 
                    : 'text-slate-400 hover:text-[#39FF14]'
                }`}
              >
                {item.label}
                <span className={`absolute -bottom-1 left-0 h-[2px] bg-[#39FF14] transition-all duration-300 ${
                  currentPage === item.page ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </button>
            ))}

            {/* Divider */}
            <div className="w-px h-6 bg-white/10"></div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                  language === 'en' 
                    ? 'bg-[#39FF14]/20 text-[#39FF14]' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('zh')}
                className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                  language === 'zh' 
                    ? 'bg-[#39FF14]/20 text-[#39FF14]' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                繁
              </button>
            </div>

            {/* Faucet Button - ALWAYS VISIBLE (硬编码强制显示) */}
            <Button
              variant="outline"
              size="sm"
              className="border-yellow-500 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/30 font-mono text-xs gap-2 animate-pulse"
              onClick={() => setIsFaucetOpen(true)}
            >
              <Droplets className="w-3 h-3" />
              {t('nav.faucet')}
            </Button>

            {/* Connect Wallet */}
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus || authenticationStatus === 'authenticated');

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <Button 
                            variant="outline" 
                            className="border-[#39FF14]/50 text-[#39FF14] hover:bg-[#39FF14] hover:text-black font-mono text-xs h-8 px-4 uppercase tracking-wider"
                            onClick={openConnectModal}
                          >
                            {t('nav.connect')}
                          </Button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <Button 
                            variant="destructive"
                            className="font-mono text-xs h-8 px-4 uppercase tracking-wider"
                            onClick={openChainModal}
                          >
                            Wrong network
                          </Button>
                        );
                      }

                      return (
                        <Button
                          variant="outline"
                          className="border-[#39FF14]/50 text-[#39FF14] hover:bg-[#39FF14] hover:text-black font-mono text-xs h-8 px-4 uppercase tracking-wider"
                          onClick={openAccountModal}
                        >
                          {account.displayName}
                        </Button>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </motion.nav>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-3">
            {/* Mobile Faucet - ALWAYS VISIBLE */}
            <Button
              variant="ghost"
              size="icon"
              className="text-yellow-400 animate-pulse"
              onClick={() => setIsFaucetOpen(true)}
            >
              <Droplets className="w-5 h-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="text-[#39FF14]"
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 md:hidden"
          >
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setLocation(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className={`font-display text-2xl uppercase tracking-widest ${
                  currentPage === item.page ? 'text-[#39FF14]' : 'text-white hover:text-[#39FF14]'
                }`}
              >
                {item.label}
              </button>
            ))}

            {/* Mobile Faucet Button */}
            <Button
              variant="outline"
              className="border-yellow-500 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/30 font-mono text-sm gap-2"
              onClick={() => {
                setIsFaucetOpen(true);
                setIsMobileMenuOpen(false);
              }}
            >
              <Droplets className="w-4 h-4" />
              {t('nav.faucet')}
            </Button>
            
            {/* Mobile Language Switcher */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 text-sm font-mono rounded border ${
                  language === 'en' 
                    ? 'border-[#39FF14] text-[#39FF14]' 
                    : 'border-white/20 text-gray-400'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('zh')}
                className={`px-4 py-2 text-sm font-mono rounded border ${
                  language === 'zh' 
                    ? 'border-[#39FF14] text-[#39FF14]' 
                    : 'border-white/20 text-gray-400'
                }`}
              >
                繁體中文
              </button>
            </div>

            <div className="mt-4">
              <ConnectButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Faucet Modal */}
      <FaucetModal isOpen={isFaucetOpen} onClose={() => setIsFaucetOpen(false)} />
    </>
  );
}
