'use client';

import { useState, useEffect } from 'react';
import { usePool } from '@/hooks/usePool';
import { Clock } from 'lucide-react';

export function EpochTimer() {
  const { state, getTimeRemaining } = usePool();
  const [time, setTime] = useState(getTimeRemaining());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [getTimeRemaining]);

  if (!time || !state) return null;

  const { days, hours, minutes, seconds } = time;

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-midnight-800 rounded-lg px-3 py-2 min-w-[60px]">
        <span className="text-2xl font-bold font-mono">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );

  return (
    <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-cardano-400" />
        <h3 className="font-medium">Epoch Ends In</h3>
      </div>

      <div className="flex items-center justify-center gap-2">
        <TimeBlock value={days} label="DAYS" />
        <span className="text-2xl text-gray-600">:</span>
        <TimeBlock value={hours} label="HOURS" />
        <span className="text-2xl text-gray-600">:</span>
        <TimeBlock value={minutes} label="MINS" />
        <span className="text-2xl text-gray-600">:</span>
        <TimeBlock value={seconds} label="SECS" />
      </div>
    </div>
  );
}
