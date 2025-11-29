'use client';

import { useState, useEffect } from 'react';
import { usePool } from '@/hooks/usePool';
import { Clock, Timer } from 'lucide-react';

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
      <div className="bg-brutal-black text-brutal-white px-4 py-3 border-4 border-brutal-black min-w-[70px]">
        <span className="text-3xl font-bold font-mono block text-center">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs font-bold uppercase mt-2 tracking-wider">{label}</span>
    </div>
  );

  return (
    <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b-4 border-brutal-black bg-accent-purple text-white">
        <Timer className="w-5 h-5" />
        <h3 className="font-bold uppercase tracking-wider">Epoch Countdown</h3>
      </div>

      {/* Timer */}
      <div className="p-6 bg-brutal-cream">
        <div className="flex items-center justify-center gap-2">
          <TimeBlock value={days} label="Days" />
          <div className="text-3xl font-bold text-brutal-black self-start mt-3">:</div>
          <TimeBlock value={hours} label="Hours" />
          <div className="text-3xl font-bold text-brutal-black self-start mt-3">:</div>
          <TimeBlock value={minutes} label="Mins" />
          <div className="text-3xl font-bold text-brutal-black self-start mt-3">:</div>
          <TimeBlock value={seconds} label="Secs" />
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t-4 border-brutal-black bg-accent-yellow text-center">
        <span className="font-bold text-sm uppercase">
          Winner selected when timer ends!
        </span>
      </div>
    </div>
  );
}
