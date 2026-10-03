import React, { useState, useRef, useEffect } from 'react';
import { Activity, Clock } from 'lucide-react';

interface TapTempoButtonProps {
  currentBpm: number;
  onBpmChange: (bpm: number) => void;
  minBpm?: number;
  maxBpm?: number;
  className?: string;
}

export function TapTempoButton({
  currentBpm,
  onBpmChange,
  minBpm = 110,
  maxBpm = 175,
  className = ''
}: TapTempoButtonProps) {
  const [isTapped, setIsTapped] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapsRef = useRef<number[]>([]);
  const resetTimerRef = useRef<number | null>(null);

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const now = performance.now();

    // Trigger visual pulse
    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 120);

    // Reset buffer if delay is too long (over 2.2 seconds)
    if (tapsRef.current.length > 0) {
      const lastTap = tapsRef.current[tapsRef.current.length - 1];
      if (now - lastTap > 2200) {
        tapsRef.current = [];
      }
    }

    // Append tap timestamp (keep last 5 taps for responsive averaging)
    tapsRef.current.push(now);
    if (tapsRef.current.length > 6) {
      tapsRef.current.shift();
    }

    setTapCount(tapsRef.current.length);

    // Calculate BPM when at least 2 taps are registered
    if (tapsRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapsRef.current.length; i++) {
        intervals.push(tapsRef.current[i] - tapsRef.current[i - 1]);
      }

      // Calculate weighted or simple average of intervals in ms
      const avgInterval = intervals.reduce((acc, val) => acc + val, 0) / intervals.length;
      if (avgInterval > 0) {
        const rawBpm = Math.round(60000 / avgInterval);
        const clampedBpm = Math.max(minBpm, Math.min(maxBpm, rawBpm));
        onBpmChange(clampedBpm);
      }
    }

    // Clear reset timer
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
    // Automatically reset tap count display after 2.5s of inactivity
    resetTimerRef.current = window.setTimeout(() => {
      setTapCount(0);
      tapsRef.current = [];
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={handleTap}
      title="Click or tap in rhythm to set BPM dynamically"
      className={`px-2 py-1.5 rounded border select-none transition-all duration-75 flex items-center justify-center gap-1.5 cursor-pointer font-mono ${
        isTapped
          ? 'bg-amber-500 text-black border-amber-400 scale-95 shadow-[0_0_15px_#f59e0b]'
          : 'bg-[#18191f] hover:bg-[#23242c] text-[#a0a5b2] hover:text-white border-[#2b2d35] hover:border-[#424653]'
      } ${className}`}
    >
      {/* Flashing LED */}
      <span
        className={`w-2 h-2 rounded-full shrink-0 transition-all duration-75 ${
          isTapped
            ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
            : tapCount > 0
            ? 'bg-amber-600 animate-pulse'
            : 'bg-[#32343c]'
        }`}
      />
      <span className="text-[9px] font-bold uppercase tracking-wider truncate">TAP TEMPO</span>
      {tapCount > 1 && (
        <span className="text-[8px] px-1 bg-black/40 text-amber-300 rounded font-semibold shrink-0">
          {tapCount}
        </span>
      )}
    </button>
  );
}
