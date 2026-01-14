import { motion } from 'framer-motion';
import { Clock, Users, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Proposal, ProposalStatus } from '@/hooks/useDAO';

interface ProposalCardProps {
  proposal: Proposal;
  voteStats: {
    forVotes: number;
    againstVotes: number;
    abstainVotes: number;
    totalVoters: number;
    totalVotes: number;
  };
  onClick?: () => void;
}

const MIN_PARTICIPANTS = 127;

export function ProposalCard({ proposal, voteStats, onClick }: ProposalCardProps) {
  const { t } = useLanguage();

  // Calculate time remaining
  const now = Date.now();
  const timeRemaining = proposal.endAt - now;
  const daysRemaining = Math.ceil(timeRemaining / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));

  const isActive = timeRemaining > 0;

  // Status styles
  const statusConfig: Record<ProposalStatus, { color: string; icon: React.ReactNode; label: string }> = {
    active: {
      color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      icon: <Clock className="w-3 h-3" />,
      label: t('dao.status_active'),
    },
    passed: {
      color: 'text-green-400 bg-green-500/20 border-green-500/30',
      icon: <CheckCircle className="w-3 h-3" />,
      label: t('dao.status_passed'),
    },
    rejected: {
      color: 'text-red-400 bg-red-500/20 border-red-500/30',
      icon: <XCircle className="w-3 h-3" />,
      label: t('dao.status_rejected'),
    },
    invalid: {
      color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
      icon: <AlertCircle className="w-3 h-3" />,
      label: t('dao.status_invalid'),
    },
  };

  const status = statusConfig[proposal.status];

  // Calculate vote percentages
  const totalValidVotes = voteStats.forVotes + voteStats.againstVotes;
  const forPercentage = totalValidVotes > 0 ? (voteStats.forVotes / totalValidVotes) * 100 : 0;
  const againstPercentage = totalValidVotes > 0 ? (voteStats.againstVotes / totalValidVotes) * 100 : 0;

  // Shorten address
  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <GlassCard className="p-5 hover:border-primary/50 transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">{proposal.id}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono border ${status.color} flex items-center gap-1`}>
              {status.icon}
              {status.label}
            </span>
          </div>
          <span className="text-xs font-mono text-gray-500">
            {t(`dao.type_${proposal.type.replace('_', '')}`)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
          {proposal.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {proposal.description}
        </p>

        {/* Vote Progress Bar */}
        {voteStats.totalVotes > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-green-400">{t('dao.vote_for')}: {forPercentage.toFixed(1)}%</span>
              <span className="text-red-400">{t('dao.vote_against')}: {againstPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${forPercentage}%` }}
              />
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${againstPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            {/* Voters */}
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span className={voteStats.totalVoters >= MIN_PARTICIPANTS ? 'text-green-400' : ''}>
                {voteStats.totalVoters}/{MIN_PARTICIPANTS}
              </span>
            </div>

            {/* Total Votes */}
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{voteStats.totalVotes} {t('dao.votes')}</span>
            </div>
          </div>

          {/* Time / Creator */}
          <div className="flex items-center gap-2">
            {isActive ? (
              <span className="flex items-center gap-1 text-blue-400">
                <Clock className="w-3 h-3" />
                {daysRemaining > 0 ? `${daysRemaining}d` : `${hoursRemaining}h`}
              </span>
            ) : (
              <span className="font-mono">{shortenAddress(proposal.creator)}</span>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
