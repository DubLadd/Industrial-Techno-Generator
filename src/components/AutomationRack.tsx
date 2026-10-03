import React, { useState, useRef, useEffect } from 'react';
import { 
  TrendingUp, 
  RotateCcw, 
  Sparkles, 
  Zap, 
  Radio, 
  Layers, 
  Sliders, 
  Check, 
  Play, 
  Activity, 
  Plus, 
  Trash2 
} from 'lucide-react';

export type AutomatableParam = 'distortion' | 'feedback' | 'reverb';

export interface AutomationPoint {
  id: string;
  time: number;  // 0.0 to 1.0 (normalized time)
  value: number; // 0 to 100 (% value)
}

export interface AutomationCurves {
  distortion: AutomationPoint[];
  feedback: AutomationPoint[];
  reverb: AutomationPoint[];
}

interface AutomationRackProps {
  curves: AutomationCurves;
  onUpdateCurves: (curves: AutomationCurves) => void;
  isEnabled: boolean;
  onToggleEnabled: () => void;
  playbackProgress: number; // 0.0 to 1.0
  isPlaying: boolean;
  currentDistortion: number;
  currentFeedback: number;
  currentReverb: number;
}

export function evaluateCurveValue(points: AutomationPoint[], t: number, fallback: number): number {
  if (!points || points.length === 0) return fallback;
  const sorted = [...points].sort((a, b) => a.time - b.time);

  if (t <= sorted[0].time) return sorted[0].value;
  if (t >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (t >= p1.time && t <= p2.time) {
      const alpha = (t - p1.time) / (p2.time - p1.time || 0.001);
      // Smooth cosine interpolation
      const smoothAlpha = (1 - Math.cos(alpha * Math.PI)) / 2;
      return Math.round(p1.value + smoothAlpha * (p2.value - p1.value));
    }
  }

  return fallback;
}

export function AutomationRack({
  curves,
  onUpdateCurves,
  isEnabled,
  onToggleEnabled,
  playbackProgress,
  isPlaying,
  currentDistortion,
  currentFeedback,
  currentReverb
}: AutomationRackProps) {
  const [selectedParam, setSelectedParam] = useState<AutomatableParam>('distortion');
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const activePoints = curves[selectedParam] || [];

  const getParamColor = (param: AutomatableParam) => {
    switch (param) {
      case 'distortion': return { hex: '#ff3333', name: 'Red', label: 'DISTORTION' };
      case 'feedback': return { hex: '#f59e0b', name: 'Amber', label: 'FEEDBACK' };
      case 'reverb': return { hex: '#06b6d4', name: 'Cyan', label: 'REVERB' };
    }
  };

  const paramMeta = getParamColor(selectedParam);

  // Calculate live value at playhead
  const currentLiveValue = evaluateCurveValue(
    activePoints,
    playbackProgress,
    selectedParam === 'distortion' ? currentDistortion : selectedParam === 'feedback' ? currentFeedback : currentReverb
  );

  // Sort active points by time for curve rendering
  const sortedPoints = [...activePoints].sort((a, b) => a.time - b.time);

  // SVG coordinate helpers (viewBox: 0 0 1000 300)
  const toSvgX = (t: number) => Math.max(10, Math.min(990, t * 980 + 10));
  const toSvgY = (v: number) => 280 - (v / 100) * 260; // 0 at bottom, 100 at top
  const fromSvgX = (svgX: number) => Math.max(0, Math.min(1, (svgX - 10) / 980));
  const fromSvgY = (svgY: number) => Math.max(0, Math.min(100, Math.round(((280 - svgY) / 260) * 100)));

  // Generate SVG path command with smooth Catmull-Rom or bezier spline
  const generatePathD = () => {
    if (sortedPoints.length === 0) return '';
    if (sortedPoints.length === 1) {
      const y = toSvgY(sortedPoints[0].value);
      return `M 0 ${y} L 1000 ${y}`;
    }

    let d = `M 0 ${toSvgY(sortedPoints[0].value)} L ${toSvgX(sortedPoints[0].time)} ${toSvgY(sortedPoints[0].value)}`;
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const p1 = sortedPoints[i];
      const p2 = sortedPoints[i + 1];
      const x1 = toSvgX(p1.time);
      const y1 = toSvgY(p1.value);
      const x2 = toSvgX(p2.time);
      const y2 = toSvgY(p2.value);
      const cx1 = x1 + (x2 - x1) * 0.5;
      const cx2 = x1 + (x2 - x1) * 0.5;
      d += ` C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
    }
    const last = sortedPoints[sortedPoints.length - 1];
    d += ` L 1000 ${toSvgY(last.value)}`;
    return d;
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingPointId) return;
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 1000;
    const clickY = ((e.clientY - rect.top) / rect.height) * 300;

    const newTime = Math.round(fromSvgX(clickX) * 100) / 100;
    const newValue = fromSvgY(clickY);

    const newPoint: AutomationPoint = {
      id: `pt-${Date.now()}-${Math.random()}`,
      time: newTime,
      value: newValue
    };

    const nextPoints = [...activePoints, newPoint];
    onUpdateCurves({ ...curves, [selectedParam]: nextPoints });
  };

  const handlePointerDown = (pointId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingPointId(pointId);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingPointId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const moveX = ((e.clientX - rect.left) / rect.width) * 1000;
    const moveY = ((e.clientY - rect.top) / rect.height) * 300;

    const updatedTime = Math.max(0, Math.min(1, Math.round(fromSvgX(moveX) * 100) / 100));
    const updatedValue = Math.max(0, Math.min(100, fromSvgY(moveY)));

    const nextPoints = activePoints.map(p => 
      p.id === draggingPointId ? { ...p, time: updatedTime, value: updatedValue } : p
    );

    onUpdateCurves({ ...curves, [selectedParam]: nextPoints });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingPointId) {
      setDraggingPointId(null);
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleDeletePoint = (pointId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (activePoints.length <= 2) return; // keep minimum points
    const nextPoints = activePoints.filter(p => p.id !== pointId);
    onUpdateCurves({ ...curves, [selectedParam]: nextPoints });
  };

  // Preset Curve Generators
  const applyPresetCurve = (presetType: 'buildup' | 'dropsqueeze' | 'sine' | 'flat') => {
    let newPoints: AutomationPoint[] = [];

    switch (presetType) {
      case 'buildup':
        newPoints = [
          { id: 'p1', time: 0.0, value: 15 },
          { id: 'p2', time: 0.4, value: 30 },
          { id: 'p3', time: 0.75, value: 70 },
          { id: 'p4', time: 0.95, value: 95 }
        ];
        break;
      case 'dropsqueeze':
        newPoints = [
          { id: 'p1', time: 0.0, value: 65 },
          { id: 'p2', time: 0.45, value: 75 },
          { id: 'p3', time: 0.5, value: 10 },  // Breakdown drop
          { id: 'p4', time: 0.55, value: 92 },  // Explosion
          { id: 'p5', time: 1.0, value: 80 }
        ];
        break;
      case 'sine':
        newPoints = [
          { id: 'p1', time: 0.0, value: 25 },
          { id: 'p2', time: 0.25, value: 80 },
          { id: 'p3', time: 0.5, value: 30 },
          { id: 'p4', time: 0.75, value: 85 },
          { id: 'p5', time: 1.0, value: 40 }
        ];
        break;
      case 'flat':
        newPoints = [
          { id: 'p1', time: 0.0, value: 50 },
          { id: 'p2', time: 1.0, value: 50 }
        ];
        break;
    }

    onUpdateCurves({ ...curves, [selectedParam]: newPoints });
  };

  return (
    <div className="w-full bg-[#101115] border border-[#262832] rounded p-4 font-mono select-none space-y-3.5 shadow-inner">
      {/* Top Header & Master Switch */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#21232b] pb-2.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-red-500" />
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">
            DSP Parameter Automation Sequencer
          </span>
          <span className="text-[9px] text-[#767b8a] hidden sm:inline">
            (Curves modulate live knobs during playback)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleEnabled}
            className={`px-2.5 py-1 rounded border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              isEnabled
                ? 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'bg-[#1a1b22] text-[#717684] border-[#2d303b] hover:text-white'
            }`}
          >
            <Activity className={`w-3 h-3 ${isEnabled ? 'text-red-400 animate-pulse' : 'text-[#555]'}`} />
            <span>AUTOMATION: {isEnabled ? 'ACTIVE' : 'BYPASS'}</span>
          </button>
        </div>
      </div>

      {/* Parameter Tabs & Live HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Param Selector Tabs */}
        <div className="flex items-center gap-1.5">
          {(['distortion', 'feedback', 'reverb'] as const).map((param) => {
            const isSel = selectedParam === param;
            const meta = getParamColor(param);
            return (
              <button
                key={param}
                type="button"
                onClick={() => setSelectedParam(param)}
                className={`px-3 py-1 text-[10px] uppercase font-bold rounded border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-[#1c1d25] text-white border-red-500 shadow-sm'
                    : 'bg-[#121318] text-[#767b8a] border-[#22242e] hover:text-white'
                }`}
                style={{ borderColor: isSel ? meta.hex : undefined }}
              >
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: meta.hex }} 
                />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Value Monitor */}
        <div className="flex items-center gap-3 text-[10px] bg-[#0c0d10] border border-[#1f212a] px-3 py-1 rounded">
          <span className="text-[#787d8c]">LIVE {paramMeta.label}:</span>
          <span className="font-bold text-white text-[12px]" style={{ color: paramMeta.hex }}>
            {currentLiveValue}%
          </span>
          <span className="text-[9px] text-[#555]">
            POS: {(playbackProgress * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Interactive Automation Graph Canvas / SVG */}
      <div className="relative w-full h-44 bg-[#090a0d] border border-[#232530] rounded overflow-hidden">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 opacity-20">
          <div className="border-b border-white/20 text-[8px] text-white">100%</div>
          <div className="border-b border-white/10 text-[8px] text-white">75%</div>
          <div className="border-b border-white/15 text-[8px] text-white">50%</div>
          <div className="border-b border-white/10 text-[8px] text-white">25%</div>
          <div className="text-[8px] text-white">0%</div>
        </div>

        {/* Time Divisions */}
        <div className="absolute inset-0 pointer-events-none flex justify-between px-3 pt-1 text-[8px] text-[#444] uppercase">
          <span>0:00</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>

        {/* Main SVG Curve */}
        <svg
          ref={svgRef}
          viewBox="0 0 1000 300"
          className="w-full h-full block cursor-crosshair"
          onClick={handleSvgClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Curve Area Fill */}
          <path
            d={`${generatePathD()} L 1000 300 L 0 300 Z`}
            fill={paramMeta.hex}
            fillOpacity="0.08"
          />

          {/* Glowing Stroke Curve */}
          <path
            d={generatePathD()}
            fill="none"
            stroke={paramMeta.hex}
            strokeWidth="3"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${paramMeta.hex}80)` }}
          />

          {/* Interactive Automation Node Points */}
          {sortedPoints.map((pt) => {
            const cx = toSvgX(pt.time);
            const cy = toSvgY(pt.value);
            const isDragging = draggingPointId === pt.id;

            return (
              <g 
                key={pt.id} 
                className="cursor-grab active:cursor-grabbing group/node"
                onPointerDown={(e) => handlePointerDown(pt.id, e)}
                onContextMenu={(e) => handleDeletePoint(pt.id, e)}
                onDoubleClick={(e) => handleDeletePoint(pt.id, e)}
              >
                {/* Outer Glow Halo on Hover / Drag */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isDragging ? 14 : 9}
                  fill={paramMeta.hex}
                  fillOpacity={isDragging ? 0.35 : 0.15}
                  className="transition-all"
                />
                {/* Node Center */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="5"
                  fill="#ffffff"
                  stroke={paramMeta.hex}
                  strokeWidth="2.5"
                />
                {/* Node Value Label */}
                <text
                  x={cx}
                  y={cy - 10}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontFamily="monospace"
                  className="pointer-events-none font-bold select-none drop-shadow"
                >
                  {pt.value}%
                </text>
              </g>
            );
          })}

          {/* Dynamic Playhead Needle */}
          {isPlaying && (
            <g className="pointer-events-none">
              <line
                x1={toSvgX(playbackProgress)}
                y1="0"
                x2={toSvgX(playbackProgress)}
                y2="300"
                stroke="#ffffff"
                strokeWidth="2"
                strokeDasharray="4 2"
                style={{ filter: 'drop-shadow(0 0 8px #ffffff)' }}
              />
              <circle
                cx={toSvgX(playbackProgress)}
                cy={toSvgY(currentLiveValue)}
                r="6"
                fill="#ffffff"
                stroke="#ff4444"
                strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 6px #ff4444)' }}
              />
            </g>
          )}
        </svg>

        {/* Tip overlay */}
        <div className="absolute bottom-1.5 left-3 text-[8px] text-[#555a66] pointer-events-none">
          Click graph to add point • Drag points to shape • Right-click / Double-click to delete
        </div>
      </div>

      {/* Preset Curves & Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1d1f27] text-[9px]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[#686d79] uppercase mr-1">CURVE PRESETS:</span>
          <button
            type="button"
            onClick={() => applyPresetCurve('buildup')}
            className="px-2 py-0.5 rounded bg-[#15161c] border border-[#242630] text-[#8e9299] hover:text-white cursor-pointer"
          >
            Build-up Ramp
          </button>
          <button
            type="button"
            onClick={() => applyPresetCurve('dropsqueeze')}
            className="px-2 py-0.5 rounded bg-[#15161c] border border-[#242630] text-[#8e9299] hover:text-white cursor-pointer"
          >
            Drop Breakdown
          </button>
          <button
            type="button"
            onClick={() => applyPresetCurve('sine')}
            className="px-2 py-0.5 rounded bg-[#15161c] border border-[#242630] text-[#8e9299] hover:text-white cursor-pointer"
          >
            Rave Wave
          </button>
          <button
            type="button"
            onClick={() => applyPresetCurve('flat')}
            className="px-2 py-0.5 rounded bg-[#15161c] border border-[#242630] text-[#8e9299] hover:text-white cursor-pointer"
          >
            Flat
          </button>
        </div>

        <button
          type="button"
          onClick={() => applyPresetCurve('flat')}
          className="text-[#686d79] hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
          title="Reset curve to flat line"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset {paramMeta.label}</span>
        </button>
      </div>
    </div>
  );
}
