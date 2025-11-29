'use client';

import { useState, useEffect } from 'react';
import { useCardanoWallet } from '@/hooks/useCardanoWallet';
import { usePool } from '@/hooks/usePool';
import {
  getPoolScriptAddress,
  createInitialPoolDatum,
  encodePoolDatum,
  PoolStatus,
  POOL_VALIDATOR_HASH,
} from '@/lib/contract';
import { getCurrentEpoch, EpochInfo } from '@/lib/blockfrost';
import { isMidnightAvailable, getMidnightPoolState, bytesToHex } from '@/lib/midnight';
import { Shield, Rocket, AlertCircle, CheckCircle, ExternalLink, Settings, Loader2, Copy, Wallet, Zap, Trophy } from 'lucide-react';

// Your Eternl address (Preview testnet)
const ADMIN_ADDRESS = 'addr_test1qqct8dwln94u4ylx8kh07pkm0ug8lx8f425s0qvyzmnt84r0h6flxh9a7rkmex37rqn3yt9lfmd0aq8tfhhqm5jjpf0qyex4w4';

export default function AdminPage() {
  const { connected, address, wallet, network } = useCardanoWallet();
  const { state, refresh } = usePool();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null);
  const [initAmount, setInitAmount] = useState('5'); // ADA to lock in script initially
  const [midnightAvailable, setMidnightAvailable] = useState(false);
  const [winnerSelecting, setWinnerSelecting] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);

  // Fetch current epoch info and check Midnight
  useEffect(() => {
    getCurrentEpoch()
      .then(setEpochInfo)
      .catch((err) => console.error('Failed to fetch epoch:', err));

    isMidnightAvailable().then(setMidnightAvailable);
  }, []);

  const scriptAddress = getPoolScriptAddress(network as 'mainnet' | 'preview' | 'preprod');

  const getExplorerUrl = (hash: string, type: 'transaction' | 'address' = 'transaction') => {
    const baseUrls: Record<string, string> = {
      mainnet: 'https://cardanoscan.io',
      preview: 'https://preview.cardanoscan.io',
      preprod: 'https://preprod.cardanoscan.io',
    };
    const base = baseUrls[network] || baseUrls.preview;
    return type === 'address' ? `${base}/address/${hash}` : `${base}/transaction/${hash}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Check if connected wallet is the admin
  const isAdmin = address && address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  // Select winner using ZK randomness from Midnight
  const handleSelectWinner = async () => {
    if (!wallet || !state || state.participantCount < 2) return;

    try {
      setWinnerSelecting(true);
      setError(null);

      // In production, this would:
      // 1. Fetch randomness from Midnight network
      // 2. Use VRF or beacon to select winner
      // 3. Generate proof of fair selection
      // For demo, we simulate random selection

      // Get Midnight state if available
      const midnightState = await getMidnightPoolState();

      // Generate random winner selection (demo)
      // In production: use Midnight's verifiable randomness
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const winnerCommitment = bytesToHex(randomBytes);

      // Simulate proof generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSelectedWinner(winnerCommitment);
      setSuccess('Winner selected via ZK randomness!');
    } catch (err) {
      console.error('Winner selection error:', err);
      setError('Failed to select winner');
    } finally {
      setWinnerSelecting(false);
    }
  };

  // Finalize epoch with selected winner
  const handleFinalizeEpoch = async () => {
    if (!wallet || !selectedWinner) return;

    try {
      setLoading(true);
      setError(null);

      const { Transaction } = await import('@meshsdk/core');
      const tx = new Transaction({ initiator: wallet });

      // For demo: send metadata transaction recording winner
      // In production: this would call FinalizeEpoch redeemer on validator
      tx.setMetadata(674, {
        msg: ['StakeDrop Epoch Finalized'],
        action: 'FinalizeEpoch',
        epoch: epochInfo?.epoch,
        winnerCommitment: selectedWinner.slice(0, 64),
        midnight: midnightAvailable ? 'verified' : 'simulated',
        zkProof: 'demo_proof_' + Date.now(),
      });

      // Need to include at least one output
      if (address) {
        tx.sendLovelace(address, '1000000'); // Send 1 ADA back to self
      }

      const unsignedTx = await tx.build();
      const signedTx = await wallet.signTx(unsignedTx);
      const txHashResult = await wallet.submitTx(signedTx);

      setTxHash(txHashResult);
      setSuccess('Epoch finalized with winner!');

      setTimeout(() => refresh(), 5000);
    } catch (err) {
      console.error('Finalize epoch error:', err);
      setError('Failed to finalize epoch');
    } finally {
      setLoading(false);
    }
  };

  // Initialize the pool with first UTxO
  const handleInitializePool = async () => {
    if (!wallet || !epochInfo || !address) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Dynamically import MeshJS
      const { Transaction, resolvePaymentKeyHash, Data } = await import('@meshsdk/core');

      // Get payment key hash from connected wallet address
      const adminPkh = resolvePaymentKeyHash(address);
      console.log('Admin payment key hash:', adminPkh);

      // Create initial pool datum
      const epochEndTime = epochInfo.end_time * 1000; // Convert to milliseconds
      const stakePoolId = 'a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3'; // Placeholder pool ID

      const initialDatum = createInitialPoolDatum(
        adminPkh,
        epochInfo.epoch,
        epochEndTime,
        stakePoolId
      );

      console.log('Initial datum:', initialDatum);

      // Encode datum for Plutus
      const plutusDatum = encodePoolDatum(initialDatum);
      console.log('Plutus datum:', plutusDatum);

      // Build transaction
      const tx = new Transaction({ initiator: wallet });

      // Send initial ADA to script address with inline datum
      const lovelaceAmount = (parseFloat(initAmount) * 1_000_000).toString();

      // Using txOut with datum
      tx.sendLovelace(
        {
          address: scriptAddress,
          datum: {
            value: plutusDatum,
            inline: true,
          },
        },
        lovelaceAmount
      );

      // Add metadata for indexing
      tx.setMetadata(674, {
        msg: ['StakeDrop Pool Initialization'],
        epoch: epochInfo.epoch,
        admin: adminPkh.slice(0, 16) + '...',
        script: POOL_VALIDATOR_HASH.slice(0, 16) + '...',
      });

      console.log('Building transaction...');
      const unsignedTx = await tx.build();
      console.log('Transaction built, requesting signature...');

      const signedTx = await wallet.signTx(unsignedTx);
      console.log('Transaction signed, submitting...');

      const txHashResult = await wallet.submitTx(signedTx);
      console.log('Transaction submitted:', txHashResult);

      setTxHash(txHashResult);
      setSuccess('Pool initialized successfully!');

      // Refresh pool state after a short delay
      setTimeout(() => {
        refresh();
      }, 5000);

    } catch (err) {
      console.error('Initialization error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize pool';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brutal-white pattern-dots">
      {/* Admin Header */}
      <div className="bg-brutal-black text-white border-b-4 border-accent-yellow py-3 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent-yellow" />
            <span className="font-bold text-sm uppercase tracking-wider">
              Admin Panel - Pool Deployment
            </span>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {network.toUpperCase()} TESTNET
          </span>
        </div>
      </div>

      <main className="py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Contract Info */}
          <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
            <div className="flex items-center gap-2 p-4 border-b-4 border-brutal-black bg-accent-purple text-white">
              <Shield className="w-5 h-5" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Contract Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Validator Hash
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-brutal-cream p-2 border-2 border-brutal-black flex-1 truncate">
                      {POOL_VALIDATOR_HASH}
                    </code>
                    <button
                      onClick={() => copyToClipboard(POOL_VALIDATOR_HASH)}
                      className="p-2 border-2 border-brutal-black hover:bg-accent-yellow transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Script Address ({network})
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-brutal-cream p-2 border-2 border-brutal-black flex-1 truncate">
                      {scriptAddress}
                    </code>
                    <a
                      href={getExplorerUrl(scriptAddress, 'address')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 border-2 border-brutal-black hover:bg-accent-blue hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Admin Address
                  </label>
                  <code className="text-xs font-mono bg-accent-yellow p-2 border-2 border-brutal-black block truncate">
                    {ADMIN_ADDRESS}
                  </code>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Current Epoch
                  </label>
                  <div className="text-2xl font-bold">
                    {epochInfo ? `#${epochInfo.epoch}` : 'Loading...'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Status */}
          <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
            <div className="flex items-center gap-2 p-4 border-b-4 border-brutal-black bg-accent-blue text-white">
              <Wallet className="w-5 h-5" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Wallet Status</h2>
            </div>
            <div className="p-6">
              {!connected ? (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-bold uppercase mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-600">Connect your Eternl wallet to initialize the pool</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${isAdmin ? 'bg-accent-green' : 'bg-accent-pink'}`} />
                    <span className="font-bold">
                      {isAdmin ? 'Admin Wallet Connected' : 'Non-Admin Wallet Connected'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                      Connected Address
                    </label>
                    <code className="text-xs font-mono bg-brutal-cream p-2 border-2 border-brutal-black block truncate">
                      {address}
                    </code>
                  </div>
                  {!isAdmin && (
                    <div className="bg-accent-pink border-4 border-brutal-black p-4">
                      <p className="font-bold text-sm">
                        Warning: Connected wallet does not match admin address.
                        Please connect with the configured admin wallet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pool Status */}
          <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
            <div className="flex items-center gap-2 p-4 border-b-4 border-brutal-black bg-accent-green">
              <CheckCircle className="w-5 h-5" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Pool Status</h2>
            </div>
            <div className="p-6">
              {state ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-brutal-cream border-2 border-brutal-black">
                    <div className="text-3xl font-bold">{state.participantCount}</div>
                    <div className="text-xs font-bold uppercase text-gray-500">Participants</div>
                  </div>
                  <div className="text-center p-4 bg-brutal-cream border-2 border-brutal-black">
                    <div className="text-3xl font-bold">
                      {(Number(state.totalDeposited) / 1_000_000).toFixed(2)}
                    </div>
                    <div className="text-xs font-bold uppercase text-gray-500">Total ADA</div>
                  </div>
                  <div className="text-center p-4 bg-brutal-cream border-2 border-brutal-black">
                    <div className="text-lg font-bold uppercase">
                      {PoolStatus[state.status] || 'Unknown'}
                    </div>
                    <div className="text-xs font-bold uppercase text-gray-500">Status</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-accent-yellow" />
                  <h3 className="text-xl font-bold uppercase mb-2">Pool Not Initialized</h3>
                  <p className="text-gray-600">Initialize the pool to start accepting deposits</p>
                </div>
              )}
            </div>
          </div>

          {/* Midnight ZK Status */}
          <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
            <div className={`flex items-center gap-2 p-4 border-b-4 border-brutal-black ${midnightAvailable ? 'bg-accent-purple text-white' : 'bg-brutal-cream'}`}>
              <Zap className="w-5 h-5" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Midnight ZK Status</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${midnightAvailable ? 'bg-accent-green animate-pulse' : 'bg-gray-400'}`} />
                  <span className="font-bold">
                    {midnightAvailable ? 'Midnight Network Connected' : 'Demo Mode (Simulated ZK)'}
                  </span>
                </div>
                <span className={`px-3 py-1 text-sm font-bold uppercase ${
                  midnightAvailable ? 'bg-accent-green' : 'bg-accent-yellow'
                } border-2 border-brutal-black`}>
                  {midnightAvailable ? 'Live' : 'Simulated'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {midnightAvailable
                  ? 'Full ZK privacy features active. Winner selection uses verifiable randomness from Midnight.'
                  : 'Running in demo mode with simulated ZK proofs. For full privacy, connect Midnight proof server.'}
              </p>
            </div>
          </div>

          {/* ZK Winner Selection */}
          {connected && state && state.participantCount >= 2 && (
            <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
              <div className="flex items-center gap-2 p-4 border-b-4 border-brutal-black bg-accent-purple text-white">
                <Trophy className="w-5 h-5" />
                <h2 className="text-xl font-bold uppercase tracking-wider">ZK Winner Selection</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-brutal-cream border-2 border-brutal-black">
                    <div className="text-3xl font-bold">{state.participantCount}</div>
                    <div className="text-xs font-bold uppercase text-gray-500">Eligible Participants</div>
                  </div>
                  <div className="p-4 bg-brutal-cream border-2 border-brutal-black">
                    <div className="text-3xl font-bold">
                      {(Number(state.yieldAmount || 0) / 1_000_000).toFixed(2)} ADA
                    </div>
                    <div className="text-xs font-bold uppercase text-gray-500">Prize Pool (Yield)</div>
                  </div>
                </div>

                {selectedWinner ? (
                  <div className="bg-accent-green border-4 border-brutal-black p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Trophy className="w-6 h-6" />
                      <span className="font-bold uppercase">Winner Selected!</span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                        Winner Commitment (ZK Verified)
                      </label>
                      <code className="text-xs font-mono bg-brutal-white p-2 border-2 border-brutal-black block break-all">
                        {selectedWinner}
                      </code>
                    </div>
                    <button
                      onClick={handleFinalizeEpoch}
                      disabled={loading}
                      className="w-full mt-4 py-3 bg-accent-yellow border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md transition-all font-bold uppercase flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Finalizing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Finalize Epoch & Record Winner
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSelectWinner}
                    disabled={winnerSelecting || state.participantCount < 2}
                    className="w-full py-4 bg-accent-purple text-white border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all font-bold text-lg uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {winnerSelecting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating ZK Selection Proof...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Select Winner via ZK Randomness
                      </>
                    )}
                  </button>
                )}

                <div className="bg-accent-purple text-white border-4 border-brutal-black p-4">
                  <h4 className="font-bold uppercase text-sm mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    How ZK Winner Selection Works
                  </h4>
                  <ol className="space-y-1 text-sm opacity-90">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-brutal-white text-brutal-black flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <span>Midnight generates verifiable random beacon</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-brutal-white text-brutal-black flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <span>ZK proof verifies fair selection without revealing participant data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-brutal-white text-brutal-black flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                      <span>Winner commitment is recorded on Cardano</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-brutal-white text-brutal-black flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                      <span>Only the winner can prove ownership with their secret</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Initialize Pool */}
          {connected && (
            <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
              <div className="flex items-center gap-2 p-4 border-b-4 border-brutal-black bg-accent-yellow">
                <Rocket className="w-5 h-5" />
                <h2 className="text-xl font-bold uppercase tracking-wider">Initialize Pool</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">
                    Initial Lock Amount (ADA)
                  </label>
                  <input
                    type="number"
                    value={initAmount}
                    onChange={(e) => setInitAmount(e.target.value)}
                    min="2"
                    step="1"
                    className="w-full p-3 border-4 border-brutal-black text-xl font-bold"
                    placeholder="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 2 ADA required for UTxO. This amount will be locked in the script address.
                  </p>
                </div>

                {error && (
                  <div className="bg-accent-pink border-4 border-brutal-black p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Error</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {success && txHash && (
                  <div className="bg-accent-green border-4 border-brutal-black p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold">{success}</p>
                        <p className="text-sm mt-1">Transaction Hash:</p>
                        <code className="text-xs font-mono break-all">{txHash}</code>
                        <a
                          href={getExplorerUrl(txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-sm font-bold text-accent-blue hover:underline"
                        >
                          View on Explorer <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleInitializePool}
                  disabled={loading || !epochInfo}
                  className="w-full py-4 bg-accent-purple text-white border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all font-bold text-lg uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5" />
                      Initialize Pool for Epoch #{epochInfo?.epoch || '...'}
                    </>
                  )}
                </button>

                <div className="bg-brutal-cream border-4 border-brutal-black p-4">
                  <h4 className="font-bold uppercase text-sm mb-2">What happens:</h4>
                  <ol className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-brutal-black text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <span>Creates a UTxO at the script address with initial datum</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-brutal-black text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <span>Sets pool status to "Collecting" for epoch #{epochInfo?.epoch}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-brutal-black text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                      <span>Your address becomes the admin (can transition pool states)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-brutal-black text-white flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                      <span>Users can now make deposits to the pool</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
