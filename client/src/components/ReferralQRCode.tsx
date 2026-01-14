import { useRef, useCallback, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, QrCode, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

/**
 * ReferralQRCode Component
 *
 * Features:
 * - Generate QR code for referral link
 * - Download as PNG image
 * - Copy link to clipboard
 * - Share via Web Share API (mobile)
 * - Modal view for larger QR code
 */

interface ReferralQRCodeProps {
  compact?: boolean; // Compact mode for inline display
}

export function ReferralQRCode({ compact = false }: ReferralQRCodeProps) {
  const { t } = useLanguage();
  const { address, isConnected } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate referral link
  const referralLink = address
    ? `https://www.ivyprotocol.io?ref=${address}`
    : '';

  // Copy link to clipboard
  const handleCopy = useCallback(() => {
    if (!referralLink) return;

    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(t('qrcode.link_copied'));
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink, t]);

  // Download QR code as PNG
  const handleDownload = useCallback(() => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (with padding for branding)
    const size = 400;
    const padding = 40;
    canvas.width = size + padding * 2;
    canvas.height = size + padding * 2 + 60; // Extra space for text

    // Fill background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = '#39FF14';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // Draw QR code
      ctx.drawImage(img, padding, padding, size, size);

      // Draw title
      ctx.fillStyle = '#39FF14';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('IVY PROTOCOL', canvas.width / 2, size + padding + 35);

      // Draw subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText('Scan to join my network', canvas.width / 2, size + padding + 55);

      // Download
      const link = document.createElement('a');
      link.download = `ivy-referral-${address?.slice(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      URL.revokeObjectURL(svgUrl);
      toast.success(t('qrcode.download_success'));
    };
    img.src = svgUrl;
  }, [address, t]);

  // Share via Web Share API
  const handleShare = useCallback(async () => {
    if (!referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'IVY Protocol Referral',
          text: t('qrcode.share_text'),
          url: referralLink,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  }, [referralLink, handleCopy, t]);

  if (!isConnected) {
    return null;
  }

  // Compact mode - small inline QR with expand button
  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="p-2 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/30 hover:bg-[#39FF14]/20 transition-colors"
          title={t('qrcode.view_qrcode')}
        >
          <QrCode className="w-5 h-5 text-[#39FF14]" />
        </button>

        {/* Modal */}
        <QRCodeModal
          show={showModal}
          onClose={() => setShowModal(false)}
          referralLink={referralLink}
          onDownload={handleDownload}
          onCopy={handleCopy}
          onShare={handleShare}
          copied={copied}
          qrRef={qrRef}
        />
      </>
    );
  }

  // Full card mode
  return (
    <>
      <GlassCard className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#39FF14]/20 rounded-lg">
              <QrCode className="w-5 h-5 text-[#39FF14]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('qrcode.title')}</h3>
              <p className="text-xs text-gray-400 font-mono">{t('qrcode.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center">
          <div
            ref={qrRef}
            className="p-4 bg-white rounded-xl mb-4"
            onClick={() => setShowModal(true)}
            style={{ cursor: 'pointer' }}
          >
            <QRCodeSVG
              value={referralLink}
              size={160}
              level="H"
              includeMargin={false}
              fgColor="#0f172a"
              bgColor="#ffffff"
            />
          </div>

          {/* Address display */}
          <div className="text-xs font-mono text-gray-500 mb-4 text-center break-all px-4">
            {address?.slice(0, 10)}...{address?.slice(-8)}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 w-full">
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="flex-1 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 gap-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t('qrcode.copied') : t('qrcode.copy')}
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex-1 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 gap-1"
            >
              <Download className="w-4 h-4" />
              {t('qrcode.download')}
            </Button>
            {navigator.share && (
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="border-[#39FF14]/30 text-[#39FF14] hover:bg-[#39FF14]/10 gap-1"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tip */}
        <div className="mt-4 p-3 rounded-lg bg-[#39FF14]/5 border border-[#39FF14]/20">
          <p className="text-xs text-gray-400 font-mono text-center">
            {t('qrcode.tip')}
          </p>
        </div>
      </GlassCard>

      {/* Modal for expanded view */}
      <QRCodeModal
        show={showModal}
        onClose={() => setShowModal(false)}
        referralLink={referralLink}
        onDownload={handleDownload}
        onCopy={handleCopy}
        onShare={handleShare}
        copied={copied}
        qrRef={qrRef}
      />
    </>
  );
}

// QR Code Modal Component
function QRCodeModal({
  show,
  onClose,
  referralLink,
  onDownload,
  onCopy,
  onShare,
  copied,
  qrRef,
}: {
  show: boolean;
  onClose: () => void;
  referralLink: string;
  onDownload: () => void;
  onCopy: () => void;
  onShare: () => void;
  copied: boolean;
  qrRef: React.RefObject<HTMLDivElement>;
}) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 rounded-xl p-6 max-w-sm w-full border border-[#39FF14]/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#39FF14]/20 rounded-lg">
                  <QrCode className="w-5 h-5 text-[#39FF14]" />
                </div>
                <h3 className="text-lg font-bold text-white">{t('qrcode.title')}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Large QR Code */}
            <div className="flex flex-col items-center">
              <div
                ref={qrRef}
                className="p-6 bg-white rounded-xl mb-4"
              >
                <QRCodeSVG
                  value={referralLink}
                  size={240}
                  level="H"
                  includeMargin={false}
                  fgColor="#0f172a"
                  bgColor="#ffffff"
                />
              </div>

              {/* IVY Protocol branding */}
              <div className="text-center mb-4">
                <div className="text-[#39FF14] font-bold text-lg font-mono">IVY PROTOCOL</div>
                <div className="text-xs text-gray-500 font-mono">{t('qrcode.scan_to_join')}</div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 w-full">
                <Button
                  onClick={onCopy}
                  variant="outline"
                  className="flex-1 border-white/10 text-gray-300 hover:text-white hover:bg-white/10 gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('qrcode.copied') : t('qrcode.copy')}
                </Button>
                <Button
                  onClick={onDownload}
                  className="flex-1 bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/40 hover:bg-[#39FF14]/30 gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('qrcode.download')}
                </Button>
              </div>

              {/* Share button (mobile only) */}
              {navigator.share && (
                <Button
                  onClick={onShare}
                  variant="outline"
                  className="w-full mt-3 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  {t('qrcode.share')}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
