import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, FileText, Loader2, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDAO, PROPOSAL_TYPES, ProposalType } from '@/hooks/useDAO';
import { toast } from 'sonner';

interface CreateProposalProps {
  onSuccess?: (proposalId: string) => void;
}

export function CreateProposal({ onSuccess }: CreateProposalProps) {
  const { t } = useLanguage();
  const { createProposal, canParticipate, userNodeCount } = useDAO();

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'feature_request' as ProposalType,
    title: '',
    description: '',
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error(t('dao.error_title_required'));
      return;
    }
    if (!formData.description.trim()) {
      toast.error(t('dao.error_description_required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createProposal(
        formData.type,
        formData.title.trim(),
        formData.description.trim()
      );

      if (result.success && result.proposalId) {
        toast.success(t('dao.toast_proposal_created'));
        setFormData({ type: 'feature_request', title: '', description: '' });
        setIsOpen(false);
        onSuccess?.(result.proposalId);
      } else {
        toast.error(result.error || t('dao.toast_create_failed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Create Button */}
      <Button
        onClick={() => setIsOpen(true)}
        disabled={!canParticipate}
        className="bg-primary hover:bg-primary/80 text-black font-bold gap-2"
      >
        <Plus className="w-4 h-4" />
        {t('dao.create_proposal')}
      </Button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg"
            >
              <GlassCard className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {t('dao.create_proposal')}
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Not Eligible Warning */}
                {!canParticipate && (
                  <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-yellow-400 font-bold">
                          {t('dao.not_eligible')}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {t('dao.need_node_to_create')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form */}
                <div className="space-y-4">
                  {/* Proposal Type */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      {t('dao.proposal_type')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PROPOSAL_TYPES.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setFormData({ ...formData, type: type.value })}
                          disabled={!canParticipate}
                          className={`p-3 rounded-lg border text-sm font-mono transition-all ${
                            formData.type === type.value
                              ? 'border-primary bg-primary/20 text-primary'
                              : 'border-white/10 text-gray-400 hover:border-white/30'
                          } ${!canParticipate ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {t(type.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      {t('dao.proposal_title')}
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={t('dao.title_placeholder')}
                      disabled={!canParticipate}
                      className="bg-black/30 border-white/20 text-white"
                      maxLength={100}
                    />
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {formData.title.length}/100
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      {t('dao.proposal_description')}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('dao.description_placeholder')}
                      disabled={!canParticipate}
                      rows={5}
                      maxLength={2000}
                      className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {formData.description.length}/2000
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="text-xs text-gray-400">
                      <span className="text-blue-400 font-bold">{t('dao.info')}:</span>{' '}
                      {t('dao.voting_period_info')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="outline"
                    className="flex-1 border-white/20 text-gray-400"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!canParticipate || isSubmitting}
                    className="flex-1 bg-primary hover:bg-primary/80 text-black font-bold"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t('dao.submit_proposal')
                    )}
                  </Button>
                </div>

                {/* Node Count */}
                {canParticipate && (
                  <div className="mt-4 text-center text-xs text-gray-500">
                    {t('dao.your_nodes')}: <span className="text-primary font-bold">{userNodeCount}</span>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
