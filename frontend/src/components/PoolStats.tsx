'use client';

import { usePool } from '@/hooks/usePool';
import { formatAda } from '@/lib/constants';
import { PoolStatus } from '@/types';
import { Users, Coins, Trophy, Clock, TrendingUp, Lock, AlertCircle, RefreshCw, Zap } from 'lucide-react';

export function PoolStats() {
  const { state, loading, error, epochInfo, getTimeRemaining, refresh } = usePool();
  const timeRemaining = getTimeRemaining();

  if (loading) {
    return (
      <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal p-8">
        <div className="flex items-center justify-center gap-4">
          <div className="spinner-brutal w-8 h-8" />
          <span className="font-bold uppercase">Loading Pool Data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-accent-pink border-4 border-brutal-black shadow-brutal p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6" />
          <span className="font-bold uppercase">Failed to Load Pool Data</span>
        </div>
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 bg-brutal-white border-3 border-brutal-black hover:shadow-brutal-sm transition-all font-bold text-sm uppercase"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="bg-brutal-cream border-4 border-brutal-black shadow-brutal p-8 text-center">
        <div className="w-16 h-16 bg-brutal-black mx-auto mb-4 flex items-center justify-center">
          <Coins className="w-8 h-8 text-accent-yellow" />
        </div>
        <p className="font-bold uppercase">No Active Pool</p>
      </div>
    );
  }

  const statusConfig: Record<PoolStatus, { bg: string; icon: React.ReactNode; label: string }> = {
    [PoolStatus.Collecting]: {
      bg: 'bg-accent-green',
      icon: <Coins className="w-5 h-5" />,
      label: 'Accepting Deposits',
    },
    [PoolStatus.Staking]: {
      bg: 'bg-accent-blue text-white',
      icon: <Lock className="w-5 h-5" />,
      label: 'Staking Active',
    },
    [PoolStatus.SelectingWinner]: {
      bg: 'bg-accent-purple text-white',
      icon: <Zap className="w-5 h-5" />,
      label: 'Selecting Winner',
    },
    [PoolStatus.Distributing]: {
      bg: 'bg-accent-yellow',
      icon: <Trophy className="w-5 h-5" />,
      label: 'Distributing Rewards',
    },
    [PoolStatus.Completed]: {
      bg: 'bg-brutal-cream',
      icon: <Clock className="w-5 h-5" />,
      label: 'Epoch Completed',
    },
  };

  const currentStatus = statusConfig[state.status];

  return (
    <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
      {/* Header with Status */}
      <div className="flex items-center justify-between p-4 border-b-4 border-brutal-black bg-accent-yellow">
        <h2 className="text-xl font-bold uppercase tracking-wider">Pool Stats</h2>
        <div className={`flex items-center gap-2 px-4 py-2 border-3 border-brutal-black ${currentStatus.bg}`}>
          {currentStatus.icon}
          <span className="font-bold text-sm uppercase">{currentStatus.label}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {/* TVL */}
        <div className="p-6 border-r-4 border-b-4 lg:border-b-0 border-brutal-black bg-accent-blue text-white">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5" />
            <span className="font-bold text-sm uppercase">Total Value Locked</span>
          </div>
          <div className="text-3xl font-bold">
            {formatAda(state.totalDeposited)}
            <span className="text-lg ml-1">ADA</span>
          </div>
        </div>

        {/* Participants */}
        <div className="p-6 border-b-4 lg:border-b-0 lg:border-r-4 border-brutal-black bg-accent-pink">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5" />
            <span className="font-bold text-sm uppercase">Participants</span>
          </div>
          <div className="text-3xl font-bold">
            {state.participantCount}
            <span className="text-lg ml-1">users</span>
          </div>
        </div>

        {/* Yield */}
        <div className="p-6 border-r-4 border-brutal-black bg-accent-green">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="font-bold text-sm uppercase">Current Yield</span>
          </div>
          <div className="text-3xl font-bold">
            +{formatAda(state.yieldAmount)}
            <span className="text-lg ml-1">ADA</span>
          </div>
        </div>

        {/* Time Remaining */}
        <div className="p-6 bg-accent-yellow">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-bold text-sm uppercase">Time Left</span>
          </div>
          {timeRemaining && (
            <div className="text-3xl font-bold">
              {timeRemaining.days}d {timeRemaining.hours}h
            </div>
          )}
        </div>
      </div>

      {/* Epoch Info Footer */}
      <div className="flex items-center justify-between p-4 border-t-4 border-brutal-black bg-brutal-cream">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brutal-black text-brutal-white flex items-center justify-center font-bold text-sm">
            #{state.epochId}
          </div>
          <span className="font-bold uppercase text-sm">Epoch</span>
        </div>
        <span className="font-mono text-sm">
          Ends: {state.epochEnd.toLocaleDateString()} {state.epochEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
