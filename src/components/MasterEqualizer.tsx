import React, { useRef, useEffect } from 'react';
import { Sliders, RotateCcw, Volume2, Sparkles, Check, Flame, ShieldAlert, Zap, ShieldCheck } from 'lucide-react';

interface MasterEqualizerProps {
  lowGain: number;   // -12 to +12 dB
  midGain: number;   // -12 to +12 dB
  highGain: number;  // -12 to +12 dB
  onLowGainChange: (gain: number) => void;
  onMidGainChange: (gain: number) => void;
  onHighGainChange: (gain: number) => void;
  onResetEq: () => void;
  isNormalized: boolean;
  onToggleNormalize?: () => void;
  normalizationStats?: {
    originalPeakDb: number;
    gainAppliedDb: number;
    targetPeakDb: number;
  } | null;
  softLimiterEnabled?: boolean;
  onToggleSoftLimiter?: () => void;
}

export function MasterEqualizer({
  lowGain,
  midGain,
  highGain,
  onLowGainChange,
  onMidGainChange,
  onHighGainChange,
  onResetEq,
  isNormalized,
  onToggleNormalize,
  normalizationStats,
  softLimiterEnabled = true,
  onToggleSoftLimiter
}: MasterEqualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw interactive EQ Curve preview with limiter ceiling line
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    // Center 0dB line
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // 0dB label
    ctx.fillStyle = '#555a66';
    ctx.font = '8px monospace';
    ctx.fillText('0 dB', 4, midY - 3);
    ctx.fillText('+12', 4, 10);
    ctx.fillText('-12', 4, height - 3);

    // If soft limiter is active, draw hard-knee brickwall threshold line at -1.0dB
    if (softLimiterEnabled) {
      const limiterY = midY - (-1.0 / 14) * (midY - 4);
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, limiterY);
      ctx.lineTo(width, limiterY);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillText('LIMIT -1dB', width - 52, limiterY - 3);
      ctx.restore();
    }

    // Draw Frequency response curve
    ctx.save();
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 68, 68, 0.5)';
    ctx.shadowBlur = 6;
    ctx.setLineDash([]);
    ctx.beginPath();

    const points = 60;
    for (let i = 0; i <= points; i++) {
      const xNorm = i / points;
      const x = xNorm * width;

      const lowInfluence = Math.max(0, 1 - xNorm * 3.2);
      const midInfluence = Math.exp(-Math.pow((xNorm - 0.5) * 4.5, 2));
      const highInfluence = Math.max(0, (xNorm - 0.65) * 2.8);

      const netDb = (lowGain * lowInfluence) + (midGain * midInfluence) + (highGain * highInfluence);
      const y = midY - (netDb / 14) * (midY - 4);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fillStyle = 'rgba(255, 68, 68, 0.08)';
    ctx.fill();
    ctx.restore();
  }, [lowGain, midGain, highGain, softLimiterEnabled]);

  const eqPresets = [
    { name: 'FLAT', low: 0, mid: 0, high: 0 },
    { name: 'SUB BOMB', low: 5.5, mid: 0, high: 1.5 },
    { name: 'ACID BITE', low: 1.0, mid: 4.5, high: 3.0 },
    { name: 'DARK DUB', low: 4.0, mid: -2.5, high: -3.5 },
    { name: 'RAVE SIZZLE', low: 3.0, mid: 1.0, high: 4.5 }
  ];

  return (
    <div className="w-full bg-[#111216] border border-[#262832] rounded p-4 font-mono space-y-3.5 select-none shadow-inner">
      {/* Header with Title and Switches */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#21232b] pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-red-500" />
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">
            Master Equalizer & Output Stage
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Soft Limiter Switch with Hard-Knee Logic */}
          {onToggleSoftLimiter && (
            <button
              type="button"
              onClick={onToggleSoftLimiter}
              className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                softLimiterEnabled
                  ? 'bg-red-500/20 text-red-400 border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.25)]'
                  : 'bg-[#1b1c24] text-[#717582] border-[#2d303d] hover:text-white'
              }`}
              title="Soft Limiter with hard-knee limiter logic to prevent clipping before final export"
            >
              <ShieldCheck className={`w-3 h-3 ${softLimiterEnabled ? 'text-red-400' : 'text-[#666]'}`} />
              <span>SOFT LIMITER: {softLimiterEnabled ? 'ON (HARD-KNEE)' : 'OFF'}</span>
            </button>
          )}

          {/* Normalization Toggle Switch */}
          {onToggleNormalize && (
            <button
              type="button"
              onClick={onToggleNormalize}
              className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                isNormalized
                  ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.25)]'
                  : 'bg-[#1b1c24] text-[#8e9299] border-[#2d303d] hover:text-white'
              }`}
              title="Click to toggle -1.0dB Volume Normalization"
            >
              <Zap className={`w-3 h-3 ${isNormalized ? 'fill-green-400 text-green-400' : 'text-[#666]'}`} />
              <span>NORM -1.0dB: {isNormalized ? 'ON' : 'OFF'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onResetEq}
            title="Reset EQ to flat (0 dB)"
            className="p-1 text-[#6e727e] hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Normalization & Limiter Info Bar */}
      <div className="bg-[#0c0d10] border border-[#1f212a] rounded p-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${softLimiterEnabled ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-[#333]'}`} />
          <span className="text-white font-bold uppercase tracking-wide">
            {softLimiterEnabled ? 'Hard-Knee Brickwall Protected' : 'Limiter Bypassed'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[#8e9299]">
          <span>CEILING: <b className="text-white">-1.0 dBFS</b></span>
          {normalizationStats && (
            <>
              <span>INPUT PEAK: <b className="text-amber-400">{normalizationStats.originalPeakDb} dBFS</b></span>
              <span>
                GAIN: <b className="text-green-400">
                  {normalizationStats.gainAppliedDb >= 0 ? `+${normalizationStats.gainAppliedDb}` : normalizationStats.gainAppliedDb} dB
                </b>
              </span>
            </>
          )}
          <span className="text-red-400 text-[9px] font-bold">KNEE: 0 dB</span>
        </div>
      </div>

      {/* EQ Response Visual Curve */}
      <div className="relative w-full h-14 bg-[#0a0a0c] rounded border border-[#20222a] overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={56} 
          className="w-full h-full block" 
        />
        <div className="absolute bottom-1 right-2 flex gap-4 text-[8px] text-[#555a66] uppercase pointer-events-none">
          <span>100Hz</span>
          <span>1.5kHz</span>
          <span>8.5kHz</span>
        </div>
      </div>

      {/* 3 Frequency Shelf Controls: Low, Mid, High */}
      <div className="grid grid-cols-3 gap-3">
        {/* Low Shelf (100 Hz) */}
        <div className="bg-[#16171d] border border-[#242630] rounded p-2.5 flex flex-col justify-between group hover:border-[#383a47] transition-colors">
          <div className="flex justify-between items-start text-[9px] mb-1">
            <div>
              <div className="font-bold text-white uppercase">LOW SHELF</div>
              <div className="text-[#6c707d] text-[8px]">100 Hz (Sub Kick)</div>
            </div>
            <span className={`font-bold ${lowGain > 0 ? 'text-red-400' : lowGain < 0 ? 'text-blue-400' : 'text-white'}`}>
              {lowGain > 0 ? `+${lowGain.toFixed(1)}` : lowGain.toFixed(1)} dB
            </span>
          </div>
          <input
            type="range"
            min="-12"
            max="12"
            step="0.5"
            value={lowGain}
            onChange={(e) => onLowGainChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#252733] accent-red-500 cursor-pointer mt-1"
          />
        </div>

        {/* Mid Peaking (1.5 kHz) */}
        <div className="bg-[#16171d] border border-[#242630] rounded p-2.5 flex flex-col justify-between group hover:border-[#383a47] transition-colors">
          <div className="flex justify-between items-start text-[9px] mb-1">
            <div>
              <div className="font-bold text-white uppercase">MID PEAK</div>
              <div className="text-[#6c707d] text-[8px]">1.5 kHz (Acid/Snare)</div>
            </div>
            <span className={`font-bold ${midGain > 0 ? 'text-green-400' : midGain < 0 ? 'text-blue-400' : 'text-white'}`}>
              {midGain > 0 ? `+${midGain.toFixed(1)}` : midGain.toFixed(1)} dB
            </span>
          </div>
          <input
            type="range"
            min="-12"
            max="12"
            step="0.5"
            value={midGain}
            onChange={(e) => onMidGainChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#252733] accent-green-500 cursor-pointer mt-1"
          />
        </div>

        {/* High Shelf (8.5 kHz) */}
        <div className="bg-[#16171d] border border-[#242630] rounded p-2.5 flex flex-col justify-between group hover:border-[#383a47] transition-colors">
          <div className="flex justify-between items-start text-[9px] mb-1">
            <div>
              <div className="font-bold text-white uppercase">HIGH SHELF</div>
              <div className="text-[#6c707d] text-[8px]">8.5 kHz (Hats/Air)</div>
            </div>
            <span className={`font-bold ${highGain > 0 ? 'text-amber-400' : highGain < 0 ? 'text-blue-400' : 'text-white'}`}>
              {highGain > 0 ? `+${highGain.toFixed(1)}` : highGain.toFixed(1)} dB
            </span>
          </div>
          <input
            type="range"
            min="-12"
            max="12"
            step="0.5"
            value={highGain}
            onChange={(e) => onHighGainChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#252733] accent-amber-500 cursor-pointer mt-1"
          />
        </div>
      </div>

      {/* Quick EQ Presets Strip */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#1d1f27]">
        <span className="text-[9px] text-[#636773] uppercase mr-1">PRESETS:</span>
        {eqPresets.map((pr) => {
          const isSelected = lowGain === pr.low && midGain === pr.mid && highGain === pr.high;
          return (
            <button
              key={pr.name}
              type="button"
              onClick={() => {
                onLowGainChange(pr.low);
                onMidGainChange(pr.mid);
                onHighGainChange(pr.high);
              }}
              className={`px-2 py-0.5 text-[9px] uppercase rounded border transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-red-500/20 text-red-400 border-red-500 font-bold' 
                  : 'bg-[#14151b] border-[#22242c] text-[#717582] hover:text-white'
              }`}
            >
              {pr.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
