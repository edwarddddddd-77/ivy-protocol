import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Copy, Check } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export function ReferralCenter() {
  const { address } = useAccount();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const referralLink = typeof window !== 'undefined' && address
    ? `${window.location.origin}?ref=${address}`
    : t('referral.connect_to_generate');

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(t('referral.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassCard className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <span className="text-primary">◈</span> {t('referral.title')}
        </h3>
        <p className="text-xs text-gray-400">
          {t('referral.description')}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-mono text-primary uppercase tracking-wider">
          {t('referral.your_link')}
        </label>
        <div className="flex gap-2">
          <div className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-sm font-mono text-gray-300 truncate">
            {referralLink}
          </div>
          <Button 
            size="icon" 
            variant="outline" 
            className="border-primary/30 text-primary hover:bg-primary hover:text-black"
            onClick={handleCopy}
            disabled={!address}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="bg-white/5 rounded p-3 text-center">
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('referral.direct_refers')}</div>
        </div>
        <div className="bg-white/5 rounded p-3 text-center">
          <div className="text-2xl font-bold text-white">0.00</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('referral.ref_rewards')}</div>
        </div>
      </div>
    </GlassCard>
  );
}
