import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Droplets, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

const FAUCET_AMOUNT = BigInt('20000000000000000000000'); // 20,000 USDT

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FaucetModal({ isOpen, onClose }: FaucetModalProps) {
  const { address, isConnected } = useAccount();
  const [isClaiming, setIsClaiming] = useState(false);

  // Read USDT balance
  const { data: usdtBalance, refetch: refetchBalance } = useReadContract({
    address: addresses.MockUSDT as `0x${string}`,
    abi: abis.MockUSDT,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address && isConnected && addresses.MockUSDT !== '0x0000000000000000000000000000000000000000' }
  });

  // Write contract
  const { writeContract: claimFaucet, data: faucetHash } = useWriteContract();

  // Wait for transaction
  const { isLoading: isFaucetLoading, isSuccess: isFaucetSuccess } = useWaitForTransactionReceipt({
    hash: faucetHash,
  });

  const usdtBalanceNum = usdtBalance ? Number(usdtBalance as any) / 1e18 : 0;

  // Handle faucet claim
  const handleClaim = async () => {
    if (!address || addresses.MockUSDT === '0x0000000000000000000000000000000000000000') {
      toast.error('MockUSDT not deployed yet');
      return;
    }
    
    setIsClaiming(true);
    try {
      claimFaucet({
        address: addresses.MockUSDT as `0x${string}`,
        abi: abis.MockUSDT,
        functionName: 'faucet',
        args: [address, FAUCET_AMOUNT],
      });
      toast.info('Faucet transaction submitted...');
    } catch (error) {
      toast.error('Faucet claim failed');
      setIsClaiming(false);
    }
  };

  // Handle transaction success
  useEffect(() => {
    if (isFaucetSuccess && isClaiming) {
      setIsClaiming(false);
      toast.success('20,000 MockUSDT claimed!');
      refetchBalance();
    }
  }, [isFaucetSuccess, isClaiming, refetchBalance]);

  const isContractDeployed = addresses.MockUSDT !== '0x0000000000000000000000000000000000000000';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-slate-900 border border-yellow-500/30 rounded-lg shadow-2xl shadow-yellow-500/10 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-yellow-500/20 bg-yellow-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Droplets className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-yellow-400">TESTNET FAUCET</h3>
                    <p className="text-xs text-gray-500">Development & Testing Only</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Warning */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-gray-400">
                    This faucet provides test tokens for development purposes only. These tokens have no real value.
                  </div>
                </div>

                {/* Balance Display */}
                <div className="p-4 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-xs text-gray-400 mb-1">Your MockUSDT Balance</div>
                  <div className="text-3xl font-bold text-white font-mono">
                    {usdtBalanceNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <span className="text-lg text-gray-500 ml-2">mUSDT</span>
                  </div>
                </div>

                {/* Faucet Amount */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-black/40">
                    <div className="text-xs text-gray-500 mb-1">Faucet Amount</div>
                    <div className="text-yellow-400 font-mono font-bold">20,000 mUSDT</div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40">
                    <div className="text-xs text-gray-500 mb-1">Use For</div>
                    <div className="text-gray-300 text-xs">Buy Node + Deposit</div>
                  </div>
                </div>

                {/* Action Button */}
                {!isConnected ? (
                  <div className="text-center text-gray-400 text-sm py-4">
                    Please connect your wallet first
                  </div>
                ) : !isContractDeployed ? (
                  <div className="text-center py-4">
                    <div className="text-yellow-400 text-sm font-bold">Contract Not Deployed</div>
                    <div className="text-gray-500 text-xs mt-1">Deploy MockUSDT contract first</div>
                  </div>
                ) : (
                  <Button 
                    className="w-full bg-yellow-500 text-black hover:bg-yellow-400 font-mono text-sm h-12"
                    onClick={handleClaim}
                    disabled={isClaiming || isFaucetLoading}
                  >
                    {isClaiming || isFaucetLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                        CLAIMING...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Droplets className="w-4 h-4" />
                        CLAIM 20,000 mUSDT
                      </span>
                    )}
                  </Button>
                )}

                {/* Success Message */}
                {isFaucetSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Tokens claimed successfully!
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5 bg-black/20">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>BSC Testnet</span>
                  <span className="font-mono">{addresses.MockUSDT.slice(0, 10)}...{addresses.MockUSDT.slice(-8)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
