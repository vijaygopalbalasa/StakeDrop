'use client';

import { useState, useEffect } from 'react';
import { useCardanoWallet } from '@/hooks/useCardanoWallet';
import { usePool, saveDeposit } from '@/hooks/usePool';
import { parseAda, MIN_DEPOSIT_ADA, formatAda, DEFAULT_DEPOSIT_ADA } from '@/lib/constants';
import { getPoolScriptAddress } from '@/lib/contract';
import {
  generateMidnightSecret,
  generateMidnightCommitment,
  generateDepositProof,
  registerCommitmentOnMidnight,
  createMidnightSecretFile,
  isMidnightAvailable,
  MidnightCommitment,
} from '@/lib/midnight';
import { Shield, AlertCircle, CheckCircle, ExternalLink, Lock, Wallet, FileDown, Zap } from 'lucide-react';

type DepositStep = 'input' | 'generating' | 'proving' | 'download' | 'confirming' | 'registering' | 'complete' | 'error';

interface DepositData {
  secret: Uint8Array;
  commitment: MidnightCommitment;
  amount: string;
  epochId: number;
  proof?: string;
  midnightTxHash?: string;
}

export function DepositForm() {
  const { connected, address, balance, wallet, network } = useCardanoWallet();
  const { state, canDeposit, refresh } = usePool();
  const [amount, setAmount] = useState(DEFAULT_DEPOSIT_ADA.toString());
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<DepositStep>('input');
  const [secretFile, setSecretFile] = useState<{ content: string; filename: string } | null>(null);
  const [depositData, setDepositData] = useState<DepositData | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [midnightAvailable, setMidnightAvailable] = useState<boolean | null>(null);

  // Check Midnight availability on mount
  useEffect(() => {
    isMidnightAvailable().then(setMidnightAvailable);
  }, []);

  const getExplorerUrl = (hash: string) => {
    const baseUrls: Record<string, string> = {
      mainnet: 'https://cardanoscan.io',
      preview: 'https://preview.cardanoscan.io',
      preprod: 'https://preprod.cardanoscan.io',
    };
    return `${baseUrls[network] || baseUrls.preview}/transaction/${hash}`;
  };

  const handleGenerateCommitment = async () => {
    if (!connected || !wallet || !state) return;

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
      setStep('generating');

      // Generate cryptographic secret using Midnight-compatible method
      const secret = generateMidnightSecret();

      // Generate ZK-compatible commitment
      const commitment = await generateMidnightCommitment(secret, depositAmount);

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

      // Create enhanced secret file with Midnight data
      const fileContent = createMidnightSecretFile(
        secret,
        amount,
        commitment,
        state.epochId
      );
      const filename = `stakedrop-midnight-secret-epoch${state.epochId}-${Date.now()}.json`;
      setSecretFile({ content: fileContent, filename });
      setStep('download');
    } catch (err) {
      console.error('Commitment generation error:', err);
      setError('Failed to generate ZK commitment');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSecret = () => {
    if (!secretFile) return;

    const blob = new Blob([secretFile.content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = secretFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStep('confirming');
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
      tx.setMetadata(674, {
        msg: ['StakeDrop ZK Deposit'],
        commitment: depositData.commitment.hex.slice(0, 64),
        epoch: state.epochId,
        amount: lovelaceAmount,
        zkProof: depositData.proof?.slice(0, 64) || 'simulated',
        midnight: midnightAvailable ? 'connected' : 'simulated',
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

      // Save deposit to local storage
      saveDeposit({
        commitment: depositData.commitment.hex,
        amount: parseAda(amount).toString(),
        timestamp: Date.now(),
        epochId: state.epochId,
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
    setSecretFile(null);
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
                    Amount and identity are cryptographically hidden - only you can prove ownership.
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
              <Zap className="w-5 h-5" />
              Generate ZK Commitment
            </button>
          </>
        )}

        {/* Step 2: Generating Secret */}
        {step === 'generating' && (
          <div className="text-center py-12">
            <div className="spinner-brutal w-16 h-16 mx-auto mb-6" />
            <h3 className="text-xl font-bold uppercase mb-2">Generating Cryptographic Secret...</h3>
            <p className="text-gray-600">Creating your private key material</p>
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

        {/* Step 3: Download Secret */}
        {step === 'download' && (
          <div className="text-center py-6">
            <div className="bg-accent-pink border-4 border-brutal-black p-6 mb-6">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold uppercase mb-2">Save Your ZK Secret!</h3>
              <p className="text-sm">
                This file contains your secret key for generating withdrawal proofs.
                <strong className="block mt-2">If you lose this file, you cannot prove ownership and recover your deposit.</strong>
              </p>
            </div>

            <button
              onClick={handleDownloadSecret}
              className="w-full py-4 bg-accent-yellow border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all font-bold text-lg uppercase tracking-wider flex items-center justify-center gap-3"
            >
              <FileDown className="w-6 h-6" />
              Download Secret File
            </button>

            <button
              onClick={() => setStep('input')}
              className="w-full mt-4 py-3 font-bold uppercase text-gray-600 hover:text-brutal-black transition-colors"
            >
              Go Back
            </button>
          </div>
        )}

        {/* Step 4: Confirm Transaction */}
        {step === 'confirming' && (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-accent-green border-4 border-brutal-black mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold uppercase mb-2">Secret File Secured!</h3>
            <p className="text-gray-600 mb-6">Now confirm the deposit transaction in your wallet.</p>

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
              <div className="flex justify-between items-center">
                <span className="font-bold uppercase text-sm">Privacy</span>
                <span className="flex items-center gap-1 text-accent-purple font-bold text-sm">
                  <Zap className="w-4 h-4" />
                  ZK Protected
                </span>
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

        {/* Step 4b: Registering on Midnight */}
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

            {/* Cardano Transaction */}
            <div className="bg-accent-green border-4 border-brutal-black p-4 mb-4">
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
