'use client';

import { useState } from 'react';
import { useCardanoWallet } from '@/hooks/useCardanoWallet';
import { usePool } from '@/hooks/usePool';
import { generateSecret, generateCommitment, createSecretFile } from '@/lib/crypto';
import { parseAda, MIN_DEPOSIT_ADA, formatAda } from '@/lib/constants';
import { Shield, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export function DepositForm() {
  const { connected, address, balance, wallet } = useCardanoWallet();
  const { state, canDeposit } = usePool();
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'generating' | 'download' | 'complete'>('input');
  const [secretFile, setSecretFile] = useState<{ content: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeposit = async () => {
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

      // Generate secret and commitment
      const secret = generateSecret();
      const commitment = await generateCommitment(secret, depositAmount);

      console.log('Generated commitment:', commitment.slice(0, 16) + '...');

      // Create secret file for download
      const fileContent = createSecretFile(
        secret,
        amount,
        commitment,
        state.epochId
      );

      const filename = `stakedrop-secret-${Date.now()}.json`;
      setSecretFile({ content: fileContent, filename });
      setStep('download');
    } catch (err) {
      console.error('Deposit error:', err);
      setError('Failed to generate commitment');
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

    setStep('complete');
  };

  const resetForm = () => {
    setStep('input');
    setSecretFile(null);
    setAmount('100');
    setError(null);
  };

  if (!connected) {
    return (
      <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-500">Connect your Cardano wallet to deposit</p>
        </div>
      </div>
    );
  }

  if (!canDeposit) {
    return (
      <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Deposits Closed</h3>
          <p className="text-gray-500">The pool is not accepting deposits at this time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-cardano-400" />
        <h2 className="text-xl font-bold">Private Deposit</h2>
      </div>

      {step === 'input' && (
        <>
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Deposit Amount (ADA)</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={MIN_DEPOSIT_ADA}
                className="w-full px-4 py-3 bg-midnight-800 border border-midnight-700 rounded-lg focus:outline-none focus:border-cardano-500 text-white text-lg"
                placeholder="100"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">ADA</span>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-gray-500">Min: {MIN_DEPOSIT_ADA} ADA</span>
              <span className="text-gray-500">Balance: {formatAda(balance)} ADA</span>
            </div>
          </div>

          <div className="bg-midnight-800/50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-midnight-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-300 mb-1">Privacy Protected</h4>
                <p className="text-sm text-gray-500">
                  Your deposit amount and identity are hidden using Midnight&apos;s ZK proofs.
                  You&apos;ll receive a secret file to claim your funds.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleDeposit}
            disabled={loading || !amount}
            className="w-full py-3 bg-cardano-600 hover:bg-cardano-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            Generate Commitment
          </button>
        </>
      )}

      {step === 'generating' && (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 mx-auto text-cardano-400 animate-spin mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Generating ZK Commitment...</h3>
          <p className="text-gray-500">Creating your private deposit proof</p>
        </div>
      )}

      {step === 'download' && (
        <div className="text-center py-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <AlertCircle className="w-8 h-8 mx-auto text-yellow-500 mb-3" />
            <h3 className="text-lg font-medium text-yellow-400 mb-2">Important: Save Your Secret!</h3>
            <p className="text-sm text-gray-400">
              Download and save this file securely. You&apos;ll need it to withdraw your funds.
              <strong className="text-yellow-400"> If you lose this file, you cannot recover your deposit.</strong>
            </p>
          </div>

          <button
            onClick={handleDownloadSecret}
            className="w-full py-3 bg-cardano-600 hover:bg-cardano-500 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Secret File
          </button>
        </div>
      )}

      {step === 'complete' && (
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Secret File Downloaded!</h3>
          <p className="text-gray-500 mb-6">
            Your commitment has been registered. Complete the deposit by confirming the transaction in your wallet.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                // TODO: Submit actual transaction
                alert('Demo: Transaction would be submitted here');
              }}
              className="w-full py-3 bg-cardano-600 hover:bg-cardano-500 rounded-lg font-medium transition-colors"
            >
              Confirm Deposit ({amount} ADA)
            </button>

            <button
              onClick={resetForm}
              className="w-full py-2 text-gray-400 hover:text-white transition-colors"
            >
              Make Another Deposit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
