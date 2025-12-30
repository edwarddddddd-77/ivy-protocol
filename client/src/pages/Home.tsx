import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Activity, Cpu, Database, Zap } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [isHoveringMint, setIsHoveringMint] = useState(false);
  const [pidValue, setPidValue] = useState(1.2);

  // Simulate PID fluctuation
  useState(() => {
    const interval = setInterval(() => {
      setPidValue(prev => +(prev + (Math.random() * 0.04 - 0.02)).toFixed(3));
    }, 200);
    return () => clearInterval(interval);
  });

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white overflow-hidden relative selection:bg-[#39FF14] selection:text-black">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/images/circuit-bg.png')] opacity-20 bg-repeat bg-[length:400px_400px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950"></div>
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-slate-950 to-transparent"></div>
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
            {['Protocol', 'Governance', 'Docs', 'Community'].map((item, i) => (
              <a 
                key={item} 
                href="#" 
                className="font-mono text-sm text-slate-400 hover:text-[#39FF14] transition-colors uppercase tracking-wider relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#39FF14] group-hover:w-full transition-all duration-300"></span>
              </a>
            ))}
            <Button variant="outline" className="border-[#39FF14]/50 text-[#39FF14] hover:bg-[#39FF14] hover:text-black font-mono text-xs h-8 px-4 uppercase tracking-wider">
              Connect Wallet
            </Button>
          </motion.nav>
        </div>
      </header>

      <main className="relative z-10 container h-screen flex flex-col md:flex-row items-center justify-center md:justify-between gap-12 pt-20 md:pt-0">
        
        {/* Typography Layer (Left) */}
        <div className="flex-1 flex flex-col items-start space-y-8 max-w-2xl z-30">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-[#39FF14] font-mono text-sm tracking-widest uppercase">
              <span className="w-2 h-2 bg-[#39FF14] animate-pulse"></span>
              <span>System Online // V2.5</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-display font-bold uppercase leading-[0.9] tracking-tight text-[#E0E0E0] mix-blend-difference relative group cursor-default">
              <GlitchText text="Let Time" /> <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Be Your Ally</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 font-mono max-w-lg border-l-2 border-[#39FF14]/30 pl-4">
              The First PID-Controlled Structured Bond Protocol.
              <br />
              <span className="text-[#39FF14] text-sm opacity-80">Algorithmic Stability // Yield Optimization</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Button 
              className="relative group overflow-hidden bg-[#39FF14] border border-[#39FF14] text-black hover:scale-105 hover:shadow-[0_0_30px_#39FF14] transition-all duration-300 px-8 py-6 text-lg font-bold font-mono tracking-widest uppercase cyber-border"
              onMouseEnter={() => setIsHoveringMint(true)}
              onMouseLeave={() => setIsHoveringMint(false)}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Zap className={`w-5 h-5 fill-black ${isHoveringMint ? 'animate-bounce' : ''}`} />
                [ Initialize Mint ]
              </span>
              {/* Glitch Effect Overlay */}
              <div className={`absolute inset-0 bg-white/40 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12`}></div>
            </Button>
          </motion.div>
        </div>

        {/* Reactor Core (Center/Right) */}
        <div className="flex-1 relative flex items-center justify-center w-full max-w-xl aspect-square z-10 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 0.85 }}
            transition={{ duration: 1.2, ease: "circOut" }}
            className="relative w-full h-full flex items-center justify-center"
          >
            {/* Glow Behind */}
            <div className="absolute inset-0 bg-[#39FF14] blur-[100px] opacity-20 animate-pulse"></div>
            
            {/* Reactor Image */}
            <motion.img 
              src="/images/reactor-core.png" 
              alt="Reactor Core" 
              className="relative z-10 w-[80%] md:w-full object-contain drop-shadow-[0_0_30px_rgba(57,255,20,0.3)] mix-blend-screen [mask-image:radial-gradient(closest-side,white_65%,transparent_95%)]"
              animate={{ 
                rotate: 360,
                scale: isHoveringMint ? 0.9 : 0.85
              }}
              transition={{ 
                rotate: { duration: 60 / pidValue, repeat: Infinity, ease: "linear" },
                scale: { duration: 0.3 }
              }}
            />
            
            {/* Orbital Rings */}
            <div className="absolute inset-0 border border-[#39FF14]/20 rounded-full w-[110%] h-[110%] -top-[5%] -left-[5%] animate-[spin_20s_linear_infinite_reverse]"></div>
            <div className="absolute inset-0 border border-dashed border-[#39FF14]/30 rounded-full w-[130%] h-[130%] -top-[15%] -left-[15%] animate-[spin_40s_linear_infinite]"></div>
          </motion.div>
        </div>

        {/* Data HUD Layer (Floating Glass Cards) */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="absolute bottom-8 right-8 md:right-12 flex flex-row gap-4 z-40 items-end"
        >
          <div className="flex flex-col gap-4">
            <GlassCard label="APY" value="128%" sub="Dynamic" icon={<Activity className="w-4 h-4 text-[#39FF14]" />} glow />
            <GlassCard label="TVL" value="$5.24M" sub="Verified" icon={<Database className="w-4 h-4 text-slate-400" />} />
          </div>
          <div className="flex flex-col gap-4">
            <GlassCard label="Nodes" value="842" sub="Genesis" icon={<Cpu className="w-4 h-4 text-slate-400" />} />
            <GlassCard label="PID Status" value={`${pidValue}x`} sub="Boost Active" icon={<Zap className="w-4 h-4 text-[#39FF14]" />} glow />
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

function GlassCard({ label, value, sub, icon, glow = false }: { label: string, value: string, sub: string, icon: React.ReactNode, glow?: boolean }) {
  return (
    <motion.div 
      whileHover={{ x: -5, backgroundColor: glow ? 'rgba(57, 255, 20, 0.1)' : 'rgba(15, 23, 42, 0.6)' }}
      className={`
      relative overflow-hidden backdrop-blur-md border p-4 w-64 transition-colors duration-300
      ${glow ? 'bg-[#39FF14]/5 border-[#39FF14]/50 shadow-[0_0_15px_rgba(57,255,20,0.15)]' : 'bg-slate-900/40 border-white/10'}
    `}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-display font-bold ${glow ? 'text-[#39FF14] text-glow' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${glow ? 'bg-[#39FF14] animate-pulse' : 'bg-slate-600'}`}></span>
        {sub}
      </div>
      
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#39FF14]/50"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#39FF14]/50"></div>
    </motion.div>
  );
}
