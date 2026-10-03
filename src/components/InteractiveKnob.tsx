import React, { useRef, useState, useEffect } from 'react';

interface InteractiveKnobProps {
  label: string;
  value: number; // 0 to 100 or custom min/max
  min?: number;
  max?: number;
  unit?: string;
  onChange: (value: number) => void;
  accentColor?: string;
}

export function InteractiveKnob({
  label,
  value,
  min = 0,
  max = 100,
  unit = '%',
  onChange,
  accentColor = '#ff4444'
}: InteractiveKnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(value);

  // Normalize to 0-1
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  // Angle: from -135deg to +135deg (total 270 deg)
  const angle = normalized * 270 - 135;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startYRef.current - e.clientY; // Dragging up increases value
      const range = max - min;
      const change = (deltaY / 150) * range; // 150px drag spans the entire range
      const newVal = Math.round(Math.max(min, Math.min(max, startValRef.current + change)));
      onChange(newVal);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, onChange]);

  return (
    <div 
      className={`hardware-card p-3 flex flex-col items-center justify-center select-none transition-all ${
        isDragging ? 'ring-1 ring-red-500/50 bg-[#1c1d22]' : 'hover:border-[#3d3e42]'
      }`}
    >
      <div 
        className="knob-container cursor-ns-resize touch-none flex items-center justify-center relative group"
        onMouseDown={handleMouseDown}
        title={`Drag up/down to adjust ${label}: ${value}${unit}`}
      >
        {/* Outer radial ticks */}
        <div className="absolute inset-0 pointer-events-none rounded-full border border-[#2f3136]" />
        
        {/* Center metallic knob */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#2a2b2f] to-[#121316] shadow-inner border border-[#3a3b40] flex items-center justify-center relative">
          <div 
            className="knob-indicator transition-transform duration-75"
            style={{ 
              transform: `rotate(${angle}deg)`,
              backgroundColor: accentColor,
              boxShadow: isDragging ? `0 0 8px ${accentColor}` : undefined
            }} 
          />
          {/* Subtle center notch */}
          <div className="w-2 h-2 rounded-full bg-[#0a0a0c] border border-[#222]" />
        </div>
      </div>

      <div className="mt-2 text-center w-full">
        <div className="text-[9px] uppercase tracking-widest text-[#8e9299] truncate font-mono">
          {label}
        </div>
        <div className="text-[11px] font-bold font-mono text-white/90">
          {value}<span className="text-[9px] text-[#71757e] ml-0.5">{unit}</span>
        </div>
      </div>
    </div>
  );
}
