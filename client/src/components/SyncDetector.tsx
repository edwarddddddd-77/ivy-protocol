import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

/**
 * SyncDetector - Automatically detects if user needs to sync with IvyCore
 *
 * Shows a prompt when:
 * - User has bond power in IvyBond (from deposits)
 * - But IvyCore doesn't have their data (bondPower = 0)
 *
 * This happens after contract upgrades when IvyCore is redeployed.
 */
export function SyncDetector() {
  const { t } = useLanguage();
  const { address, isConnected } = useAccount();
  const [dismissed, setDismissed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Read bond power from IvyBond (source of truth)
  const { data: ivyBondPower } = useReadContract({
    address: addresses.IvyBond as `0x${string}`,
    abi: abis.IvyBond,
    functionName: 'getBondPower',
    args: [address],
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 30000,
    }
  });

  // Read user info from IvyCore
  const { data: userInfo, refetch: refetchUserInfo } = useReadContract({
    address: addresses.IvyCore as `0x${string}`,
    abi: abis.IvyCore,
    functionName: 'userInfo',
    args: [address],
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 30000,
    }
  });

  // Write contract for syncUser
  const { writeContract: syncUser, data: syncHash } = useWriteContract();

  // Wait for sync transaction
  const { isLoading: isSyncLoading, isSuccess: isSyncSuccess } = useWaitForTransactionReceipt({
    hash: syncHash,
  });

  // Calculate if sync is needed
  const bondPowerInIvyBond = ivyBondPower ? Number(ivyBondPower as any) / 1e18 : 0;
  const bondPowerInIvyCore = userInfo ? Number((userInfo as any)[0]) / 1e18 : 0;

  // Need sync if: IvyBond has power AND IvyCore doesn't have it (or significantly different)
  const needsSync = bondPowerInIvyBond > 0 && Math.abs(bondPowerInIvyBond - bondPowerInIvyCore) > 1;

  // Handle sync button click
  const handleSync = async () => {
    if (!address) return;

    setIsSyncing(true);
    try {
      syncUser({
        address: addresses.IvyCore as `0x${string}`,
        abi: abis.IvyCore,
        functionName: 'syncUser',
        args: [address],
      });
      toast.info('Syncing your data...');
    } catch (error) {
      toast.error('Sync failed');
      setIsSyncing(false);
    }
  };

  // Handle sync success
  useEffect(() => {
    if (isSyncSuccess && isSyncing) {
      setIsSyncing(false);
      toast.success('Sync complete! Your mining data is now up to date.');
      refetchUserInfo();
      setDismissed(true);
    }
  }, [isSyncSuccess, isSyncing]);

  // Don't show if not needed or dismissed
  if (!isConnected || !needsSync || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4"
      >
        <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/50 rounded-xl p-4 backdrop-blur-md shadow-2xl">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="p-2 bg-orange-500/20 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-white font-bold mb-1">
                {t('sync.title') || 'Sync Required'}
              </h3>
              <p className="text-sm text-gray-300 mb-3">
                {t('sync.description') || 'Your mining data needs to be synced with the latest contract. This is required after protocol upgrades.'}
              </p>

              {/* Stats */}
              <div className="flex gap-4 mb-3 text-xs font-mono">
                <div>
                  <span className="text-gray-400">IvyBond: </span>
                  <span className="text-green-400">{bondPowerInIvyBond.toLocaleString()} Power</span>
                </div>
                <div>
                  <span className="text-gray-400">IvyCore: </span>
                  <span className="text-red-400">{bondPowerInIvyCore.toLocaleString()} Power</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSync}
                  disabled={isSyncing || isSyncLoading}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-mono text-sm gap-2"
                >
                  {isSyncing || isSyncLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      {t('sync.button') || 'Sync Now'}
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDismissed(true)}
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
