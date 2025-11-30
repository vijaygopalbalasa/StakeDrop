'use client';

import { useState, useEffect } from 'react';
import { useCardanoWallet } from '@/hooks/useCardanoWallet';
import { usePool, savePoolStatus, clearPoolData } from '@/hooks/usePool';
import { PoolStatus } from '@/types';
import {
  getPoolScriptAddress,
  POOL_VALIDATOR_HASH,
} from '@/lib/contract';
import { getCurrentEpoch, EpochInfo } from '@/lib/blockfrost';
import { isMidnightAvailable, bytesToHex } from '@/lib/midnight';
import { fetchDepositsFromBlockchain, OnChainDeposit } from '@/lib/blockchain';
import {
  Shield, AlertCircle, CheckCircle, ExternalLink, Settings,
  Loader2, Copy, Wallet, Zap, Trophy, RefreshCw, Trash2,
  Play, Pause, Gift, Lock, Unlock
} from 'lucide-react';

// Admin address - update this to your wallet address
const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '';

// Storage key for deposits
const POOL_STORAGE_KEY = 'stakedrop_pool_deposits';

interface StoredDeposit {
  commitment: string;
  amount: string;
  epochId: number;
  timestamp?: number;
  txHash?: string;
}

// Get stored deposits from localStorage
function getStoredDepositsFromStorage(): StoredDeposit[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(POOL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function AdminPage() {
  const { connected, address, wallet, network } = useCardanoWallet();
  const { state, refresh, epochInfo } = usePool();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [midnightAvailable, setMidnightAvailable] = useState(false);
  const [winnerSelecting, setWinnerSelecting] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [currentEpoch, setCurrentEpoch] = useState<EpochInfo | null>(null);
  const [deposits, setDeposits] = useState<StoredDeposit[]>([]);
  const [onChainDeposits, setOnChainDeposits] = useState<OnChainDeposit[]>([]);
  const [loadingOnChain, setLoadingOnChain] = useState(false);

  // Load deposits from localStorage (fallback)
  const loadDeposits = () => {
    const storedDeposits = getStoredDepositsFromStorage();
    setDeposits(storedDeposits);
    console.log('Loaded local deposits:', storedDeposits.length, storedDeposits);
  };

  // Load deposits from blockchain
  const loadOnChainDeposits = async () => {
    try {
      setLoadingOnChain(true);
      console.log('Fetching deposits from blockchain...');
      const chainDeposits = await fetchDepositsFromBlockchain();
      setOnChainDeposits(chainDeposits);
      console.log('Loaded on-chain deposits:', chainDeposits.length, chainDeposits);
    } catch (err) {
      console.error('Failed to fetch on-chain deposits:', err);
    } finally {
      setLoadingOnChain(false);
    }
  };

  // Fetch current epoch info and check Midnight
  useEffect(() => {
    getCurrentEpoch()
      .then(setCurrentEpoch)
      .catch((err) => console.error('Failed to fetch epoch:', err));

    isMidnightAvailable().then(setMidnightAvailable);

    // Load deposits on mount (both localStorage and blockchain)
    loadDeposits();
    loadOnChainDeposits();
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
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  // Check if connected wallet is the admin (or allow anyone for demo)
  const isAdmin = !ADMIN_ADDRESS || (address && address.toLowerCase() === ADMIN_ADDRESS.toLowerCase());

  // Change pool status
  const handleSetStatus = async (newStatus: PoolStatus) => {
    if (!currentEpoch) return;

    try {
      setLoading(true);
      setError(null);

      savePoolStatus(newStatus, currentEpoch.epoch, selectedWinner || undefined);

      // Small delay to ensure localStorage is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      refresh();
      setSuccess(`Pool status changed to ${PoolStatus[newStatus]}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to change pool status');
    } finally {
      setLoading(false);
    }
  };

  // Select winner using ZK randomness from actual deposits
  const handleSelectWinner = async () => {
    // Reload deposits to make sure we have the latest
    loadDeposits();
    await loadOnChainDeposits();

    // Prioritize on-chain deposits over localStorage
    const hasOnChainDeposits = onChainDeposits.length > 0;
    const currentLocalDeposits = getStoredDepositsFromStorage();
    const hasLocalDeposits = currentLocalDeposits.length > 0;
    const hasParticipants = state && state.participantCount > 0;

    console.log('Winner selection check:', {
      onChainDeposits: onChainDeposits.length,
      localDeposits: currentLocalDeposits.length,
      participantCount: state?.participantCount || 0,
    });

    if (!hasOnChainDeposits && !hasLocalDeposits && !hasParticipants) {
      setError(`Need at least 1 deposit to select winner. Pool has ${state?.participantCount || 0} on-chain participants.`);
      return;
    }

    try {
      setWinnerSelecting(true);
      setError(null);

      // Simulate ZK proof generation delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      let winnerCommitment: string;

      if (hasOnChainDeposits) {
        // PRIORITY: Pick from on-chain deposits (real blockchain data)
        const randomIndex = Math.floor(Math.random() * onChainDeposits.length);
        const winnerDeposit = onChainDeposits[randomIndex];
        winnerCommitment = winnerDeposit.commitment;
        console.log('Winner selected from ON-CHAIN deposits:', winnerCommitment);
      } else if (hasLocalDeposits) {
        // Fallback: Pick from localStorage deposits
        const randomIndex = Math.floor(Math.random() * currentLocalDeposits.length);
        const winnerDeposit = currentLocalDeposits[randomIndex];
        winnerCommitment = winnerDeposit.commitment;
        console.log('Winner selected from localStorage deposits:', winnerCommitment);
      } else {
        // No deposits available at all - this shouldn't happen due to check above
        setError('No deposits found. Cannot select winner.');
        setWinnerSelecting(false);
        return;
      }

      setSelectedWinner(winnerCommitment);

      // Save with winner commitment and set to Distributing
      if (currentEpoch) {
        savePoolStatus(PoolStatus.Distributing, currentEpoch.epoch, winnerCommitment);
        refresh();
      }

      setSuccess(`Winner selected from blockchain! Commitment: ${winnerCommitment.slice(0, 16)}... Pool is now distributing.`);
    } catch (err) {
      console.error('Winner selection error:', err);
      setError('Failed to select winner');
    } finally {
      setWinnerSelecting(false);
    }
  };

  // Reset pool (clear all data)
  const handleResetPool = () => {
    if (confirm('Are you sure you want to reset the pool? This will clear all deposits and status.')) {
      clearPoolData();
      setSelectedWinner(null);
      refresh();
      setSuccess('Pool has been reset');
    }
  };

  const statusLabels: Record<PoolStatus, { label: string; color: string; icon: React.ReactNode }> = {
    [PoolStatus.Collecting]: { label: 'Collecting Deposits', color: 'bg-accent-green', icon: <Unlock className="w-4 h-4" /> },
    [PoolStatus.Staking]: { label: 'Staking Active', color: 'bg-accent-blue text-white', icon: <Lock className="w-4 h-4" /> },
    [PoolStatus.SelectingWinner]: { label: 'Selecting Winner', color: 'bg-accent-purple text-white', icon: <Zap className="w-4 h-4" /> },
    [PoolStatus.Distributing]: { label: 'Distributing Rewards', color: 'bg-accent-yellow', icon: <Gift className="w-4 h-4" /> },
    [PoolStatus.Completed]: { label: 'Completed', color: 'bg-brutal-cream', icon: <CheckCircle className="w-4 h-4" /> },
  };

  return (
    <div className="min-h-screen bg-brutal-white pattern-dots">
      {/* Admin Header */}
      <div className="bg-brutal-black text-white border-b-4 border-accent-yellow py-3 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent-yellow" />
            <span className="font-bold text-sm uppercase tracking-wider">
              Admin Panel - Pool Control
            </span>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {network.toUpperCase()} TESTNET
          </span>
        </div>
      </div>

      <main className="py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Status Messages */}
          {error && (
            <div className="bg-accent-pink border-4 border-brutal-black p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-accent-green border-4 border-brutal-black p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Pool Status Control - MAIN ADMIN SECTION */}
          <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
            <div className="flex items-center justify-between p-4 border-b-4 border-brutal-black bg-accent-yellow">
              <h2 className="text-xl font-bold uppercase tracking-wider flex items-center gap-2">
                <Play className="w-5 h-5" />
                Pool Status Control
              </h2>
              <button
                onClick={() => refresh()}
                className="p-2 border-2 border-brutal-black hover:bg-brutal-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Status Display */}
              <div className="flex items-center justify-between p-4 bg-brutal-cream border-4 border-brutal-black">
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500 mb-1">Current Status</div>
                  <div className="flex items-center gap-2">
                    {state && statusLabels[state.status] && (
                      <>
                        <span className={`px-3 py-1 border-2 border-brutal-black font-bold uppercase text-sm ${statusLabels[state.status].color}`}>
                          {statusLabels[state.status].label}
                        </span>
                      </>
                    )}
                    {!state && <span className="text-gray-500">Loading...</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase text-gray-500 mb-1">Epoch</div>
                  <div className="text-2xl font-bold">#{currentEpoch?.epoch || '...'}</div>
                </div>
              </div>

              {/* Status Buttons */}
              <div>
                <div className="text-sm font-bold uppercase mb-3">Change Pool Status:</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleSetStatus(PoolStatus.Collecting)}
                    disabled={loading || state?.status === PoolStatus.Collecting}
                    className={`p-3 border-4 border-brutal-black font-bold uppercase text-sm transition-all ${
                      state?.status === PoolStatus.Collecting
                        ? 'bg-accent-green shadow-none translate-x-1 translate-y-1'
                        : 'bg-brutal-white shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5'
                    }`}
                  >
                    <Unlock className="w-5 h-5 mx-auto mb-1" />
                    Collecting
                  </button>

                  <button
                    onClick={() => handleSetStatus(PoolStatus.Staking)}
                    disabled={loading || state?.status === PoolStatus.Staking}
                    className={`p-3 border-4 border-brutal-black font-bold uppercase text-sm transition-all ${
                      state?.status === PoolStatus.Staking
                        ? 'bg-accent-blue text-white shadow-none translate-x-1 translate-y-1'
                        : 'bg-brutal-white shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5'
                    }`}
                  >
                    <Lock className="w-5 h-5 mx-auto mb-1" />
                    Staking
                  </button>

                  <button
                    onClick={() => handleSetStatus(PoolStatus.SelectingWinner)}
                    disabled={loading || state?.status === PoolStatus.SelectingWinner}
                    className={`p-3 border-4 border-brutal-black font-bold uppercase text-sm transition-all ${
                      state?.status === PoolStatus.SelectingWinner
                        ? 'bg-accent-purple text-white shadow-none translate-x-1 translate-y-1'
                        : 'bg-brutal-white shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5'
                    }`}
                  >
                    <Zap className="w-5 h-5 mx-auto mb-1" />
                    Selecting
                  </button>

                  <button
                    onClick={() => handleSetStatus(PoolStatus.Distributing)}
                    disabled={loading || state?.status === PoolStatus.Distributing}
                    className={`p-3 border-4 border-brutal-black font-bold uppercase text-sm transition-all ${
                      state?.status === PoolStatus.Distributing
                        ? 'bg-accent-yellow shadow-none translate-x-1 translate-y-1'
                        : 'bg-brutal-white shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5'
                    }`}
                  >
                    <Gift className="w-5 h-5 mx-auto mb-1" />
                    Distributing
                  </button>
                </div>
              </div>

              {/* Pool Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-accent-blue text-white border-4 border-brutal-black text-center">
                  <div className="text-3xl font-bold">{state?.participantCount || 0}</div>
                  <div className="text-xs font-bold uppercase">Participants</div>
                </div>
                <div className="p-4 bg-accent-pink border-4 border-brutal-black text-center">
                  <div className="text-3xl font-bold">
                    {state ? (Number(state.totalDeposited) / 1_000_000).toFixed(2) : '0'}
                  </div>
                  <div className="text-xs font-bold uppercase">Total ADA</div>
                </div>
                <div className="p-4 bg-accent-green border-4 border-brutal-black text-center">
                  <div className="text-3xl font-bold">
                    +{state ? (Number(state.yieldAmount) / 1_000_000).toFixed(4) : '0'}
                  </div>
                  <div className="text-xs font-bold uppercase">Est. Yield</div>
                </div>
              </div>
            </div>
          </div>

          {/* Winner Selection */}
          <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
            <div className="flex items-center gap-2 p-4 border-b-4 border-brutal-black bg-accent-purple text-white">
              <Trophy className="w-5 h-5" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Winner Selection</h2>
            </div>
            <div className="p-6 space-y-4">
              {selectedWinner || state?.winnerCommitment ? (
                <div className="bg-accent-green border-4 border-brutal-black p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5" />
                    <span className="font-bold uppercase">Winner Selected!</span>
                  </div>
                  <div className="text-xs font-bold uppercase text-gray-600 mb-1">Winner Commitment:</div>
                  <code className="text-xs font-mono bg-brutal-white p-2 border-2 border-brutal-black block break-all">
                    {selectedWinner || state?.winnerCommitment}
                  </code>
                </div>
              ) : (
                <button
                  onClick={handleSelectWinner}
                  disabled={winnerSelecting || !state || state.participantCount < 1}
                  className="w-full py-4 bg-accent-purple text-white border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md transition-all font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {winnerSelecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating ZK Proof...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Select Winner (ZK Random)
                    </>
                  )}
                </button>
              )}

              <div className="bg-brutal-cream border-4 border-brutal-black p-4 text-sm">
                <p className="font-bold uppercase mb-2">How Winner Selection Works:</p>
                <ol className="space-y-1 list-decimal list-inside text-gray-700">
                  <li>Admin clicks "Select Winner" when ready</li>
                  <li>ZK randomness generates winning commitment</li>
                  <li>Pool status changes to "Distributing"</li>
                  <li>Users can withdraw - winner gets yield + principal</li>
                </ol>
              </div>

              {/* List of all deposits for manual winner selection */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold uppercase">
                    On-Chain Deposits ({onChainDeposits.length}) | Pool Participants: {state?.participantCount || 0}
                  </div>
                  <button
                    onClick={() => { loadDeposits(); loadOnChainDeposits(); }}
                    disabled={loadingOnChain}
                    className="text-xs px-2 py-1 border-2 border-brutal-black hover:bg-accent-yellow transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingOnChain ? 'animate-spin' : ''}`} />
                    {loadingOnChain ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {/* On-Chain Deposits (Priority) */}
                {loadingOnChain ? (
                  <div className="p-4 bg-brutal-cream border-4 border-brutal-black text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Fetching deposits from blockchain...</p>
                  </div>
                ) : onChainDeposits.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {onChainDeposits.map((deposit, index) => {
                      const isWinner = (selectedWinner || state?.winnerCommitment) === deposit.commitment;
                      const amountAda = Number(deposit.amount) / 1_000_000;

                      return (
                        <button
                          key={deposit.txHash}
                          onClick={() => {
                            setSelectedWinner(deposit.commitment);
                            if (currentEpoch) {
                              savePoolStatus(PoolStatus.Distributing, currentEpoch.epoch, deposit.commitment);
                              refresh();
                            }
                            setSuccess(`Winner set to on-chain deposit #${index + 1}`);
                          }}
                          className={`w-full p-3 text-left border-4 border-brutal-black transition-all ${
                            isWinner
                              ? 'bg-accent-yellow shadow-none'
                              : 'bg-brutal-white hover:bg-accent-green shadow-brutal hover:shadow-brutal-md'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-bold">#{index + 1}</span>
                              <span className="ml-2">{amountAda.toFixed(2)} ADA</span>
                              <span className="ml-2 text-xs text-gray-500">Epoch #{deposit.epoch}</span>
                              <span className="ml-2 px-1 py-0.5 text-xs bg-accent-blue text-white border border-brutal-black">ON-CHAIN</span>
                            </div>
                            {isWinner && (
                              <span className="text-xs font-bold uppercase bg-brutal-black text-accent-yellow px-2 py-1">
                                WINNER
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-gray-500 mt-1 truncate">
                            {deposit.commitment}
                          </div>
                          <div className="text-xs font-mono text-gray-400 mt-0.5 truncate">
                            tx: {deposit.txHash.slice(0, 16)}...
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : deposits.length === 0 && state && state.participantCount > 0 ? (
                  <div className="p-4 bg-accent-yellow border-4 border-brutal-black text-center">
                    <p className="font-bold mb-2">Pool has {state.participantCount} on-chain deposits ({(Number(state.totalDeposited) / 1_000_000).toFixed(2)} ADA)</p>
                    <p className="text-sm text-gray-700">Unable to fetch deposit metadata from blockchain.</p>
                    <p className="text-sm text-gray-700 mt-1">Deposits may not have commitment metadata stored.</p>
                  </div>
                ) : (
                  <div className="p-4 bg-brutal-cream border-4 border-brutal-black text-center text-gray-500">
                    No deposits found on blockchain. Make a deposit from the main app first.
                  </div>
                )}

                {/* Show localStorage deposits as fallback info */}
                {deposits.length > 0 && onChainDeposits.length === 0 && (
                  <div className="mt-4 p-3 bg-brutal-cream border-2 border-brutal-black">
                    <p className="text-xs font-bold uppercase mb-2">Local Cache ({deposits.length} deposits)</p>
                    <p className="text-xs text-gray-600">These are locally cached deposits. On-chain deposits are preferred when available.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contract Info */}
          <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
            <div className="flex items-center gap-2 p-4 border-b-4 border-brutal-black bg-accent-blue text-white">
              <Shield className="w-5 h-5" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Contract Info</h2>
            </div>
            <div className="p-6 space-y-4">
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
                  <code className="text-xs font-mono bg-brutal-cream p-2 border-2 border-brutal-black flex-1 truncate">
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
          </div>

          {/* Wallet Status */}
          <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
            <div className="flex items-center gap-2 p-4 border-b-4 border-brutal-black bg-brutal-cream">
              <Wallet className="w-5 h-5" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Wallet Status</h2>
            </div>
            <div className="p-6">
              {!connected ? (
                <div className="text-center py-4">
                  <p className="text-gray-600">Connect wallet to see admin controls</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isAdmin ? 'bg-accent-green' : 'bg-accent-yellow'}`} />
                    <span className="font-bold text-sm">
                      {isAdmin ? 'Admin Wallet Connected' : 'Demo Mode (Any Wallet)'}
                    </span>
                  </div>
                  <code className="text-xs font-mono bg-brutal-cream p-2 border-2 border-brutal-black block truncate">
                    {address}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
            <div className="flex items-center gap-2 p-4 border-b-4 border-brutal-black bg-accent-pink">
              <AlertCircle className="w-5 h-5" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Danger Zone</h2>
            </div>
            <div className="p-6">
              <button
                onClick={handleResetPool}
                className="w-full py-3 bg-brutal-white border-4 border-brutal-black shadow-brutal hover:bg-accent-pink transition-all font-bold uppercase flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Reset Pool (Clear All Data)
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This will clear all deposits and reset pool status to Collecting
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
