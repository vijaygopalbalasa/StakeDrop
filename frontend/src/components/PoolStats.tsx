'use client';

import { usePool } from '@/hooks/usePool';
import { formatAda } from '@/lib/constants';
import { PoolStatus } from '@/types';
import { Users, Coins, Trophy, Clock, TrendingUp, Lock } from 'lucide-react';

export function PoolStats() {
  const { state, loading, getTimeRemaining } = usePool();
  const timeRemaining = getTimeRemaining();

  if (loading) {
    return (
      <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-midnight-800 rounded w-1/3" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-midnight-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
        <p className="text-gray-400">No active pool</p>
      </div>
    );
  }

  const statusColors = {
    [PoolStatus.Collecting]: 'text-green-400 bg-green-400/10',
    [PoolStatus.Staking]: 'text-blue-400 bg-blue-400/10',
    [PoolStatus.Distributing]: 'text-yellow-400 bg-yellow-400/10',
    [PoolStatus.Completed]: 'text-gray-400 bg-gray-400/10',
  };

  const statusIcons = {
    [PoolStatus.Collecting]: <Coins className="w-4 h-4" />,
    [PoolStatus.Staking]: <Lock className="w-4 h-4" />,
    [PoolStatus.Distributing]: <Trophy className="w-4 h-4" />,
    [PoolStatus.Completed]: <Clock className="w-4 h-4" />,
  };

  return (
    <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Pool Stats</h2>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusColors[state.status]}`}>
          {statusIcons[state.status]}
          <span className="text-sm font-medium">{state.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TVL */}
        <div className="bg-midnight-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Coins className="w-4 h-4" />
            Total Value Locked
          </div>
          <div className="text-2xl font-bold text-cardano-400">
            {formatAda(state.totalDeposited)} ADA
          </div>
        </div>

        {/* Participants */}
        <div className="bg-midnight-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Users className="w-4 h-4" />
            Participants
          </div>
          <div className="text-2xl font-bold text-white">
            {state.participantCount}
          </div>
        </div>

        {/* Yield */}
        <div className="bg-midnight-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <TrendingUp className="w-4 h-4" />
            Current Yield
          </div>
          <div className="text-2xl font-bold text-green-400">
            +{formatAda(state.yieldAmount)} ADA
          </div>
        </div>

        {/* Time Remaining */}
        <div className="bg-midnight-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Clock className="w-4 h-4" />
            Time Remaining
          </div>
          {timeRemaining && (
            <div className="text-2xl font-bold text-white">
              {timeRemaining.days}d {timeRemaining.hours}h
            </div>
          )}
        </div>
      </div>

      {/* Epoch Info */}
      <div className="mt-4 pt-4 border-t border-midnight-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Epoch #{state.epochId}</span>
          <span className="text-gray-400">
            Ends: {state.epochEnd.toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
