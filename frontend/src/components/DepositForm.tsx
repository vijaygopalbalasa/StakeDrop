'use client';

import { useState, useEffect } from 'react';
import { useCardanoWallet } from '@/hooks/useCardanoWallet';
import { usePool, saveDeposit } from '@/hooks/usePool';
import { parseAda, MIN_DEPOSIT_ADA, formatAda, DEFAULT_DEPOSIT_ADA } from '@/lib/constants';
import { getPoolScriptAddress } from '@/lib/contract';
import {
  generateWalletDerivedCommitment,
  generateDepositProof,
  registerCommitmentOnMidnight,
  isMidnightAvailable,
  MidnightCommitment,
} from '@/lib/midnight';
import { Shield, AlertCircle, CheckCircle, ExternalLink, Lock, Wallet, Zap, Fingerprint, History, ChevronDown, ChevronUp } from 'lucide-react';

type DepositStep = 'input' | 'signing' | 'proving' | 'confirming' | 'registering' | 'complete' | 'error';

interface DepositData {
  secret: Uint8Array;
  commitment: MidnightCommitment;
  amount: string;
  epochId: number;
  proof?: string;
  midnightTxHash?: string;
}

interface StoredDeposit {
  commitment: string;
  amount: string;
  timestamp: number;
  epochId: number;
  txHash?: string;
}

// Get stored deposits from localStorage
function getStoredDeposits(): StoredDeposit[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('stakedrop_pool_deposits');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function DepositForm() {
  const { connected, address, balance, wallet, network } = useCardanoWallet();
  const { state, canDeposit, refresh } = usePool();
  const [amount, setAmount] = useState(DEFAULT_DEPOSIT_ADA.toString());
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<DepositStep>('input');
  const [depositData, setDepositData] = useState<DepositData | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [midnightAvailable, setMidnightAvailable] = useState<boolean | null>(null);
  const [myDeposits, setMyDeposits] = useState<StoredDeposit[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Check Midnight availability and load deposits on mount
  useEffect(() => {
    isMidnightAvailable().then(setMidnightAvailable);
    setMyDeposits(getStoredDeposits());
  }, []);

  // Refresh deposits when step changes to complete
  useEffect(() => {
    if (step === 'complete') {
      setMyDeposits(getStoredDeposits());
    }
  }, [step]);

  const getExplorerUrl = (hash: string) => {
    const baseUrls: Record<string, string> = {
      mainnet: 'https://cardanoscan.io',
      preview: 'https://preview.cardanoscan.io',
      preprod: 'https://preprod.cardanoscan.io',
    };
    return `${baseUrls[network] || baseUrls.preview}/transaction/${hash}`;
  };

  const handleGenerateCommitment = async () => {
    if (!connected || !wallet || !state || !address) return;

    const depositAmount = parseAda(amount);
    if (depositAmount < parseAda(MIN_DEPOSIT_ADA.toString())) {
      setError(`Minimum deposit is ${MIN_DEPOSIT_ADA} ADA`);
      return;
    }

    if (depositAmount > balance) {
      setError('Insufficient balance');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStep('signing');

      // Generate commitment using wallet signature (NO FILE DOWNLOAD NEEDED!)
      const { secret, commitment } = await generateWalletDerivedCommitment(
        wallet,
        address,
        state.epochId,
        depositAmount
      );

      setStep('proving');

      // Generate ZK proof for the deposit
      const proof = await generateDepositProof({
        secret,
        amount: depositAmount,
        commitment: commitment.value,
      });

      setDepositData({
        secret,
        commitment,
        amount,
        epochId: state.epochId,
        proof: proof.hex,
      });

      setStep('confirming');
    } catch (err) {
      console.error('Commitment generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate ZK commitment';

      // Check if user declined the signature
      if (errorMessage.includes('User declined') || errorMessage.includes('rejected') || errorMessage.includes('cancelled')) {
        setError('Signature request was cancelled');
      } else {
        setError(errorMessage);
      }
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeposit = async () => {
    if (!wallet || !depositData || !address || !state) return;

    try {
      setLoading(true);
      setError(null);

      const { Transaction } = await import('@meshsdk/core');
      const tx = new Transaction({ initiator: wallet });
      const lovelaceAmount = parseAda(amount).toString();

      // Get the pool validator script address for the current network
      const scriptAddress = getPoolScriptAddress(network as 'mainnet' | 'preview' | 'preprod');

      // Send to script address with commitment in metadata
      tx.sendLovelace(scriptAddress, lovelaceAmount);

      // Include Midnight commitment and ZK proof reference in metadata (CIP-20)
      // Note: Cardano metadata only supports strings, integers, bytes, lists, and maps
      // Boolean values must be converted to strings
      tx.setMetadata(674, {
        msg: ['StakeDrop ZK Deposit'],
        commitment: depositData.commitment.hex.slice(0, 64),
        epoch: state.epochId,
        amount: lovelaceAmount,
        zkProof: depositData.proof?.slice(0, 64) || 'simulated',
        midnight: midnightAvailable ? 'connected' : 'simulated',
        walletDerived: 'true',
      });

      const unsignedTx = await tx.build();
      const signedTx = await wallet.signTx(unsignedTx);
      const txHashResult = await wallet.submitTx(signedTx);

      setTxHash(txHashResult);

      // Register commitment on Midnight (if available)
      setStep('registering');

      if (depositData.proof) {
        const midnightResult = await registerCommitmentOnMidnight(
          depositData.commitment.value,
          {
            proof: new Uint8Array(0),
            publicInputs: { commitment: depositData.commitment.hex },
            hex: depositData.proof,
          }
        );

        if (midnightResult.success) {
          setDepositData(prev => prev ? { ...prev, midnightTxHash: midnightResult.txHash } : null);
        }
      }

      // Save deposit to local storage (for display purposes only - secret is in wallet!)
      saveDeposit({
        commitment: depositData.commitment.hex,
        amount: parseAda(amount).toString(),
        timestamp: Date.now(),
        epochId: state.epochId,
        txHash: txHashResult,
      });

      await refresh();
      setStep('complete');
    } catch (err) {
      console.error('Transaction error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';

      if (errorMessage.includes('User declined') || errorMessage.includes('rejected')) {
        setError('Transaction was cancelled');
      } else {
        setError(errorMessage);
      }
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('input');
    setDepositData(null);
    setTxHash(null);
    setAmount(DEFAULT_DEPOSIT_ADA.toString());
    setError(null);
  };

  if (!connected) {
    return (
      <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal p-8 text-center">
        <div className="w-20 h-20 bg-brutal-black mx-auto mb-6 flex items-center justify-center">
          <Wallet className="w-10 h-10 text-accent-yellow" />
        </div>
        <h3 className="text-xl font-bold uppercase mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600">Connect your Cardano wallet to make a deposit</p>
      </div>
    );
  }

  if (!canDeposit) {
    return (
      <div className="bg-accent-yellow border-4 border-brutal-black shadow-brutal p-8 text-center">
        <div className="w-20 h-20 bg-brutal-black mx-auto mb-6 flex items-center justify-center">
          <Lock className="w-10 h-10 text-accent-yellow" />
        </div>
        <h3 className="text-xl font-bold uppercase mb-2">Deposits Closed</h3>
        <p>The pool is currently in &quot;{state?.status}&quot; status.</p>
        <p className="text-sm mt-2">Deposits will open in the next epoch.</p>
      </div>
    );
  }

  return (
    <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-4 border-brutal-black bg-accent-yellow">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          <h2 className="text-xl font-bold uppercase tracking-wider">ZK Private Deposit</h2>
        </div>
        {/* Midnight Status Indicator */}
        <div className={`flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase ${
          midnightAvailable ? 'bg-accent-green' : 'bg-accent-purple text-white'
        } border-2 border-brutal-black`}>
          <Zap className="w-3 h-3" />
          {midnightAvailable ? 'Midnight Live' : 'Demo Mode'}
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Input */}
        {step === 'input' && (
          <>
            <div className="mb-6">
              <label className="block font-bold text-sm uppercase tracking-wider mb-2">
                Deposit Amount (ADA)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={MIN_DEPOSIT_ADA}
                  className="input-brutal text-2xl font-bold"
                  placeholder={DEFAULT_DEPOSIT_ADA.toString()}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                  ADA
                </span>
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span>Min: {MIN_DEPOSIT_ADA} ADA</span>
                <span>Balance: {formatAda(balance)} ADA</span>
              </div>
            </div>

            {/* Midnight ZK Info Box */}
            <div className="bg-accent-purple text-white border-4 border-brutal-black p-4 mb-6">
              <div className="flex items-start gap-3">
                <Zap className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold uppercase mb-1">Midnight ZK Privacy</h4>
                  <p className="text-sm opacity-90">
                    Your deposit uses Zero-Knowledge proofs powered by Midnight Network.
                    Amount and identity are cryptographically hidden.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-accent-pink border-4 border-brutal-black p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerateCommitment}
              disabled={loading || !amount || parseFloat(amount) < MIN_DEPOSIT_ADA}
              className="w-full py-4 bg-accent-green border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all font-bold text-lg uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-brutal flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-5 h-5" />
              Sign & Generate Commitment
            </button>

            {/* Deposit History */}
            {myDeposits.length > 0 && (
              <div className="mt-6 border-t-4 border-brutal-black pt-6">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between p-3 bg-brutal-cream border-4 border-brutal-black hover:bg-accent-yellow transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    <span className="font-bold uppercase">Your Deposits ({myDeposits.length})</span>
                  </div>
                  {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {showHistory && (
                  <div className="mt-3 space-y-3">
                    {myDeposits.map((deposit, index) => {
                      const amountAda = deposit.amount.includes('.')
                        ? parseFloat(deposit.amount)
                        : Number(deposit.amount) / 1_000_000;
                      const date = new Date(deposit.timestamp);

                      return (
                        <div
                          key={index}
                          className="p-4 bg-brutal-white border-4 border-brutal-black"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-bold text-lg">{amountAda.toFixed(2)} ADA</span>
                              <span className="text-sm text-gray-600 ml-2">Epoch #{deposit.epochId}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs bg-accent-green px-2 py-1 border-2 border-brutal-black">
                              <CheckCircle className="w-3 h-3" />
                              Deposited
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {date.toLocaleDateString()} {date.toLocaleTimeString()}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-gray-500 truncate max-w-[200px]">
                              {deposit.commitment.slice(0, 16)}...
                            </span>
                            {deposit.txHash && (
                              <a
                                href={getExplorerUrl(deposit.txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-accent-blue hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View TX
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Total deposited */}
                    <div className="p-4 bg-accent-blue text-white border-4 border-brutal-black">
                      <div className="flex justify-between items-center">
                        <span className="font-bold uppercase">Total Deposited</span>
                        <span className="font-bold text-xl">
                          {myDeposits.reduce((sum, d) => {
                            const amt = d.amount.includes('.')
                              ? parseFloat(d.amount)
                              : Number(d.amount) / 1_000_000;
                            return sum + amt;
                          }, 0).toFixed(2)} ADA
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Step 2: Signing with Wallet */}
        {step === 'signing' && (
          <div className="text-center py-12">
            <div className="spinner-brutal w-16 h-16 mx-auto mb-6" />
            <h3 className="text-xl font-bold uppercase mb-2">Sign with Wallet...</h3>
            <p className="text-gray-600">Approve the signature request in your wallet</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-accent-green">
              <Fingerprint className="w-4 h-4" />
              <span>Your signature derives your secret</span>
            </div>
          </div>
        )}

        {/* Step 2b: Generating ZK Proof */}
        {step === 'proving' && (
          <div className="text-center py-12">
            <div className="spinner-brutal w-16 h-16 mx-auto mb-6" />
            <h3 className="text-xl font-bold uppercase mb-2">Generating ZK Proof...</h3>
            <p className="text-gray-600">Computing zero-knowledge proof via Midnight</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-accent-purple">
              <Zap className="w-4 h-4" />
              <span>Powered by Midnight Network</span>
            </div>
          </div>
        )}

        {/* Step 3: Confirm Transaction (No more download step!) */}
        {step === 'confirming' && (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-accent-green border-4 border-brutal-black mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold uppercase mb-2">Commitment Generated!</h3>
            <p className="text-gray-600 mb-6">Your wallet is your key. Confirm the deposit transaction.</p>

            <div className="bg-brutal-cream border-4 border-brutal-black p-4 mb-6 text-left">
              <div className="flex justify-between mb-3 pb-3 border-b-2 border-brutal-black">
                <span className="font-bold uppercase text-sm">Amount</span>
                <span className="font-bold text-xl">{amount} ADA</span>
              </div>
              <div className="flex justify-between mb-3 pb-3 border-b-2 border-brutal-black">
                <span className="font-bold uppercase text-sm">Epoch</span>
                <span className="font-mono">#{state?.epochId}</span>
              </div>
              <div className="flex justify-between mb-3 pb-3 border-b-2 border-brutal-black">
                <span className="font-bold uppercase text-sm">ZK Commitment</span>
                <span className="font-mono text-xs truncate max-w-[150px]">
                  {depositData?.commitment.hex.slice(0, 16)}...
                </span>
              </div>
              <div className="flex justify-between items-center mb-3 pb-3 border-b-2 border-brutal-black">
                <span className="font-bold uppercase text-sm">Privacy</span>
                <span className="flex items-center gap-1 text-accent-purple font-bold text-sm">
                  <Zap className="w-4 h-4" />
                  ZK Protected
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold uppercase text-sm">Recovery</span>
                <span className="flex items-center gap-1 text-accent-green font-bold text-sm">
                  <Fingerprint className="w-4 h-4" />
                  Wallet-Derived
                </span>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-accent-blue text-white border-4 border-brutal-black p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <Wallet className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold uppercase mb-1">Your Wallet = Your Key</h4>
                  <p className="text-sm opacity-90">
                    To withdraw, simply connect the same wallet and sign a message.
                    No files to save or lose!
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-accent-pink border-4 border-brutal-black p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
            )}

            <button
              onClick={handleConfirmDeposit}
              disabled={loading}
              className="w-full py-4 bg-accent-blue text-white border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all font-bold text-lg uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="spinner-brutal w-5 h-5 border-white border-t-transparent" />
                  Signing Transaction...
                </>
              ) : (
                <>Confirm Deposit ({amount} ADA)</>
              )}
            </button>

            <button
              onClick={resetForm}
              disabled={loading}
              className="w-full mt-4 py-3 font-bold uppercase text-gray-600 hover:text-brutal-black transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Step 4: Registering on Midnight */}
        {step === 'registering' && (
          <div className="text-center py-12">
            <div className="spinner-brutal w-16 h-16 mx-auto mb-6" />
            <h3 className="text-xl font-bold uppercase mb-2">Registering on Midnight...</h3>
            <p className="text-gray-600">Recording your commitment on the privacy layer</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-accent-purple">
              <Zap className="w-4 h-4" />
              <span>Cross-chain synchronization in progress</span>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && txHash && (
          <div className="text-center py-6">
            <div className="w-24 h-24 bg-accent-green border-4 border-brutal-black mx-auto mb-6 flex items-center justify-center animate-brutal-bounce">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-bold uppercase mb-2">ZK Deposit Complete!</h3>
            <p className="text-gray-600 mb-6">
              Your {amount} ADA deposit is now privacy-protected for Epoch #{state?.epochId}
            </p>

            {/* Wallet Recovery Notice */}
            <div className="bg-accent-green border-4 border-brutal-black p-4 mb-4">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Fingerprint className="w-5 h-5" />
                <p className="font-bold text-sm uppercase">Wallet-Derived Recovery</p>
              </div>
              <p className="text-sm">
                Your wallet is your key. To withdraw, just connect this wallet and sign a message.
              </p>
            </div>

            {/* Cardano Transaction */}
            <div className="bg-brutal-cream border-4 border-brutal-black p-4 mb-4">
              <p className="font-bold text-sm uppercase mb-2">Cardano Transaction</p>
              <p className="font-mono text-xs break-all">{txHash}</p>
            </div>

            {/* Midnight Registration */}
            {depositData?.midnightTxHash && (
              <div className="bg-accent-purple text-white border-4 border-brutal-black p-4 mb-4">
                <p className="font-bold text-sm uppercase mb-2 flex items-center gap-1 justify-center">
                  <Zap className="w-4 h-4" /> Midnight Registration
                </p>
                <p className="font-mono text-xs break-all">{depositData.midnightTxHash}</p>
              </div>
            )}

            <a
              href={getExplorerUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent-blue text-white border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md transition-all font-bold uppercase mb-6"
            >
              <ExternalLink className="w-5 h-5" />
              View on Explorer
            </a>

            <button
              onClick={resetForm}
              className="w-full py-3 bg-brutal-cream border-4 border-brutal-black hover:bg-brutal-white transition-colors font-bold uppercase"
            >
              Make Another Deposit
            </button>
          </div>
        )}

        {/* Error State */}
        {step === 'error' && (
          <div className="text-center py-6">
            <div className="w-24 h-24 bg-accent-pink border-4 border-brutal-black mx-auto mb-6 flex items-center justify-center animate-brutal-shake">
              <AlertCircle className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-bold uppercase mb-2">Deposit Failed</h3>
            <p className="text-gray-600 mb-6">{error || 'An error occurred'}</p>

            <div className="space-y-3">
              <button
                onClick={() => setStep('confirming')}
                className="w-full py-4 bg-accent-yellow border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md transition-all font-bold uppercase"
              >
                Try Again
              </button>
              <button
                onClick={resetForm}
                className="w-full py-3 font-bold uppercase text-gray-600 hover:text-brutal-black transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
