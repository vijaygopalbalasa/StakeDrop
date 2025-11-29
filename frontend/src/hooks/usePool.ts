'use client';

import { useState, useEffect, useCallback } from 'react';
import { PoolState, PoolStatus } from '@/types';
import {
  getCurrentEpoch,
  getEpochTimeRemaining,
  isBlockfrostConfigured,
  EpochInfo,
  getAddressUtxos,
  lovelaceToAda,
} from '@/lib/blockfrost';
import { getPoolScriptAddress, POOL_VALIDATOR_HASH } from '@/lib/contract';
import { NETWORK } from '@/lib/constants';

// Storage key for pool deposits (localStorage backup for demo)
const POOL_STORAGE_KEY = 'stakedrop_pool_deposits';

interface StoredDeposit {
  commitment: string;
  amount: string; // lovelace as string for JSON serialization
  timestamp: number;
  epochId: number;
}

// Get stored deposits from localStorage
function getStoredDeposits(): StoredDeposit[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(POOL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save deposit to localStorage
export function saveDeposit(deposit: StoredDeposit): void {
  if (typeof window === 'undefined') return;
  const deposits = getStoredDeposits();
  deposits.push(deposit);
  localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify(deposits));
}

// Calculate pool state from stored deposits
function calculatePoolStateFromDeposits(
  deposits: StoredDeposit[],
  currentEpochId: number
): { totalDeposited: bigint; participantCount: number } {
  const currentEpochDeposits = deposits.filter(d => d.epochId === currentEpochId);

  const totalDeposited = currentEpochDeposits.reduce(
    (sum, d) => sum + BigInt(d.amount),
    BigInt(0)
  );

  return {
    totalDeposited,
    participantCount: currentEpochDeposits.length,
  };
}

// Estimate yield based on epoch and stake (simplified calculation)
// Real yield would come from stake pool rewards
function estimateYield(totalDeposited: bigint, epochInfo: EpochInfo): bigint {
  // Approximate 4.5% APY for Cardano staking
  // Epoch is ~5 days, so per-epoch yield is approximately:
  // 4.5% / 73 epochs per year ≈ 0.0616% per epoch
  const APY_RATE = 0.045;
  const EPOCHS_PER_YEAR = 73;
  const perEpochRate = APY_RATE / EPOCHS_PER_YEAR;

  const yieldAmount = Number(totalDeposited) * perEpochRate;
  return BigInt(Math.floor(yieldAmount));
}

export function usePool() {
  const [state, setState] = useState<PoolState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null);

  // Fetch pool state from blockchain
  const fetchPoolState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if Blockfrost is configured
      if (!isBlockfrostConfigured()) {
        setError('Blockfrost API not configured. Please set NEXT_PUBLIC_BLOCKFROST_PROJECT_ID');
        setLoading(false);
        return;
      }

      // Fetch current epoch from Cardano blockchain
      const currentEpoch = await getCurrentEpoch();
      setEpochInfo(currentEpoch);

      // Get the pool script address
      const scriptAddress = getPoolScriptAddress(NETWORK as 'mainnet' | 'preview' | 'preprod');

      // Try to fetch UTxOs from the pool script address on blockchain
      let totalDeposited = BigInt(0);
      let participantCount = 0;

      try {
        const utxos = await getAddressUtxos(scriptAddress);

        // Sum up all lovelace in the script address
        for (const utxo of utxos) {
          const lovelaceAmount = utxo.amount.find(a => a.unit === 'lovelace');
          if (lovelaceAmount) {
            totalDeposited += BigInt(lovelaceAmount.quantity);
            participantCount++; // Each UTxO represents a deposit
          }
        }

        console.log('Pool state from blockchain:', {
          scriptAddress,
          utxoCount: utxos.length,
          totalDeposited: totalDeposited.toString(),
          participantCount,
        });
      } catch (utxoError) {
        // Fall back to localStorage if blockchain query fails
        console.log('Falling back to localStorage for pool state');
        const deposits = getStoredDeposits();
        const localState = calculatePoolStateFromDeposits(deposits, currentEpoch.epoch);
        totalDeposited = localState.totalDeposited;
        participantCount = localState.participantCount;
      }

      // Estimate yield based on pool size
      const yieldAmount = estimateYield(totalDeposited, currentEpoch);

      // Determine pool status based on epoch timing
      const timeRemaining = getEpochTimeRemaining(currentEpoch);
      let status: PoolStatus;

      if (timeRemaining.totalSeconds > 3 * 24 * 60 * 60) {
        // More than 3 days left - collecting deposits
        status = PoolStatus.Collecting;
      } else if (timeRemaining.totalSeconds > 1 * 24 * 60 * 60) {
        // 1-3 days left - staking in progress
        status = PoolStatus.Staking;
      } else if (timeRemaining.totalSeconds > 0) {
        // Less than 1 day - selecting winner
        status = PoolStatus.SelectingWinner;
      } else {
        // Epoch ended - distributing
        status = PoolStatus.Distributing;
      }

      // Build pool state from real blockchain data
      const poolState: PoolState = {
        epochId: currentEpoch.epoch,
        status,
        totalDeposited,
        participantCount,
        yieldAmount,
        epochEnd: new Date(currentEpoch.end_time * 1000),
        winnerCommitment: null, // Would come from Midnight contract
      };

      setState(poolState);
    } catch (err) {
      console.error('Failed to fetch pool state:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pool state');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPoolState();
  }, [fetchPoolState]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchPoolState, 30000);
    return () => clearInterval(interval);
  }, [fetchPoolState]);

  // Calculate time remaining using real epoch data
  const getTimeRemaining = useCallback(() => {
    if (!epochInfo) return null;

    const remaining = getEpochTimeRemaining(epochInfo);
    return {
      days: remaining.days,
      hours: remaining.hours,
      minutes: remaining.minutes,
      seconds: remaining.seconds,
    };
  }, [epochInfo]);

  // Check if pool is accepting deposits
  const canDeposit = state?.status === PoolStatus.Collecting;

  // Check if withdrawals are open
  const canWithdraw = state?.status === PoolStatus.Distributing;

  return {
    state,
    loading,
    error,
    epochInfo,
    canDeposit,
    canWithdraw,
    getTimeRemaining,
    refresh: fetchPoolState,
  };
}
