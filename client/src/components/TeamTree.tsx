import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, ChevronRight, ChevronDown, Users, Coins,
  Award, RefreshCw, Expand, Minimize2, Copy, Check, Loader2
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamTree, TreeNode } from '@/hooks/useTeamTree';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

/**
 * Team Tree Component
 *
 * Features:
 * - Visual tree representation of referral network
 * - Expandable/collapsible nodes
 * - Show address, bond power, rewards for each node
 * - Level badges (L1, L2, L3)
 * - Copy address to clipboard
 */

export function TeamTree() {
  const { t } = useLanguage();
  const { address, isConnected } = useAccount();
  const {
    tree,
    stats,
    isLoading,
    fetchRootReferrals,
    toggleExpand,
    collapseAll,
    expandAllL1,
  } = useTeamTree();

  // Fetch on mount
  useEffect(() => {
    if (isConnected && address) {
      fetchRootReferrals();
    }
  }, [isConnected, address, fetchRootReferrals]);

  if (!isConnected) {
    return null;
  }

  return (
    <GlassCard className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <GitBranch className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('team_tree.title')}</h3>
            <p className="text-xs text-gray-400 font-mono">{t('team_tree.subtitle')}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={fetchRootReferrals}
            variant="outline"
            size="sm"
            className="border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {tree.length > 0 && (
            <>
              <Button
                onClick={expandAllL1}
                variant="outline"
                size="sm"
                className="border-white/10 text-gray-400 hover:text-white hover:bg-white/10 gap-1"
              >
                <Expand className="w-4 h-4" />
                <span className="hidden sm:inline">{t('team_tree.expand_all')}</span>
              </Button>
              <Button
                onClick={collapseAll}
                variant="outline"
                size="sm"
                className="border-white/10 text-gray-400 hover:text-white hover:bg-white/10 gap-1"
              >
                <Minimize2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t('team_tree.collapse_all')}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400 font-mono">{t('team_tree.l1_count')}</span>
          </div>
          <div className="text-xl font-bold text-purple-400 font-mono">{stats.l1Count}</div>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400 font-mono">{t('team_tree.total_power')}</span>
          </div>
          <div className="text-xl font-bold text-blue-400 font-mono">{stats.totalBondPower}</div>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400 font-mono">{t('team_tree.total_rewards')}</span>
          </div>
          <div className="text-xl font-bold text-green-400 font-mono">{stats.totalRewards}</div>
        </div>
      </div>

      {/* Tree View */}
      <div className="border border-white/10 rounded-lg bg-black/20 p-4 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            <span className="ml-2 text-gray-400 font-mono">{t('team_tree.loading')}</span>
          </div>
        ) : tree.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-mono">{t('team_tree.no_referrals')}</p>
            <p className="text-xs text-gray-600 font-mono mt-1">{t('team_tree.invite_hint')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map((node) => (
              <TreeNodeItem
                key={node.address}
                node={node}
                onToggle={toggleExpand}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono text-gray-500">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">L1</span>
          <span>{t('team_tree.direct_referral')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">L2</span>
          <span>{t('team_tree.indirect_referral')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400">L3+</span>
          <span>{t('team_tree.extended_team')}</span>
        </div>
      </div>
    </GlassCard>
  );
}

// Tree Node Component
function TreeNodeItem({
  node,
  onToggle,
}: {
  node: TreeNode;
  onToggle: (address: string) => void;
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Level badge color
  const levelColors = {
    1: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    2: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    3: 'bg-green-500/20 text-green-400 border-green-500/40',
  };

  const levelColor = levelColors[node.level as keyof typeof levelColors] || levelColors[3];

  // Shorten address
  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Copy address
  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(node.address);
    setCopied(true);
    toast.success(t('team.address_copied'));
    setTimeout(() => setCopied(false), 2000);
  }, [node.address, t]);

  // Format numbers
  const formatNumber = (num: string) => {
    const n = parseFloat(num);
    if (n === 0) return '0';
    if (n < 0.01) return '<0.01';
    return n.toFixed(2);
  };

  const hasChildren = node.childCount !== undefined ? node.childCount > 0 : parseFloat(node.bondPower) > 0;

  return (
    <div className="select-none">
      {/* Node Row */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`
          flex items-center gap-2 p-2 rounded-lg cursor-pointer
          hover:bg-white/5 transition-colors
          ${node.level > 1 ? `ml-${Math.min(node.level * 4, 12)}` : ''}
        `}
        style={{ marginLeft: `${(node.level - 1) * 24}px` }}
        onClick={() => onToggle(node.address)}
      >
        {/* Expand/Collapse Icon */}
        <div className="w-5 h-5 flex items-center justify-center">
          {node.isLoading ? (
            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
          ) : hasChildren ? (
            node.isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )
          ) : (
            <div className="w-2 h-2 rounded-full bg-gray-600" />
          )}
        </div>

        {/* Level Badge */}
        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${levelColor}`}>
          L{node.level}
        </span>

        {/* Address */}
        <span className="font-mono text-sm text-white flex-1">
          {shortenAddress(node.address)}
        </span>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-white/10 transition-colors"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3 text-gray-500" />
          )}
        </button>

        {/* Bond Power */}
        <div className="flex items-center gap-1 text-xs font-mono">
          <Coins className="w-3 h-3 text-blue-400" />
          <span className="text-blue-400">{formatNumber(node.bondPower)}</span>
        </div>

        {/* Rewards */}
        <div className="flex items-center gap-1 text-xs font-mono">
          <Award className="w-3 h-3 text-green-400" />
          <span className="text-green-400">{formatNumber(node.totalRewards)}</span>
        </div>

        {/* Child Count */}
        {node.childCount !== undefined && node.childCount > 0 && (
          <span className="px-2 py-0.5 rounded bg-white/10 text-gray-400 text-xs font-mono">
            {node.childCount}
          </span>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {node.isExpanded && node.children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.address}
                node={child}
                onToggle={onToggle}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
