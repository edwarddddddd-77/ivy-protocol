import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, Zap, Info, DollarSign, Percent } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useROICalculator } from '@/hooks/useROICalculator';

/**
 * ROI Calculator Component
 *
 * Features:
 * - Input deposit amount
 * - Show estimated daily/weekly/monthly/yearly returns
 * - Display APY
 * - Show Genesis Node boost effect
 * - Quick amount buttons
 */

export function ROICalculator() {
  const { t } = useLanguage();
  const [depositAmount, setDepositAmount] = useState<number>(1000);

  const {
    dailyIVY,
    dailyUSDT,
    weeklyIVY,
    weeklyUSDT,
    monthlyIVY,
    monthlyUSDT,
    yearlyIVY,
    yearlyUSDT,
    apy,
    poolShare,
    effectivePower,
    dailyEmission,
    totalPoolPower,
    boost,
    hasGenesisNode,
    ivyPriceUSDT,
  } = useROICalculator(depositAmount);

  // Quick amount buttons
  const quickAmounts = [100, 500, 1000, 5000, 10000];

  // Format number with commas
  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setDepositAmount(Math.max(0, value));
  }, []);

  return (
    <GlassCard className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Calculator className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{t('roi.title')}</h3>
          <p className="text-xs text-gray-400 font-mono">{t('roi.subtitle')}</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="mb-6">
        <label className="text-sm text-gray-400 font-mono mb-2 block">
          {t('roi.deposit_amount')}
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="number"
            value={depositAmount || ''}
            onChange={handleInputChange}
            placeholder="0"
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-16 py-3 text-white font-mono text-lg focus:border-purple-500/50 focus:outline-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono">
            USDT
          </span>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => setDepositAmount(amount)}
              className={`px-3 py-1 rounded-lg font-mono text-sm transition-all ${
                depositAmount === amount
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              ${amount.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Genesis Node Boost Indicator */}
      {hasGenesisNode && (
        <div className="mb-6 p-3 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/30">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#39FF14]" />
            <span className="text-sm text-[#39FF14] font-mono">
              {t('roi.genesis_boost_active')}: +{boost}%
            </span>
          </div>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Daily */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
          <div className="text-xs text-gray-400 font-mono mb-1">{t('roi.daily')}</div>
          <div className="text-xl font-bold text-blue-400 font-mono">
            {formatNumber(dailyIVY)} <span className="text-sm">IVY</span>
          </div>
          <div className="text-xs text-gray-500 font-mono">
            ≈ ${formatNumber(dailyUSDT)} USDT
          </div>
        </div>

        {/* Weekly */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
          <div className="text-xs text-gray-400 font-mono mb-1">{t('roi.weekly')}</div>
          <div className="text-xl font-bold text-green-400 font-mono">
            {formatNumber(weeklyIVY)} <span className="text-sm">IVY</span>
          </div>
          <div className="text-xs text-gray-500 font-mono">
            ≈ ${formatNumber(weeklyUSDT)} USDT
          </div>
        </div>

        {/* Monthly */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="text-xs text-gray-400 font-mono mb-1">{t('roi.monthly')}</div>
          <div className="text-xl font-bold text-purple-400 font-mono">
            {formatNumber(monthlyIVY)} <span className="text-sm">IVY</span>
          </div>
          <div className="text-xs text-gray-500 font-mono">
            ≈ ${formatNumber(monthlyUSDT)} USDT
          </div>
        </div>

        {/* Yearly */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20">
          <div className="text-xs text-gray-400 font-mono mb-1">{t('roi.yearly')}</div>
          <div className="text-xl font-bold text-orange-400 font-mono">
            {formatNumber(yearlyIVY, 0)} <span className="text-sm">IVY</span>
          </div>
          <div className="text-xs text-gray-500 font-mono">
            ≈ ${formatNumber(yearlyUSDT, 0)} USDT
          </div>
        </div>
      </div>

      {/* APY Display */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-[#39FF14]/10 to-emerald-500/10 border border-[#39FF14]/30 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-[#39FF14]" />
            <span className="text-sm text-gray-400 font-mono">{t('roi.estimated_apy')}</span>
          </div>
          <div className="text-3xl font-bold text-[#39FF14] font-mono">
            {formatNumber(apy)}%
          </div>
        </div>
      </div>

      {/* Calculation Details */}
      <div className="p-4 rounded-lg bg-black/40 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-400 font-mono">{t('roi.calculation_details')}</span>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between text-gray-400">
            <span>{t('roi.mining_principal')}</span>
            <span className="text-white">{formatNumber(depositAmount * 0.5)} USDT (50%)</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>{t('roi.effective_power')}</span>
            <span className="text-white">{formatNumber(effectivePower)} USDT</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>{t('roi.pool_share')}</span>
            <span className="text-white">{formatNumber(poolShare, 4)}%</span>
          </div>
          <div className="border-t border-white/10 my-2"></div>
          <div className="flex justify-between text-gray-400">
            <span>{t('roi.daily_emission')}</span>
            <span className="text-white">{formatNumber(dailyEmission, 0)} IVY</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>{t('roi.total_pool_power')}</span>
            <span className="text-white">{formatNumber(totalPoolPower, 0)} USDT</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>{t('roi.ivy_price')}</span>
            <span className="text-white">${formatNumber(ivyPriceUSDT)} USDT</span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
        <p className="text-xs text-yellow-400/80 font-mono">
          {t('roi.disclaimer')}
        </p>
      </div>
    </GlassCard>
  );
}
