import { useAccount, useReadContract } from 'wagmi';
import { useLocation } from 'wouter';
import { motion } from "framer-motion";
import { GlassCard } from '@/components/ui/GlassCard';
import { GlitchText } from '@/components/ui/GlitchText';
import { TreasuryPanel } from '@/components/TreasuryPanel';
import { Navbar } from '@/components/Navbar';
import { ArrowRight, TrendingUp, Shield, Coins } from 'lucide-react';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

export default function Yield() {
  const { isConnected, address } = useAccount();
  const [, setLocation] = useLocation();

  // Read user's boost from GenesisNode
  const { data: totalBoost } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: abis.GenesisNode,
    functionName: 'getTotalBoost',
    args: [address],
    query: { enabled: !!address && isConnected }
  });

  // Read user's NFT balance
  const { data: nftBalance } = useReadContract({
    address: addresses.GenesisNode as `0x${string}`,
    abi: abis.GenesisNode,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address && isConnected }
  });

  const userBoost = totalBoost ? Number(totalBoost as any) / 100 : 0;
  const hasNode = nftBalance ? Number(nftBalance as any) > 0 : false;

  if (!isConnected) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-white">
        <Navbar currentPage="yield" />
        <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
          <GlassCard className="p-8 text-center max-w-md w-full">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">ACCESS DENIED</h2>
            <p className="text-gray-400 mb-6">
              Secure connection required. Please connect your wallet to access the Yield Terminal.
            </p>
            <a 
              href="/"
              className="inline-block px-6 py-3 border-2 border-blue-400 text-blue-400 font-mono text-sm hover:bg-blue-400 hover:text-black transition-colors"
            >
              [ RETURN HOME ]
            </a>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white overflow-hidden relative selection:bg-blue-400 selection:text-black">
      <Navbar currentPage="yield" />

      <div className="pt-28 px-4 pb-12">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="border-b border-blue-500/20 pb-6"
          >
            <div className="flex items-center gap-2 text-blue-400/60 text-sm mb-1 font-mono">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              YIELD TERMINAL // INVESTMENT LAYER
            </div>
            <GlitchText 
              text="TREASURY BONDS" 
              className="text-4xl md:text-5xl font-bold text-white"
            />
            <p className="text-gray-400 mt-2 max-w-2xl">
              Deposit USDT to earn IVY tokens. Your investment is automatically distributed across liquidity, RWA, and reserve pools.
            </p>
          </motion.div>

          {/* Boost Status Banner */}
          {hasNode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm text-white font-bold">Genesis Node Active</div>
                    <div className="text-xs text-gray-400">Your mining rewards are boosted</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-primary font-mono">+{userBoost}%</div>
              </div>
            </motion.div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Treasury Panel */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <TreasuryPanel />
            </motion.div>

            {/* Right Column: Info Cards */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Fund Flow Card */}
              <GlassCard className="p-6">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-blue-400" />
                  FUND DISTRIBUTION
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                      50%
                    </div>
                    <div>
                      <div className="text-sm text-white">Liquidity Pool</div>
                      <div className="text-xs text-gray-500">DEX Trading Pairs</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                      40%
                    </div>
                    <div>
                      <div className="text-sm text-white">RWA Wallet</div>
                      <div className="text-xs text-gray-500">Real World Assets</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 font-bold">
                      10%
                    </div>
                    <div>
                      <div className="text-sm text-white">Reserve Pool</div>
                      <div className="text-xs text-gray-500">Protocol Insurance</div>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Referral Rewards Card */}
              <GlassCard className="p-6">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  REFERRAL REWARDS
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 rounded bg-black/40">
                    <span className="text-xs text-gray-400">L1 Direct</span>
                    <span className="text-sm font-bold text-purple-400">10%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-black/40">
                    <span className="text-xs text-gray-400">L2 Indirect</span>
                    <span className="text-sm font-bold text-purple-400">5%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-black/40">
                    <span className="text-xs text-gray-400">L3+ Infinite</span>
                    <span className="text-sm font-bold text-purple-400">2%</span>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded bg-purple-500/10 border border-purple-500/20">
                  <div className="text-[10px] text-gray-400">
                    Rewards are minted from the Mining Pool, not deducted from user principal.
                  </div>
                </div>
              </GlassCard>

              {/* No Node Warning */}
              {!hasNode && (
                <GlassCard className="p-6 border-yellow-500/30 bg-yellow-500/5">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-yellow-400 font-bold">No Genesis Node</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Purchase a Genesis Node to unlock +10% mining boost and +2% team aura.
                      </div>
                      <a 
                        href="/nodes"
                        className="inline-flex items-center gap-1 mt-3 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                      >
                        Go to Node Console <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </GlassCard>
              )}
            </motion.div>
          </div>

          {/* Bottom Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-blue-400">◈</span> HOW IT WORKS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3 text-blue-400 font-bold">1</div>
                  <div className="text-sm text-white font-bold">Deposit</div>
                  <div className="text-xs text-gray-400 mt-1">Deposit USDT to create your bond</div>
                </div>
                <div className="text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3 text-blue-400 font-bold">2</div>
                  <div className="text-sm text-white font-bold">Split</div>
                  <div className="text-xs text-gray-400 mt-1">Funds distributed 50/40/10</div>
                </div>
                <div className="text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3 text-blue-400 font-bold">3</div>
                  <div className="text-sm text-white font-bold">Mine</div>
                  <div className="text-xs text-gray-400 mt-1">Earn IVY tokens daily</div>
                </div>
                <div className="text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3 text-blue-400 font-bold">4</div>
                  <div className="text-sm text-white font-bold">Claim</div>
                  <div className="text-xs text-gray-400 mt-1">Claim rewards every 24h</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
