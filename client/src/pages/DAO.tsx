import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  Vote, Users, FileText, Clock, CheckCircle, Shield,
  TrendingUp, AlertCircle
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { SyncDetector } from '@/components/SyncDetector';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlitchText } from '@/components/ui/GlitchText';
import { ProposalCard } from '@/components/dao/ProposalCard';
import { CreateProposal } from '@/components/dao/CreateProposal';
import { ProposalDetail } from '@/components/dao/ProposalDetail';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDAO } from '@/hooks/useDAO';

type TabType = 'active' | 'closed' | 'my_votes';

export default function DAO() {
  const { t } = useLanguage();
  const [location] = useLocation();
  const {
    activeProposals,
    closedProposals,
    userVotes,
    userNodeCount,
    canParticipate,
    getVoteStats,
    minParticipants,
    votingPeriodDays,
  } = useDAO();

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

  // Check for proposal ID in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proposalId = params.get('proposal');
    if (proposalId) {
      setSelectedProposalId(proposalId);
    }
  }, [location]);

  // Stats
  const totalProposals = activeProposals.length + closedProposals.length;
  const passedProposals = closedProposals.filter(p => p.status === 'passed').length;

  // Get displayed proposals based on tab
  const displayedProposals = activeTab === 'active'
    ? activeProposals
    : activeTab === 'closed'
    ? closedProposals
    : userVotes.map(v => v.proposal);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white overflow-hidden relative selection:bg-primary selection:text-black">
      <Navbar currentPage="dao" />
      <SyncDetector />

      <div className="pt-28 px-4 pb-12">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="border-b border-primary/20 pb-6"
          >
            <div className="flex items-center gap-2 text-primary/60 text-sm mb-1 font-mono">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              {t('dao.terminal')}
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/20 border border-primary/30">
                  <Vote className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <GlitchText
                    text={t('dao.title')}
                    className="text-4xl md:text-5xl font-bold text-white"
                  />
                  <p className="text-gray-400 mt-1">
                    {t('dao.description')}
                  </p>
                </div>
              </div>

              {/* Create Proposal Button */}
              <CreateProposal onSuccess={(id) => setSelectedProposalId(id)} />
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">{t('dao.total_proposals')}</div>
                  <div className="text-2xl font-bold text-white font-mono">{totalProposals}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">{t('dao.passed_proposals')}</div>
                  <div className="text-2xl font-bold text-white font-mono">{passedProposals}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">{t('dao.your_voting_power')}</div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {userNodeCount}
                    <span className="text-sm text-gray-500 ml-1">{t('dao.votes')}</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">{t('dao.active_proposals')}</div>
                  <div className="text-2xl font-bold text-white font-mono">{activeProposals.length}</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Not Eligible Warning */}
          {!canParticipate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <GlassCard className="p-4 border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <div className="text-sm text-yellow-400 font-bold">{t('dao.not_eligible')}</div>
                    <div className="text-xs text-gray-400">{t('dao.need_node_to_participate')}</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <GlassCard className="p-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`flex-1 px-4 py-3 rounded-lg font-mono text-sm transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'active'
                      ? 'bg-primary/20 text-primary'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {t('dao.tab_active')} ({activeProposals.length})
                </button>
                <button
                  onClick={() => setActiveTab('closed')}
                  className={`flex-1 px-4 py-3 rounded-lg font-mono text-sm transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'closed'
                      ? 'bg-primary/20 text-primary'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('dao.tab_closed')} ({closedProposals.length})
                </button>
                <button
                  onClick={() => setActiveTab('my_votes')}
                  className={`flex-1 px-4 py-3 rounded-lg font-mono text-sm transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'my_votes'
                      ? 'bg-primary/20 text-primary'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  {t('dao.tab_my_votes')} ({userVotes.length})
                </button>
              </div>
            </GlassCard>
          </motion.div>

          {/* Proposals List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {displayedProposals.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Vote className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">
                  {activeTab === 'active' && t('dao.no_active_proposals')}
                  {activeTab === 'closed' && t('dao.no_closed_proposals')}
                  {activeTab === 'my_votes' && t('dao.no_votes_yet')}
                </h3>
                <p className="text-gray-500 font-mono text-sm">
                  {activeTab === 'active' && t('dao.be_first_to_propose')}
                  {activeTab === 'closed' && t('dao.proposals_will_appear')}
                  {activeTab === 'my_votes' && t('dao.vote_on_proposals')}
                </p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedProposals.map((proposal, index) => (
                  <motion.div
                    key={proposal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ProposalCard
                      proposal={proposal}
                      voteStats={getVoteStats(proposal.id)}
                      onClick={() => setSelectedProposalId(proposal.id)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Voting Rules */}
            <GlassCard className="p-6">
              <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                <Vote className="w-5 h-5 text-primary" />
                {t('dao.voting_rules')}
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {t('dao.rule_1_node_1_vote')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {t('dao.rule_voting_period', { days: votingPeriodDays })}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {t('dao.rule_min_participants', { count: minParticipants })}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {t('dao.rule_majority_wins')}
                </li>
              </ul>
            </GlassCard>

            {/* How to Vote */}
            <GlassCard className="p-6">
              <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                {t('dao.how_to_vote')}
              </h4>
              <ol className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-mono">1.</span>
                  {t('dao.step_hold_node')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-mono">2.</span>
                  {t('dao.step_browse_proposals')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-mono">3.</span>
                  {t('dao.step_cast_vote')}
                </li>
              </ol>
            </GlassCard>

            {/* Proposal Types */}
            <GlassCard className="p-6">
              <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                {t('dao.proposal_types')}
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">IIP</span>
                  {t('dao.type_parameter')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">IIP</span>
                  {t('dao.type_feature')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">IIP</span>
                  {t('dao.type_partnership')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">IIP</span>
                  {t('dao.type_community')}
                </li>
              </ul>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      {/* Proposal Detail Modal */}
      {selectedProposalId && (
        <ProposalDetail
          proposalId={selectedProposalId}
          isOpen={!!selectedProposalId}
          onClose={() => setSelectedProposalId(null)}
        />
      )}
    </div>
  );
}
