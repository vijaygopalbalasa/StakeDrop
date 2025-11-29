'use client';

import { useState, useRef } from 'react';
import { useCardanoWallet } from '@/hooks/useCardanoWallet';
import { usePool } from '@/hooks/usePool';
import { parseSecretFile, verifyCommitment, generateCommitment } from '@/lib/crypto';
import { formatAda, parseAda } from '@/lib/constants';
import {
  Upload,
  Shield,
  Trophy,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileJson,
  X,
} from 'lucide-react';

interface SecretData {
  secret: string;
  amount: string;
  commitment: string;
  epochId: number;
}

export function WithdrawForm() {
  const { connected, wallet } = useCardanoWallet();
  const { state, canWithdraw } = usePool();
  const [secretData, setSecretData] = useState<SecretData | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isWinner, setIsWinner] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      const content = await file.text();
      const parsed = parseSecretFile(content);

      if (!parsed) {
        setError('Invalid secret file format');
        return;
      }

      setSecretData(parsed);
      setVerifying(true);

      // Verify the commitment
      const amount = parseAda(parsed.amount);
      const isValid = await verifyCommitment(parsed.secret, amount, parsed.commitment);

      if (!isValid) {
        setError('Commitment verification failed');
        setSecretData(null);
        return;
      }

      // Check if this commitment is the winner
      const winner = state?.winnerCommitment === parsed.commitment;
      setIsWinner(winner);
      setVerifying(false);
    } catch (err) {
      console.error('File upload error:', err);
      setError('Failed to read secret file');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!connected || !wallet || !secretData || !state) return;

    try {
      setLoading(true);
      setError(null);

      // In production, this would:
      // 1. Generate ZK proof (winner or loser)
      // 2. Submit to Midnight contract
      // 3. Get claim token
      // 4. Submit Cardano withdrawal transaction

      console.log('Processing withdrawal...');
      console.log('Commitment:', secretData.commitment.slice(0, 16) + '...');
      console.log('Is Winner:', isWinner);

      // Simulate transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock transaction hash
      setTxHash('abc123def456...');
    } catch (err) {
      console.error('Withdrawal error:', err);
      setError('Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSecretData(null);
    setIsWinner(null);
    setError(null);
    setTxHash(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const principalAmount = secretData ? parseAda(secretData.amount) : BigInt(0);
  const yieldAmount = isWinner ? (state?.yieldAmount || BigInt(0)) : BigInt(0);
  const totalAmount = principalAmount + yieldAmount;

  if (!connected) {
    return (
      <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-500">Connect your Cardano wallet to withdraw</p>
        </div>
      </div>
    );
  }

  if (!canWithdraw) {
    return (
      <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Withdrawals Not Open</h3>
          <p className="text-gray-500">
            The pool is currently in &quot;{state?.status}&quot; status.
            Withdrawals will open after winner selection.
          </p>
        </div>
      </div>
    );
  }

  if (txHash) {
    return (
      <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Withdrawal Complete!</h3>

          <div className="bg-midnight-800/50 rounded-lg p-4 my-6 text-left">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Principal</span>
              <span className="text-white">{formatAda(principalAmount)} ADA</span>
            </div>
            {isWinner && (
              <div className="flex justify-between mb-2 text-green-400">
                <span>Yield Won!</span>
                <span>+{formatAda(yieldAmount)} ADA</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-midnight-700">
              <span className="font-medium text-white">Total</span>
              <span className="font-bold text-cardano-400">{formatAda(totalAmount)} ADA</span>
            </div>
          </div>

          <a
            href={`https://preview.cardanoscan.io/transaction/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cardano-400 hover:text-cardano-300 text-sm"
          >
            View transaction →
          </a>

          <button
            onClick={resetForm}
            className="w-full mt-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Withdraw Another Deposit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-cardano-400" />
        <h2 className="text-xl font-bold">Withdraw Funds</h2>
      </div>

      {!secretData ? (
        <>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-midnight-700 hover:border-cardano-500 rounded-xl p-8 text-center cursor-pointer transition-colors"
          >
            <Upload className="w-12 h-12 mx-auto text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">Upload Secret File</h3>
            <p className="text-gray-500 text-sm">
              Upload the secret file you downloaded when depositing
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Reading file...</span>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Secret file loaded */}
          <div className="bg-midnight-800/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-cardano-400" />
                <span className="font-medium">Secret File Loaded</span>
              </div>
              <button onClick={resetForm} className="p-1 hover:bg-midnight-700 rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Commitment</span>
                <span className="font-mono">{secretData.commitment.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount</span>
                <span>{secretData.amount} ADA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Epoch</span>
                <span>#{secretData.epochId}</span>
              </div>
            </div>
          </div>

          {verifying ? (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 mx-auto text-cardano-400 animate-spin mb-2" />
              <span className="text-gray-400">Verifying commitment...</span>
            </div>
          ) : isWinner !== null && (
            <>
              {/* Winner/Loser status */}
              <div
                className={`rounded-lg p-4 mb-6 ${
                  isWinner
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-blue-500/10 border border-blue-500/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isWinner ? (
                    <Trophy className="w-8 h-8 text-yellow-500" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-blue-400" />
                  )}
                  <div>
                    <h4 className="font-bold text-lg">
                      {isWinner ? "You're the Winner!" : 'Participation Verified'}
                    </h4>
                    <p className="text-sm text-gray-400">
                      {isWinner
                        ? `Claim your ${secretData.amount} ADA + ${formatAda(state?.yieldAmount || BigInt(0))} ADA yield!`
                        : `Claim back your ${secretData.amount} ADA deposit`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Withdrawal breakdown */}
              <div className="bg-midnight-800/50 rounded-lg p-4 mb-6">
                <h4 className="text-sm text-gray-400 mb-3">Withdrawal Amount</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Principal</span>
                    <span>{formatAda(principalAmount)} ADA</span>
                  </div>
                  {isWinner && (
                    <div className="flex justify-between text-green-400">
                      <span>Yield</span>
                      <span>+{formatAda(yieldAmount)} ADA</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-midnight-700 font-bold">
                    <span>Total</span>
                    <span className="text-cardano-400">{formatAda(totalAmount)} ADA</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleWithdraw}
                disabled={loading}
                className="w-full py-3 bg-cardano-600 hover:bg-cardano-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating ZK Proof...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Withdraw {formatAda(totalAmount)} ADA
                  </>
                )}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
