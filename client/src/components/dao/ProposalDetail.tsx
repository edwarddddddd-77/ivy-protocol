import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Clock, Users, CheckCircle, XCircle, AlertCircle,
  ThumbsUp, ThumbsDown, Minus, Loader2, ExternalLink, Copy, Check
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDAO, VoteOption, ProposalStatus } from '@/hooks/useDAO';
import { toast } from 'sonner';

interface ProposalDetailProps {
  proposalId: string;
  isOpen: boolean;
  onClose: () => void;
}

const MIN_PARTICIPANTS = 127;

export function ProposalDetail({ proposalId, isOpen, onClose }: ProposalDetailProps) {
  const { t } = useLanguage();
  const { getProposal, getUserVote, getVoteStats, castVote, canParticipate, userNodeCount } = useDAO();

  const [isVoting, setIsVoting] = useState(false);
  const [copied, setCopied] = useState(false);

  const proposal = getProposal(proposalId);
  const userVote = getUserVote(proposalId);
  const voteStats = getVoteStats(proposalId);

  if (!proposal) return null;

  // Calculate time
  const now = Date.now();
  const timeRemaining = proposal.endAt - now;
  const isActive = timeRemaining > 0;
  const daysRemaining = Math.ceil(timeRemaining / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));

  // Vote percentages
  const totalValidVotes = voteStats.forVotes + voteStats.againstVotes;
  const forPercentage = totalValidVotes > 0 ? (voteStats.forVotes / totalValidVotes) * 100 : 0;
  const againstPercentage = totalValidVotes > 0 ? (voteStats.againstVotes / totalValidVotes) * 100 : 0;

  // Status config
  const statusConfig: Record<ProposalStatus, { color: string; icon: React.ReactNode; label: string }> = {
    active: {
      color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      icon: <Clock className="w-4 h-4" />,
      label: t('dao.status_active'),
    },
    passed: {
      color: 'text-green-400 bg-green-500/20 border-green-500/30',
      icon: <CheckCircle className="w-4 h-4" />,
      label: t('dao.status_passed'),
    },
    rejected: {
      color: 'text-red-400 bg-red-500/20 border-red-500/30',
      icon: <XCircle className="w-4 h-4" />,
      label: t('dao.status_rejected'),
    },
    invalid: {
      color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
      icon: <AlertCircle className="w-4 h-4" />,
      label: t('dao.status_invalid'),
    },
  };

  const status = statusConfig[proposal.status];

  // Handle vote
  const handleVote = async (option: VoteOption) => {
    setIsVoting(true);
    try {
      const result = await castVote(proposalId, option);
      if (result.success) {
        toast.success(t('dao.toast_vote_success'));
      } else {
        toast.error(result.error || t('dao.toast_vote_failed'));
      }
    } finally {
      setIsVoting(false);
    }
  };

  // Copy proposal link
  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/dao?proposal=${proposalId}`);
    setCopied(true);
    toast.success(t('dao.link_copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  // Shorten address
  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-2xl my-8"
          >
            <GlassCard className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-gray-500">{proposal.id}</span>
                  <span className={`px-3 py-1 rounded text-sm font-mono border ${status.color} flex items-center gap-1`}>
                    {status.icon}
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Type Badge */}
              <div className="mb-3">
                <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 text-xs font-mono">
                  {t(`dao.type_${proposal.type.replace('_', '')}`)}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-3">{proposal.title}</h2>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <span>{t('dao.created_by')}:</span>
                  <a
                    href={`https://testnet.bscscan.com/address/${proposal.creator}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {shortenAddress(proposal.creator)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div>
                  {formatDate(proposal.createdAt)}
                </div>
              </div>

              {/* Description */}
              <div className="p-4 rounded-lg bg-black/30 border border-white/10 mb-6">
                <p className="text-gray-300 whitespace-pre-wrap">{proposal.description}</p>
              </div>

              {/* Vote Stats */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-white mb-3">{t('dao.vote_results')}</h4>

                {/* Progress Bars */}
                <div className="space-y-3">
                  {/* For */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-green-400">
                        <ThumbsUp className="w-4 h-4" />
                        {t('dao.vote_for')}
                      </span>
                      <span className="text-green-400 font-mono">
                        {voteStats.forVotes} ({forPercentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${forPercentage}%` }}
                        className="h-full bg-green-500"
                      />
                    </div>
                  </div>

                  {/* Against */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-red-400">
                        <ThumbsDown className="w-4 h-4" />
                        {t('dao.vote_against')}
                      </span>
                      <span className="text-red-400 font-mono">
                        {voteStats.againstVotes} ({againstPercentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${againstPercentage}%` }}
                        className="h-full bg-red-500"
                      />
                    </div>
                  </div>

                  {/* Abstain */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-gray-400">
                        <Minus className="w-4 h-4" />
                        {t('dao.vote_abstain')}
                      </span>
                      <span className="text-gray-400 font-mono">
                        {voteStats.abstainVotes}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Participation Stats */}
                <div className="mt-4 p-3 rounded-lg bg-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">{t('dao.participants')}:</span>
                    <span className={`font-mono ${voteStats.totalVoters >= MIN_PARTICIPANTS ? 'text-green-400' : 'text-yellow-400'}`}>
                      {voteStats.totalVoters}/{MIN_PARTICIPANTS}
                    </span>
                  </div>
                  {voteStats.totalVoters < MIN_PARTICIPANTS && (
                    <span className="text-xs text-yellow-400">
                      {t('dao.need_more_votes', { count: MIN_PARTICIPANTS - voteStats.totalVoters })}
                    </span>
                  )}
                </div>
              </div>

              {/* Voting Section */}
              {isActive && (
                <div className="border-t border-white/10 pt-6">
                  {/* Time Remaining */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-400">{t('dao.time_remaining')}:</span>
                    <span className="flex items-center gap-2 text-blue-400 font-mono">
                      <Clock className="w-4 h-4" />
                      {daysRemaining > 0 ? `${daysRemaining} ${t('dao.days')}` : `${hoursRemaining} ${t('dao.hours')}`}
                    </span>
                  </div>

                  {/* User's Vote */}
                  {userVote ? (
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
                      <div className="text-sm text-gray-400 mb-1">{t('dao.you_voted')}:</div>
                      <div className="text-lg font-bold text-primary">
                        {userVote.option === 'for' && <><ThumbsUp className="w-5 h-5 inline mr-2" />{t('dao.vote_for')}</>}
                        {userVote.option === 'against' && <><ThumbsDown className="w-5 h-5 inline mr-2" />{t('dao.vote_against')}</>}
                        {userVote.option === 'abstain' && <><Minus className="w-5 h-5 inline mr-2" />{t('dao.vote_abstain')}</>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {userVote.nodeCount} {t('dao.votes')}
                      </div>
                    </div>
                  ) : canParticipate ? (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-400 mb-2">{t('dao.cast_your_vote')}:</div>
                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          onClick={() => handleVote('for')}
                          disabled={isVoting}
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                        >
                          {isVoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                          {t('dao.vote_for')}
                        </Button>
                        <Button
                          onClick={() => handleVote('against')}
                          disabled={isVoting}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                        >
                          {isVoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
                          {t('dao.vote_against')}
                        </Button>
                        <Button
                          onClick={() => handleVote('abstain')}
                          disabled={isVoting}
                          variant="outline"
                          className="border-white/20 text-gray-400 hover:bg-white/10"
                        >
                          {isVoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minus className="w-4 h-4 mr-2" />}
                          {t('dao.vote_abstain')}
                        </Button>
                      </div>
                      <div className="text-center text-xs text-gray-500">
                        {t('dao.your_voting_power')}: <span className="text-primary font-bold">{userNodeCount}</span> {t('dao.votes')}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                      <AlertCircle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                      <div className="text-sm text-yellow-400">{t('dao.not_eligible')}</div>
                      <div className="text-xs text-gray-400 mt-1">{t('dao.need_node_to_vote')}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Closed Message */}
              {!isActive && (
                <div className="border-t border-white/10 pt-4 text-center text-sm text-gray-500">
                  {t('dao.voting_ended')}: {formatDate(proposal.endAt)}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
