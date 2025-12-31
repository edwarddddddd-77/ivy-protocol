import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useLocation } from 'wouter';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlitchText } from '@/components/ui/GlitchText';
import { MyNodes } from '@/components/MyNodes';
import { ReferralCenter } from '@/components/ReferralCenter';

export default function Dashboard() {
  const { isConnected } = useAccount();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isConnected) {
      // Optional: Redirect to home if not connected, or show a message
      // setLocation('/');
    }
  }, [isConnected, setLocation]);

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-primary mb-4">ACCESS DENIED</h2>
          <p className="text-gray-400 mb-6">
            Secure connection required. Please connect your wallet to access the command center.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
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
  );
}
