import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Droplets, AlertTriangle } from 'lucide-react';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

const FAUCET_AMOUNT = BigInt('20000000000000000000000'); // 20,000 USDT

export function FaucetPanel() {
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
  if (isFaucetSuccess && isClaiming) {
    setIsClaiming(false);
    toast.success('20,000 MockUSDT claimed!');
    refetchBalance();
  }

  if (!isConnected) {
    return null;
  }

  const isContractDeployed = addresses.MockUSDT !== '0x0000000000000000000000000000000000000000';

  return (
    <GlassCard className="p-4 border-dashed border-yellow-500/30 bg-yellow-500/5">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-yellow-500/20 rounded-lg">
          <Droplets className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-yellow-400">TESTNET FAUCET</h4>
          <p className="text-[10px] text-gray-500">Development & Testing Only</p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-yellow-500/60">
          <AlertTriangle className="w-3 h-3" />
          DEV MODE
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">Your MockUSDT Balance</div>
          <div className="text-lg font-bold text-white font-mono">
            {usdtBalanceNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="text-sm text-gray-500 ml-1">mUSDT</span>
          </div>
        </div>

        {isContractDeployed ? (
          <Button 
            className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 font-mono text-sm"
            onClick={handleClaim}
            disabled={isClaiming || isFaucetLoading}
          >
            {isClaiming || isFaucetLoading ? '[ CLAIMING... ]' : '[ FAUCET +20,000 ]'}
          </Button>
        ) : (
          <div className="text-xs text-gray-500 text-right">
            <div className="text-yellow-400">Contract Not Deployed</div>
            <div>Deploy MockUSDT first</div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-yellow-500/10 text-[10px] text-gray-500">
        <div className="flex justify-between">
          <span>Faucet Amount:</span>
          <span className="text-yellow-400 font-mono">20,000 mUSDT</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Use for:</span>
          <span>Buy Node (1,000) + Deposit (10,000+)</span>
        </div>
      </div>
    </GlassCard>
  );
}
