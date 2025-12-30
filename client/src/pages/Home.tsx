import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Cpu, Database, Zap, Menu, X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useIvyContract } from "@/hooks/useIvyContract";
import { toast } from "sonner";
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const [isHoveringMint, setIsHoveringMint] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  
  const { dailyMintAmount, cbStatus, effectiveAlpha, ivyBalance, mintGenesisNode, address } = useIvyContract();

  // Circuit Breaker Status
  const isRedAlert = cbStatus?.isActive && cbStatus?.level === 3; // Level 3 = RED
  const pidValue = effectiveAlpha;

  const handleMint = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }
    try {
      setIsMinting(true);
      await mintGenesisNode();
      toast.success("Welcome, Commander. Genesis Node Initialized.");
    } catch (e) {
      console.error(e);
      toast.error("Mint Failed: " + (e as Error).message);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white overflow-hidden relative selection:bg-[#39FF14] selection:text-black">
      {/* Background Elements */}
      <div className={`absolute inset-0 z-0 pointer-events-none transition-colors duration-1000 ${isRedAlert ? 'bg-red-950/30' : ''}`}>
        <div className="absolute inset-0 bg-[url('/images/circuit-bg.png')] opacity-20 bg-repeat bg-[length:400px_400px]"></div>
        <div className={`absolute inset-0 bg-gradient-to-b from-transparent ${isRedAlert ? 'via-red-950/50 to-red-950' : 'via-slate-950/50 to-slate-950'}`}></div>
        <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${isRedAlert ? 'from-red-950' : 'from-slate-950'} to-transparent`}></div>
      </div>

      {/* Header / Navigation */}
      <header className="absolute top-0 left-0 w-full z-50 p-6 md:p-8">
        <div className="container flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="relative w-12 h-12 md:w-16 md:h-16 overflow-hidden rounded-lg border border-[#39FF14]/30 bg-black/50 backdrop-blur-sm">
              <img 
                src="/images/logo.png" 
                alt="Ivy Protocol Logo" 
                className="w-full h-full object-cover scale-110 mix-blend-screen"
              />
              <div className="absolute inset-0 bg-[#39FF14]/10 mix-blend-overlay"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl md:text-2xl tracking-wider text-white">IVY PROTOCOL</span>
              <span className="font-mono text-[10px] text-[#39FF14] tracking-[0.2em] uppercase">Structured Bond Layer</span>
            </div>
          </motion.div>

          <motion.nav 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden md:flex items-center gap-8"
          >
            {['Protocol', 'Governance', 'Docs', 'Community'].map((item) => (
              <a 
                key={item} 
                href="#" 
                className="font-mono text-sm text-slate-400 hover:text-[#39FF14] transition-colors uppercase tracking-wider relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#39FF14] group-hover:w-full transition-all duration-300"></span>
              </a>
            ))}
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
                  (!authenticationStatus ||
                    authenticationStatus === 'authenticated');

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
                            Connect Wallet
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
                        <div style={{ display: 'flex', gap: 12 }}>
                          <Button
                            variant="outline"
                            className="border-[#39FF14]/50 text-[#39FF14] hover:bg-[#39FF14] hover:text-black font-mono text-xs h-8 px-4 uppercase tracking-wider"
                            onClick={openAccountModal}
                          >
                            {account.displayName}
                            {account.displayBalance
                              ? ` (${account.displayBalance})`
                              : ''}
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
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
            {['Protocol', 'Governance', 'Docs', 'Community'].map((item) => (
              <a 
                key={item} 
                href="#" 
                className="font-display text-2xl text-white hover:text-[#39FF14] uppercase tracking-widest"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            <div className="mt-4">
              <ConnectButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 container min-h-screen flex flex-col md:flex-row items-center justify-center md:justify-between gap-8 md:gap-12 pt-24 pb-12 md:pt-0 md:pb-0">
        
        {/* Typography Layer (Left) */}
        <div className="flex-1 flex flex-col items-start space-y-6 md:space-y-8 max-w-2xl z-30 w-full">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-2 w-full"
          >
            <div className="flex items-center gap-2 text-[#39FF14] font-mono text-xs md:text-sm tracking-widest uppercase">
              <span className="w-2 h-2 bg-[#39FF14] animate-pulse"></span>
              <span>System Online // V2.5</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-8xl font-display font-bold uppercase leading-[0.9] tracking-tight text-[#E0E0E0] mix-blend-difference relative group cursor-default">
              <GlitchText text="Let Time" /> <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Be Your Ally</span>
            </h1>
            
            <p className="text-sm md:text-xl text-slate-400 font-mono max-w-lg border-l-2 border-[#39FF14]/30 pl-4">
              The First PID-Controlled Structured Bond Protocol.
              <br />
              <span className="text-[#39FF14] text-xs md:text-sm opacity-80">Algorithmic Stability // Yield Optimization</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Button 
              className={`relative group overflow-hidden border transition-all duration-300 px-8 py-6 text-lg font-bold font-mono tracking-widest uppercase cyber-border
                ${isRedAlert 
                  ? 'bg-red-600 border-red-600 text-white hover:shadow-[0_0_30px_#ff0000] cursor-not-allowed' 
                  : 'bg-[#39FF14] border-[#39FF14] text-black hover:scale-105 hover:shadow-[0_0_30px_#39FF14]'
                }`}
              onMouseEnter={() => setIsHoveringMint(true)}
              onMouseLeave={() => setIsHoveringMint(false)}
              onClick={handleMint}
              disabled={isRedAlert || isMinting}
            >
              <span className="relative z-10 flex items-center gap-2">
                {isRedAlert ? <AlertTriangle className="w-5 h-5" /> : <Zap className={`w-5 h-5 fill-black ${isHoveringMint ? 'animate-bounce' : ''}`} />}
                {isRedAlert ? "[ SYSTEM LOCKED ]" : isMinting ? "[ MINTING... ]" : "[ Initialize Mint ]"}
              </span>
              {/* Glitch Effect Overlay */}
              {!isRedAlert && !isMinting && <div className={`absolute inset-0 bg-white/40 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12`}></div>}
            </Button>
          </motion.div>
        </div>

        {/* Reactor Core (Center/Right) */}
        <div className="flex-1 relative flex items-center justify-center w-full max-w-xs md:max-w-xl aspect-square z-10 pointer-events-none order-first md:order-none mt-[-2rem] md:mt-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 0.85 }}
            transition={{ duration: 1.2, ease: "circOut" }}
            className="relative w-full h-full flex items-center justify-center"
          >
              {/* Glow Behind */}
            <div className={`absolute inset-0 blur-[100px] opacity-20 animate-pulse ${isRedAlert ? 'bg-red-600' : 'bg-[#39FF14]'}`}></div>
            
            {/* CSS Reactor Component */}
            <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center [perspective:1000px]">
              {/* Core Sphere - Pure CSS Construction */}
              <motion.div
                className="relative w-full h-full [transform-style:preserve-3d]"
                animate={{ rotateY: 360, rotateZ: 360 }}
                transition={{ duration: 20 / pidValue, repeat: Infinity, ease: "linear" }}
              >
                {/* Vertical Rings */}
                {[0, 45, 90, 135].map((deg) => (
                  <div
                    key={deg}
                    className={`absolute inset-0 rounded-full border-2 ${isRedAlert ? 'border-red-500/40 shadow-[0_0_15px_#ff0000]' : 'border-[#39FF14]/40 shadow-[0_0_15px_#39FF14]'}`}
                    style={{ transform: `rotateY(${deg}deg)` }}
                  ></div>
                ))}
                {/* Horizontal Rings */}
                <div className={`absolute top-[10%] left-[10%] w-[80%] h-[80%] rounded-full border [transform:rotateX(90deg)] ${isRedAlert ? 'border-red-500/20' : 'border-[#39FF14]/20'}`}></div>
                <div className={`absolute top-[25%] left-[25%] w-[50%] h-[50%] rounded-full border [transform:rotateX(90deg)] ${isRedAlert ? 'border-red-500/20' : 'border-[#39FF14]/20'}`}></div>
                
                {/* Core Energy Block */}
                <div className={`absolute inset-0 m-auto w-1/3 h-1/3 rounded-full blur-md opacity-50 animate-pulse ${isRedAlert ? 'bg-red-600' : 'bg-[#39FF14]'}`}></div>
              </motion.div>
              
              {/* External Floating Orbit */}
              <div className={`absolute inset-0 border rounded-full w-[120%] h-[120%] -top-[10%] -left-[10%] animate-[spin_10s_linear_infinite_reverse] ${isRedAlert ? 'border-red-500/20' : 'border-[#39FF14]/20'}`}></div>
            </div>
          </motion.div>
        </div>

        {/* Data HUD Layer (Floating Glass Cards) */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="relative md:absolute md:bottom-8 md:right-8 lg:right-12 flex flex-col sm:flex-row gap-4 z-40 items-stretch md:items-end w-full md:w-auto"
        >
          <div className="flex flex-row md:flex-col gap-4 w-full md:w-auto">
            <GlassCard label="Daily Mint" value={`${parseFloat(dailyMintAmount).toFixed(2)}`} sub="IVY / Day" icon={<Activity className={`w-4 h-4 ${isRedAlert ? 'text-red-500' : 'text-[#39FF14]'}`} />} glow={!isRedAlert} alert={isRedAlert} className="flex-1 md:flex-none" />
            <GlassCard label="Your Balance" value={`${parseFloat(ivyBalance).toFixed(2)}`} sub="IVY" icon={<Database className="w-4 h-4 text-slate-400" />} className="flex-1 md:flex-none" />
          </div>
          <div className="flex flex-row md:flex-col gap-4 w-full md:w-auto">
            <GlassCard label="Nodes" value="842" sub="Genesis" icon={<Cpu className="w-4 h-4 text-slate-400" />} className="flex-1 md:flex-none" />
            <GlassCard label="PID Status" value={`${pidValue.toFixed(3)}x`} sub={isRedAlert ? "CIRCUIT BREAKER" : "Boost Active"} icon={<Zap className={`w-4 h-4 ${isRedAlert ? 'text-red-500' : 'text-[#39FF14]'}`} />} glow={!isRedAlert} alert={isRedAlert} className="flex-1 md:flex-none" />
          </div>
        </motion.div>
      </main>
      
      {/* Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
    </div>
  );
}

function GlitchText({ text }: { text: string }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{text}</span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-[#39FF14] opacity-0 animate-glitch-1">{text}</span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-red-500 opacity-0 animate-glitch-2">{text}</span>
    </span>
  );
}

function GlassCard({ label, value, sub, icon, glow = false, alert = false, className = "" }: { label: string, value: string, sub: string, icon: React.ReactNode, glow?: boolean, alert?: boolean, className?: string }) {
  return (
    <motion.div 
      whileHover={{ x: -5, backgroundColor: alert ? 'rgba(255, 0, 0, 0.1)' : (glow ? 'rgba(57, 255, 20, 0.1)' : 'rgba(15, 23, 42, 0.6)') }}
      className={`
      relative overflow-hidden backdrop-blur-md border p-4 w-full md:w-64 transition-colors duration-300
      ${alert ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_15px_rgba(255,0,0,0.15)]' : (glow ? 'bg-[#39FF14]/5 border-[#39FF14]/50 shadow-[0_0_15px_rgba(57,255,20,0.15)]' : 'bg-slate-900/40 border-white/10')}
      ${className}
    `}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-display font-bold ${alert ? 'text-red-500' : (glow ? 'text-[#39FF14] text-glow' : 'text-white')}`}>
        {value}
      </div>
      <div className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${alert ? 'bg-red-500 animate-ping' : (glow ? 'bg-[#39FF14] animate-pulse' : 'bg-slate-600')}`}></span>
        {sub}
      </div>
      
      {/* Corner Accents */}
      <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${alert ? 'border-red-500/50' : 'border-[#39FF14]/50'}`}></div>
      <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${alert ? 'border-red-500/50' : 'border-[#39FF14]/50'}`}></div>
    </motion.div>
  );
}
