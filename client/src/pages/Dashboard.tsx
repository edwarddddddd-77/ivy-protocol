import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useLocation } from 'wouter';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { GlitchText } from '@/components/ui/GlitchText';
import { MyNodes } from '@/components/MyNodes';
import { ReferralCenter } from '@/components/ReferralCenter';

export default function Dashboard() {
  const { isConnected } = useAccount();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      // Optional: Redirect to home if not connected, or show a message
      // setLocation('/');
    }
  }, [isConnected, setLocation]);

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        {/* Absolute positioned raw HTML link - guaranteed to be visible and clickable */}
        <a 
          href="/" 
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 99999,
            padding: '12px 24px',
            backgroundColor: '#39FF14',
            color: '#000',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: '14px',
            textDecoration: 'none',
            borderRadius: '4px',
            boxShadow: '0 0 20px rgba(57, 255, 20, 0.5)',
            cursor: 'pointer'
          }}
        >
          ← RETURN HOME
        </a>
        
        <GlassCard className="p-8 text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-primary mb-4">ACCESS DENIED</h2>
          <p className="text-gray-400 mb-6">
            Secure connection required. Please connect your wallet to access the command center.
          </p>
          {/* Backup button inside card */}
          <a 
            href="/"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              border: '2px solid #39FF14',
              color: '#39FF14',
              fontFamily: 'monospace',
              fontSize: '12px',
              textDecoration: 'none',
              borderRadius: '4px',
              marginTop: '10px'
            }}
          >
            [ RETURN HOME ]
          </a>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white overflow-hidden relative selection:bg-[#39FF14] selection:text-black">
      {/* Header / Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 p-6 md:p-8 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="container flex items-center justify-between">
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
              <span className="font-display font-bold text-lg md:text-xl tracking-wider text-white group-hover:text-[#39FF14] transition-colors">IVY PROTOCOL</span>
              <span className="font-mono text-[8px] md:text-[10px] text-[#39FF14] tracking-[0.2em] uppercase">Dashboard</span>
            </div>
          </motion.div>

          <motion.nav 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden md:flex items-center gap-8"
          >
            <Button 
              variant="ghost" 
              className="font-mono text-sm text-slate-400 hover:text-[#39FF14] uppercase tracking-wider mr-4"
              onClick={() => setLocation('/')}
            >
              [ HOME ]
            </Button>
            <ConnectButton />
          </motion.nav>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden z-50">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-[#39FF14]">
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
            <Button 
              variant="ghost" 
              className="font-display text-2xl text-white hover:text-[#39FF14] uppercase tracking-widest"
              onClick={() => setLocation('/')}
            >
              [ RETURN HOME ]
            </Button>
            <div className="mt-4">
              <ConnectButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-32 px-4 pb-12">
      <div className="container mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-primary/20 pb-6">
          <div>
            <div className="flex items-center gap-2 text-primary/60 text-sm mb-1 font-mono">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              COMMAND CENTER // AUTHORIZED
            </div>
            <GlitchText 
              text="OPERATOR DASHBOARD" 
              className="text-4xl md:text-5xl font-bold text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Assets */}
          <div className="lg:col-span-2 space-y-8">
            <MyNodes />
          </div>

          {/* Right Column: Stats & Referral */}
          <div className="space-y-8">
            <ReferralCenter />
            
            {/* Placeholder for future stats */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-primary">◈</span> YIELD STATUS
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-black/40 rounded border border-white/5">
                  <span className="text-gray-400 text-sm">Total Claimed</span>
                  <span className="text-primary font-mono">0.00 IVY</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-black/40 rounded border border-white/5">
                  <span className="text-gray-400 text-sm">Pending Rewards</span>
                  <span className="text-primary font-mono">0.00 IVY</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
