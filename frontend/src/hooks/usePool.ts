'use client';

import { useState, useEffect, useCallback } from 'react';
import { PoolState, PoolStatus } from '@/types';

// Mock pool state for demo
const MOCK_POOL_STATE: PoolState = {
  epochId: 1,
  status: PoolStatus.Collecting,
  totalDeposited: BigInt(300_000_000), // 300 ADA
  participantCount: 3,
  yieldAmount: BigInt(5_000_000), // 5 ADA
  epochEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
  winnerCommitment: null,
};

export function usePool() {
  const [state, setState] = useState<PoolState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch pool state
  const fetchPoolState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // In production, this would fetch from Cardano/Midnight
      // For demo, use mock state
      await new Promise((resolve) => setTimeout(resolve, 500));
      setState(MOCK_POOL_STATE);
    } catch (err) {
      console.error('Failed to fetch pool state:', err);
      setError('Failed to fetch pool state');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPoolState();
  }, [fetchPoolState]);

  // Calculate time remaining
  const getTimeRemaining = useCallback(() => {
    if (!state?.epochEnd) return null;

    const now = new Date();
    const diff = state.epochEnd.getTime() - now.getTime();

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  }, [state?.epochEnd]);

  // Check if pool is accepting deposits
  const canDeposit = state?.status === PoolStatus.Collecting;

  // Check if withdrawals are open
  const canWithdraw = state?.status === PoolStatus.Distributing;

  return {
    state,
    loading,
    error,
    canDeposit,
    canWithdraw,
    getTimeRemaining,
    refresh: fetchPoolState,
  };
}
