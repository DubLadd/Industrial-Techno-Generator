import React, { useRef, useEffect, useState } from 'react';
import { Activity, BarChart2, Radio, Sliders, RefreshCw, Zap } from 'lucide-react';

export type VisualizerMode = 'Bars' | 'Oscilloscope' | 'Circular Spectrum';
export type VisualizerColor = 'red' | 'green' | 'amber' | 'cyan';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  className?: string;
}

export function AudioVisualizer({
  analyserNode,
  isPlaying,
  className = ''
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>('Bars');
  const [colorTheme, setColorTheme] = useState<VisualizerColor>('red');
  const [gainBoost, setGainBoost] = useState<number>(1.2);
  
  // Real-time audio metrics
  const [peakDb, setPeakDb] = useState<number>(-96);
  const [rmsVal, setRmsVal] = useState<number>(0);
  const [subHit, setSubHit] = useState<boolean>(false);

  // Peak hold array for spectrum bars
  const peakHoldRef = useRef<number[]>([]);
  const peakDecayRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Color profiles
  const colorMap = {
    red: {
      primary: '#ff3333',
      secondary: '#ff7733',
      accent: '#ff0033',
      glow: 'rgba(255, 51, 51, 0.4)',
      grid: 'rgba(255, 51, 51, 0.1)',
      bgRgb: [255, 51, 51]
    },
    green: {
      primary: '#22c55e',
      secondary: '#86efac',
      accent: '#15803d',
      glow: 'rgba(34, 197, 94, 0.4)',
      grid: 'rgba(34, 197, 94, 0.1)',
      bgRgb: [34, 197, 94]
    },
    amber: {
      primary: '#f59e0b',
      secondary: '#fde68a',
      accent: '#d97706',
      glow: 'rgba(245, 158, 11, 0.4)',
      grid: 'rgba(245, 158, 11, 0.1)',
      bgRgb: [245, 158, 11]
    },
    cyan: {
      primary: '#06b6d4',
      secondary: '#a5f3fc',
      accent: '#0891b2',
      glow: 'rgba(6, 182, 212, 0.4)',
      grid: 'rgba(6, 182, 212, 0.1)',
      bgRgb: [6, 182, 212]
    }
  };

  // Toggle through the visualization modes
  const handleToggleMode = () => {
    const modes: VisualizerMode[] = ['Bars', 'Oscilloscope', 'Circular Spectrum'];
    const nextIdx = (modes.indexOf(mode) + 1) % modes.length;
    setMode(modes[nextIdx]);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let subHitCooldown = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const theme = colorMap[colorTheme];

      // Clear with dark persistence trail for analog CRT feel
      ctx.fillStyle = 'rgba(10, 10, 12, 0.35)';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle background grid
      drawGrid(ctx, width, height, theme.grid);

      if (analyserNode && isPlaying) {
        const bufferLength = analyserNode.frequencyBinCount;
        const freqData = new Uint8Array(bufferLength);
        const timeData = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(freqData);
        analyserNode.getByteTimeDomainData(timeData);

        // Calculate Sub-Bass (< 100Hz) Energy
        let subSum = 0;
        const subBins = Math.min(8, bufferLength);
        for (let i = 0; i < subBins; i++) {
          subSum += freqData[i];
        }
        const avgSub = subSum / subBins;

        if (avgSub > 175 && subHitCooldown <= 0) {
          setSubHit(true);
          subHitCooldown = 8;
        } else {
          if (subHitCooldown > 0) subHitCooldown--;
          if (subHitCooldown === 0) setSubHit(false);
        }

        // Calculate RMS and Peak dB
        let sumSquares = 0;
        let maxSample = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normalized = (timeData[i] - 128) / 128;
          sumSquares += normalized * normalized;
          if (Math.abs(normalized) > maxSample) {
            maxSample = Math.abs(normalized);
          }
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        const calculatedDb = maxSample > 0.0001 ? 20 * Math.log10(maxSample) : -96;
        
        if (Math.random() < 0.15) {
          setPeakDb(Math.max(-96, Math.min(0, Math.round(calculatedDb * 10) / 10)));
          setRmsVal(Math.round(rms * 100));
        }

        if (mode === 'Bars') {
          drawBars(ctx, freqData, width, height, theme, gainBoost);
        } else if (mode === 'Oscilloscope') {
          drawOscilloscope(ctx, timeData, width, height, theme, gainBoost);
        } else if (mode === 'Circular Spectrum') {
          drawCircularSpectrum(ctx, freqData, width, height, theme, gainBoost);
        }
      } else {
        drawIdle(ctx, width, height, theme, mode);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserNode, isPlaying, mode, colorTheme, gainBoost]);

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, gridColor: string) => {
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    const cols = 8;
    const rows = 4;
    for (let c = 1; c < cols; c++) {
      const x = (width / cols) * c;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      const y = (height / rows) * r;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawBars = (
    ctx: CanvasRenderingContext2D,
    freqData: Uint8Array,
    width: number,
    height: number,
    theme: any,
    gain: number
  ) => {
    const barCount = 36;
    const spacing = 3;
    const totalBarWidth = (width - (barCount + 1) * spacing) / barCount;
    const segmentHeight = 4;
    const segmentGap = 1.5;

    if (peakHoldRef.current.length !== barCount) {
      peakHoldRef.current = new Array(barCount).fill(0);
      peakDecayRef.current = new Array(barCount).fill(0);
    }

    for (let i = 0; i < barCount; i++) {
      const binIndex = Math.floor(Math.pow(i / barCount, 1.8) * (freqData.length * 0.75));
      const rawVal = freqData[binIndex] || 0;
      const boosted = Math.min(255, rawVal * gain);
      const barHeightNorm = boosted / 255;
      const barHeightPx = barHeightNorm * (height - 24);

      const x = spacing + i * (totalBarWidth + spacing);

      if (barHeightPx > peakHoldRef.current[i]) {
        peakHoldRef.current[i] = barHeightPx;
        peakDecayRef.current[i] = 12;
      } else {
        if (peakDecayRef.current[i] > 0) {
          peakDecayRef.current[i]--;
        } else {
          peakHoldRef.current[i] = Math.max(0, peakHoldRef.current[i] - 1.8);
        }
      }

      const numSegments = Math.floor(barHeightPx / (segmentHeight + segmentGap));
      for (let s = 0; s < numSegments; s++) {
        const segY = height - 16 - (s + 1) * (segmentHeight + segmentGap);
        const segNorm = s / ((height - 24) / (segmentHeight + segmentGap));

        if (segNorm > 0.85) {
          ctx.fillStyle = '#ff2222';
        } else if (segNorm > 0.65) {
          ctx.fillStyle = '#ffaa00';
        } else {
          ctx.fillStyle = theme.primary;
        }

        ctx.fillRect(x, segY, totalBarWidth, segmentHeight);
      }

      const peakY = height - 16 - peakHoldRef.current[i];
      if (peakY < height - 18) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = 4;
        ctx.fillRect(x, peakY, totalBarWidth, 2);
        ctx.shadowBlur = 0;
      }
    }

    // Baseline frequency labels
    ctx.fillStyle = '#666970';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    const keyLabels = [
      { text: '32', idx: 1 },
      { text: '63', idx: 5 },
      { text: '125', idx: 10 },
      { text: '250', idx: 15 },
      { text: '500', idx: 20 },
      { text: '1k', idx: 25 },
      { text: '4k', idx: 30 },
      { text: '16k', idx: 34 }
    ];
    keyLabels.forEach(lbl => {
      const lx = spacing + lbl.idx * (totalBarWidth + spacing) + totalBarWidth / 2;
      ctx.fillText(lbl.text, lx, height - 4);
    });
  };

  const drawOscilloscope = (
    ctx: CanvasRenderingContext2D,
    timeData: Uint8Array,
    width: number,
    height: number,
    theme: any,
    gain: number
  ) => {
    ctx.save();
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    const sliceWidth = width / timeData.length;
    let x = 0;

    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      const y = height / 2 + v * (height / 2.2) * gain;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();

    // Center reference line
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.restore();
  };

  const drawCircularSpectrum = (
    ctx: CanvasRenderingContext2D,
    freqData: Uint8Array,
    width: number,
    height: number,
    theme: any,
    gain: number
  ) => {
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    const baseRadius = Math.min(width, height) * 0.22;

    // Outer concentric radar grids
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Radial frequency spikes
    const count = 72;
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 8;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const binIdx = Math.floor((i / count) * (freqData.length * 0.5));
      const val = (freqData[binIdx] / 255) * gain;
      const r = baseRadius + val * (Math.min(width, height) * 0.25);

      const x1 = cx + Math.cos(angle) * baseRadius;
      const y1 = cy + Math.sin(angle) * baseRadius;
      const x2 = cx + Math.cos(angle) * r;
      const y2 = cy + Math.sin(angle) * r;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Inner glowing core
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawIdle = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: any,
    currentMode: VisualizerMode
  ) => {
    const time = Date.now() * 0.002;
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 105, 115, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);

    if (currentMode === 'Circular Spectrum') {
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) * 0.22;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#555962';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('• CIRCULAR RADAR STANDBY •', cx, cy - 8);
    } else {
      ctx.beginPath();
      for (let x = 0; x < width; x += 5) {
        const noise = Math.sin(x * 0.05 + time) * 1.5;
        const y = height / 2 + noise;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#555962';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`• ${currentMode.toUpperCase()} STANDBY •`, width / 2, height / 2 - 12);
    }

    ctx.restore();
  };

  return (
    <div className={`hardware-card p-4 flex flex-col gap-3 relative ${className}`}>
      {/* Top Bar: Visualizer Status, Mode indicator, Sub LED & Real-time Meters */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24262b] pb-2 text-[10px] font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`status-led ${isPlaying ? 'active pulse' : ''}`} />
            <span className="uppercase text-[#8e9299] tracking-wider font-semibold">
              {isPlaying ? `ACTIVE: ${mode.toUpperCase()}` : 'MONITOR IDLE'}
            </span>
          </div>

          {/* Sub Punch LED */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#2d2f36]">
            <div 
              className={`w-2 h-2 rounded-full transition-all duration-75 ${
                subHit ? 'bg-red-500 shadow-[0_0_10px_#ff0000]' : 'bg-[#292a30]'
              }`}
            />
            <span className={`text-[9px] uppercase tracking-wider ${subHit ? 'text-red-400 font-bold' : 'text-[#5d6069]'}`}>
              SUB IMPACT
            </span>
          </div>
        </div>

        {/* Real-time Meter Readings */}
        <div className="flex items-center gap-4 text-[#8e9299]">
          <div className="flex items-center gap-1">
            <span>PEAK:</span>
            <span className={`font-bold ${peakDb > -3 ? 'text-red-400' : 'text-white'}`}>
              {peakDb > -96 ? `${peakDb} dB` : '-INF'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>RMS:</span>
            <span className="text-white font-bold">{rmsVal}%</span>
          </div>
        </div>
      </div>

      {/* Main Canvas Display with Vintage CRT Scanline Effect */}
      <div 
        onClick={handleToggleMode}
        title="Click canvas to toggle visualization mode (Bars → Oscilloscope → Circular Spectrum)"
        className="relative w-full h-44 bg-[#0a0a0c] border border-[#232429] rounded overflow-hidden shadow-inner cursor-pointer group"
      >
        <canvas 
          ref={canvasRef} 
          className="w-full h-full block" 
        />
        
        {/* Subtle Horizontal CRT Scanlines Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%)',
            backgroundSize: '100% 4px'
          }}
        />

        {/* Mode Tag on Canvas Corner */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 border border-[#2a2d36] text-[8px] font-mono text-[#8a8e99] uppercase tracking-wider pointer-events-none">
          {mode}
        </div>

        {/* Vignette border */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] border border-[#1b1c20]" />
      </div>

      {/* Bottom Visualizer Options: Mode Switch Tabs, Cycle Button, Palette, Sensitivity */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono pt-1 text-[#8e9299]">
        
        {/* Mode Selector Tabs with Toggle Feature */}
        <div className="flex items-center gap-1">
          <span className="uppercase text-[9px] mr-1 text-[#666970]">MODE:</span>
          {(['Bars', 'Oscilloscope', 'Circular Spectrum'] as VisualizerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 uppercase tracking-wider text-[9px] border rounded-xs transition-all cursor-pointer flex items-center gap-1 ${
                mode === m 
                  ? 'bg-red-500/20 text-red-400 border-red-500 font-bold shadow-[0_0_10px_rgba(255,68,68,0.25)]' 
                  : 'border-[#2a2c33] text-[#787c87] hover:text-white hover:border-[#3b3e47]'
              }`}
            >
              {m === 'Bars' && <BarChart2 className="w-3 h-3" />}
              {m === 'Oscilloscope' && <Activity className="w-3 h-3" />}
              {m === 'Circular Spectrum' && <Radio className="w-3 h-3" />}
              <span>{m}</span>
            </button>
          ))}

          {/* Quick Toggle Button */}
          <button
            onClick={handleToggleMode}
            title="Toggle next visualizer mode"
            className="p-1 border border-[#2a2c33] hover:border-red-500/60 text-[#787c87] hover:text-white rounded-xs transition-colors cursor-pointer ml-1"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Theme Palette & Sensitivity */}
        <div className="flex items-center gap-4">
          {/* Beam Color */}
          <div className="flex items-center gap-1.5">
            <span className="uppercase text-[9px] text-[#666970]">BEAM:</span>
            {(['red', 'green', 'amber', 'cyan'] as VisualizerColor[]).map((c) => (
              <button
                key={c}
                onClick={() => setColorTheme(c)}
                className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                  c === 'red' ? 'bg-red-500' : c === 'green' ? 'bg-green-500' : c === 'amber' ? 'bg-amber-500' : 'bg-cyan-500'
                } ${colorTheme === c ? 'ring-2 ring-white/60 scale-110' : 'opacity-60 hover:opacity-100'}`}
                title={`Switch color beam to ${c}`}
              />
            ))}
          </div>

          {/* Sensitivity / Gain */}
          <div className="flex items-center gap-2">
            <span className="uppercase text-[9px] text-[#666970]">GAIN:</span>
            <input 
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={gainBoost}
              onChange={(e) => setGainBoost(parseFloat(e.target.value))}
              className="w-16 h-1 bg-[#232429] accent-red-500 cursor-pointer"
              title={`Analyzer Gain: ${gainBoost}x`}
            />
            <span className="text-[9px] text-white w-6">{gainBoost.toFixed(1)}x</span>
          </div>
        </div>
      </div>
    </div>
  );
}
