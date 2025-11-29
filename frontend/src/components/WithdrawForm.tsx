'use client';

import { useState, useRef, useEffect } from 'react';
import { useCardanoWallet } from '@/hooks/useCardanoWallet';
import { usePool } from '@/hooks/usePool';
import { formatAda, parseAda } from '@/lib/constants';
import {
  parseMidnightSecretFile,
  generateWinnerProof,
  generateLoserProof,
  verifySecretOwnership,
  hexToBytes,
  isMidnightAvailable,
  MidnightCommitment,
} from '@/lib/midnight';
import {
  Trophy,
  AlertCircle,
  CheckCircle,
  FileJson,
  X,
  ExternalLink,
  Wallet,
  Lock,
  Gift,
  FileUp,
  Zap,
  Shield,
} from 'lucide-react';

interface SecretData {
  secret: Uint8Array;
  amount: string;
  commitment: MidnightCommitment;
  epochId: number;
  midnightTxHash?: string;
}

type WithdrawStep = 'upload' | 'verifying' | 'proving' | 'ready' | 'withdrawing' | 'complete' | 'error';

export function WithdrawForm() {
  const { connected, wallet, address, network } = useCardanoWallet();
  const { state, canWithdraw, refresh } = usePool();
  const [secretData, setSecretData] = useState<SecretData | null>(null);
  const [step, setStep] = useState<WithdrawStep>('upload');
  const [loading, setLoading] = useState(false);
  const [isWinner, setIsWinner] = useState<boolean | null>(null);
  const [zkProof, setZkProof] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [midnightAvailable, setMidnightAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setStep('verifying');

      const content = await file.text();

      // Try parsing as Midnight v2 format first, then fall back to v1
      let parsed = parseMidnightSecretFile(content);

      if (!parsed) {
        // Try legacy v1 format
        try {
          const legacyData = JSON.parse(content);
          if (legacyData.secret && legacyData.amount && legacyData.commitment) {
            parsed = {
              secret: hexToBytes(legacyData.secret),
              amount: legacyData.amount,
              commitment: {
                value: hexToBytes(legacyData.commitment),
                hex: legacyData.commitment,
              },
              epochId: legacyData.epochId || 0,
            };
          }
        } catch {
          // Not valid JSON
        }
      }

      if (!parsed) {
        setError('Invalid secret file format. Please use a valid StakeDrop secret file.');
        setStep('upload');
        return;
      }

      setSecretData(parsed);

      // Verify ownership of the commitment
      const amount = parseAda(parsed.amount);
      const isValid = await verifySecretOwnership(parsed.secret, amount, parsed.commitment.value);

      if (!isValid) {
        setError('Commitment verification failed. The secret does not match the commitment.');
        setSecretData(null);
        setStep('upload');
        return;
      }

      // Check if this commitment is the winner
      const winner = state?.winnerCommitment === parsed.commitment.hex;
      setIsWinner(winner);

      // Generate ZK proof for withdrawal
      setStep('proving');

      const winnerCommitmentBytes = state?.winnerCommitment
        ? hexToBytes(state.winnerCommitment)
        : new Uint8Array(32);

      let proof;
      if (winner) {
        // Generate winner proof
        proof = await generateWinnerProof({
          secret: parsed.secret,
          myCommitment: parsed.commitment.value,
          winnerCommitment: winnerCommitmentBytes,
        });
      } else {
        // Generate loser proof
        proof = await generateLoserProof({
          secret: parsed.secret,
          myCommitment: parsed.commitment.value,
          winnerCommitment: winnerCommitmentBytes,
          isRegistered: true,
        });
      }

      setZkProof(proof.hex);
      setStep('ready');
    } catch (err) {
      console.error('File upload error:', err);
      setError('Failed to process secret file');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!connected || !wallet || !secretData || !state || !address || !zkProof) return;

    try {
      setLoading(true);
      setError(null);
      setStep('withdrawing');

      const { Transaction } = await import('@meshsdk/core');
      const tx = new Transaction({ initiator: wallet });

      const principalLovelace = parseAda(secretData.amount);
      const yieldLovelace = isWinner ? (state.yieldAmount || BigInt(0)) : BigInt(0);
      const totalLovelace = principalLovelace + yieldLovelace;

      tx.sendLovelace(address, totalLovelace.toString());

      // Include ZK proof and commitment in metadata
      tx.setMetadata(674, {
        msg: [isWinner ? 'StakeDrop ZK Winner Withdrawal' : 'StakeDrop ZK Withdrawal'],
        commitment: secretData.commitment.hex.slice(0, 64),
        epoch: secretData.epochId,
        isWinner: isWinner || false,
        zkProof: zkProof.slice(0, 64),
        midnight: midnightAvailable ? 'verified' : 'simulated',
      });

      const unsignedTx = await tx.build();
      const signedTx = await wallet.signTx(unsignedTx);
      const txHashResult = await wallet.submitTx(signedTx);

      setTxHash(txHashResult);
      await refresh();
      setStep('complete');
    } catch (err) {
      console.error('Withdrawal error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Withdrawal failed';

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
    setSecretData(null);
    setIsWinner(null);
    setZkProof(null);
    setError(null);
    setTxHash(null);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const principalAmount = secretData ? parseAda(secretData.amount) : BigInt(0);
  const yieldAmount = isWinner ? (state?.yieldAmount || BigInt(0)) : BigInt(0);
  const totalAmount = principalAmount + yieldAmount;

  if (!connected) {
    return (
      <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal p-8 text-center">
        <div className="w-20 h-20 bg-brutal-black mx-auto mb-6 flex items-center justify-center">
          <Wallet className="w-10 h-10 text-accent-green" />
        </div>
        <h3 className="text-xl font-bold uppercase mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600">Connect your Cardano wallet to withdraw</p>
      </div>
    );
  }

  if (!canWithdraw) {
    return (
      <div className="bg-accent-yellow border-4 border-brutal-black shadow-brutal p-8 text-center">
        <div className="w-20 h-20 bg-brutal-black mx-auto mb-6 flex items-center justify-center">
          <Lock className="w-10 h-10 text-accent-yellow" />
        </div>
        <h3 className="text-xl font-bold uppercase mb-2">Withdrawals Not Open</h3>
        <p>The pool is currently in &quot;{state?.status}&quot; status.</p>
        <p className="text-sm mt-2">Withdrawals will open after winner selection.</p>
      </div>
    );
  }

  // Complete state
  if (step === 'complete' && txHash) {
    return (
      <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
        <div className="flex items-center justify-between p-4 border-b-4 border-brutal-black bg-accent-green">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            <h2 className="text-xl font-bold uppercase tracking-wider">ZK Withdrawal Complete</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase bg-accent-purple text-white border-2 border-brutal-black">
            <Zap className="w-3 h-3" />
            ZK Verified
          </div>
        </div>

        <div className="p-6 text-center">
          <div className="w-24 h-24 bg-accent-green border-4 border-brutal-black mx-auto mb-6 flex items-center justify-center animate-brutal-bounce">
            {isWinner ? <Trophy className="w-12 h-12" /> : <CheckCircle className="w-12 h-12" />}
          </div>
          <h3 className="text-2xl font-bold uppercase mb-6">
            {isWinner ? 'Winner Funds Claimed!' : 'Funds Claimed!'}
          </h3>

          <div className="bg-brutal-cream border-4 border-brutal-black p-4 mb-6 text-left">
            <div className="flex justify-between mb-3 pb-3 border-b-2 border-brutal-black">
              <span className="font-bold uppercase text-sm">Principal</span>
              <span className="font-bold">{formatAda(principalAmount)} ADA</span>
            </div>
            {isWinner && (
              <div className="flex justify-between mb-3 pb-3 border-b-2 border-brutal-black text-accent-green">
                <span className="font-bold uppercase text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Yield Won!
                </span>
                <span className="font-bold">+{formatAda(yieldAmount)} ADA</span>
              </div>
            )}
            <div className="flex justify-between mb-3 pb-3 border-b-2 border-brutal-black">
              <span className="font-bold uppercase text-sm flex items-center gap-1">
                <Zap className="w-4 h-4 text-accent-purple" /> Privacy
              </span>
              <span className="font-bold text-accent-purple">ZK Protected</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="font-bold uppercase">Total</span>
              <span className="font-bold text-2xl">{formatAda(totalAmount)} ADA</span>
            </div>
          </div>

          <div className="bg-accent-green border-4 border-brutal-black p-4 mb-6">
            <p className="font-bold text-sm uppercase mb-2">Transaction Hash</p>
            <p className="font-mono text-xs break-all">{txHash}</p>
          </div>

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
            Withdraw Another Deposit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-4 border-brutal-black bg-accent-green">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5" />
          <h2 className="text-xl font-bold uppercase tracking-wider">ZK Withdraw</h2>
        </div>
        {/* Midnight Status Indicator */}
        <div className={`flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase ${
          midnightAvailable ? 'bg-accent-purple text-white' : 'bg-brutal-cream'
        } border-2 border-brutal-black`}>
          <Zap className="w-3 h-3" />
          {midnightAvailable ? 'Midnight Live' : 'Demo Mode'}
        </div>
      </div>

      <div className="p-6">
        {/* Upload Step */}
        {step === 'upload' && (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed border-brutal-black p-8 text-center cursor-pointer hover:bg-brutal-cream transition-colors group"
            >
              <div className="w-20 h-20 bg-brutal-black mx-auto mb-6 flex items-center justify-center group-hover:bg-accent-purple transition-colors">
                <FileUp className="w-10 h-10 text-accent-yellow" />
              </div>
              <h3 className="text-xl font-bold uppercase mb-2">Upload ZK Secret File</h3>
              <p className="text-gray-600">
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

            {/* ZK Privacy Info */}
            <div className="mt-6 bg-accent-purple text-white border-4 border-brutal-black p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold uppercase mb-1">Zero-Knowledge Withdrawal</h4>
                  <p className="text-sm opacity-90">
                    Your secret file generates a ZK proof that verifies ownership without revealing your identity.
                    Only you can withdraw your funds.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 bg-accent-pink border-4 border-brutal-black p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
            )}
          </>
        )}

        {/* Verifying Step */}
        {step === 'verifying' && (
          <div className="text-center py-12">
            <div className="spinner-brutal w-16 h-16 mx-auto mb-6" />
            <h3 className="text-xl font-bold uppercase mb-2">Verifying Secret...</h3>
            <p className="text-gray-600">Checking commitment ownership</p>
          </div>
        )}

        {/* Proving Step */}
        {step === 'proving' && (
          <div className="text-center py-12">
            <div className="spinner-brutal w-16 h-16 mx-auto mb-6" />
            <h3 className="text-xl font-bold uppercase mb-2">Generating ZK Proof...</h3>
            <p className="text-gray-600">Creating zero-knowledge withdrawal proof</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-accent-purple">
              <Zap className="w-4 h-4" />
              <span>Powered by Midnight Network</span>
            </div>
          </div>
        )}

        {/* Ready Step - Show withdrawal details */}
        {step === 'ready' && secretData && (
          <>
            {/* Secret file loaded */}
            <div className="bg-brutal-cream border-4 border-brutal-black p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  <span className="font-bold uppercase">ZK Secret Verified</span>
                </div>
                <button
                  onClick={resetForm}
                  className="p-2 bg-brutal-white border-3 border-brutal-black hover:bg-accent-pink transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold uppercase text-sm">Commitment</span>
                  <span className="font-mono text-sm">{secretData.commitment.hex.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold uppercase text-sm">Amount</span>
                  <span className="font-bold">{secretData.amount} ADA</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold uppercase text-sm">Epoch</span>
                  <span className="font-mono">#{secretData.epochId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase text-sm">ZK Proof</span>
                  <span className="flex items-center gap-1 text-accent-purple font-bold text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Generated
                  </span>
                </div>
              </div>
            </div>

            {/* Winner/Loser status */}
            <div
              className={`border-4 border-brutal-black p-6 mb-6 ${
                isWinner ? 'bg-accent-yellow' : 'bg-accent-blue text-white'
              }`}
            >
              <div className="flex items-center gap-4">
                {isWinner ? (
                  <div className="w-16 h-16 bg-brutal-black flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-accent-yellow" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-brutal-white flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-accent-blue" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-xl uppercase">
                    {isWinner ? "You're the Winner!" : 'Participation Verified'}
                  </h4>
                  <p className="text-sm">
                    {isWinner
                      ? `Claim your ${secretData.amount} ADA + ${formatAda(state?.yieldAmount || BigInt(0))} ADA yield!`
                      : `Claim back your ${secretData.amount} ADA deposit`}
                  </p>
                </div>
              </div>
            </div>

            {/* Withdrawal breakdown */}
            <div className="bg-brutal-cream border-4 border-brutal-black p-4 mb-6">
              <h4 className="font-bold text-sm uppercase tracking-wider mb-4">Withdrawal Amount</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-bold uppercase text-sm">Principal</span>
                  <span className="font-bold">{formatAda(principalAmount)} ADA</span>
                </div>
                {isWinner && (
                  <div className="flex justify-between text-accent-green">
                    <span className="font-bold uppercase text-sm flex items-center gap-2">
                      <Trophy className="w-4 h-4" /> Yield
                    </span>
                    <span className="font-bold">+{formatAda(yieldAmount)} ADA</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t-4 border-brutal-black">
                  <span className="font-bold uppercase">Total</span>
                  <span className="font-bold text-2xl">{formatAda(totalAmount)} ADA</span>
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
              onClick={handleWithdraw}
              disabled={loading}
              className={`w-full py-4 border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all font-bold text-lg uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isWinner ? 'bg-accent-yellow' : 'bg-accent-green'
              }`}
            >
              <Zap className="w-5 h-5" />
              ZK Withdraw {formatAda(totalAmount)} ADA
            </button>
          </>
        )}

        {/* Withdrawing Step */}
        {step === 'withdrawing' && (
          <div className="text-center py-12">
            <div className="spinner-brutal w-16 h-16 mx-auto mb-6" />
            <h3 className="text-xl font-bold uppercase mb-2">Processing ZK Withdrawal...</h3>
            <p className="text-gray-600">Submitting transaction with zero-knowledge proof</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-accent-purple">
              <Zap className="w-4 h-4" />
              <span>Privacy preserved on-chain</span>
            </div>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="text-center py-6">
            <div className="w-24 h-24 bg-accent-pink border-4 border-brutal-black mx-auto mb-6 flex items-center justify-center animate-brutal-shake">
              <AlertCircle className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-bold uppercase mb-2">Withdrawal Failed</h3>
            <p className="text-gray-600 mb-6">{error || 'An error occurred'}</p>

            <div className="space-y-3">
              <button
                onClick={() => setStep('ready')}
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
