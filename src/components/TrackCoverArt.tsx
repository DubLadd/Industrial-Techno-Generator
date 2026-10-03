import React, { useState } from 'react';
import { Sparkles, Download, Disc, Image as ImageIcon, Loader2, RefreshCw, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TrackCoverArtProps {
  coverArtUrl: string | null;
  isGenerating: boolean;
  onGenerateCoverArt: () => void;
  prompt: string;
  bpm: number;
  subgenre?: string;
  className?: string;
}

export function TrackCoverArt({
  coverArtUrl,
  isGenerating,
  onGenerateCoverArt,
  prompt,
  bpm,
  subgenre = 'Industrial Techno',
  className = ''
}: TrackCoverArtProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const defaultAsset = '/src/assets/images/dark_techno_cover_1791062237705.jpg';
  const displayImage = coverArtUrl || defaultAsset;

  const handleDownloadImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = displayImage;
    a.download = `techno-cover-${bpm}bpm-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`bg-[#0d0e12] border border-[#262832] rounded p-3 font-mono flex flex-col justify-between relative overflow-hidden group shadow-lg ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#1f2027] pb-2 mb-2 text-[10px]">
        <div className="flex items-center gap-1.5 text-white font-bold uppercase tracking-wider">
          <Disc className="w-3.5 h-3.5 text-red-500 animate-spin-slow" />
          <span>Cover Art</span>
        </div>
        <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded uppercase">
          1:1 Sleeve
        </span>
      </div>

      {/* Main Square Artwork Frame */}
      <div 
        onClick={() => setIsZoomed(true)}
        className="relative w-full aspect-square bg-[#07080a] border border-[#2a2c36] rounded overflow-hidden cursor-pointer group/art shadow-inner"
      >
        <img
          src={displayImage}
          alt={`Industrial Techno cover art for ${bpm} BPM`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover/art:scale-105"
        />

        {/* Dark Brutalist Texture Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

        {/* Vintage Vinyl Center Ring Watermark */}
        <div className="absolute inset-0 border border-white/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-white/20 pointer-events-none flex items-center justify-center opacity-40">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40 border border-white/40" />
        </div>

        {/* Live Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center">
            <Loader2 className="w-6 h-6 text-red-500 animate-spin mb-2" />
            <span className="text-[10px] text-white font-bold uppercase tracking-widest animate-pulse">
              Generating Cover...
            </span>
            <span className="text-[8px] text-[#7d818d] mt-1 line-clamp-2">
              Baking metadata into brutalist visuals
            </span>
          </div>
        )}

        {/* Metadata Strip on Bottom of Artwork */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] pointer-events-none">
          <span className="bg-black/80 text-white px-1.5 py-0.5 rounded border border-white/10 font-bold backdrop-blur-xs uppercase text-[8px]">
            {bpm} BPM
          </span>
          <span className="bg-red-500/80 text-white font-bold px-1.5 py-0.5 rounded uppercase text-[8px] tracking-wider">
            MASTER
          </span>
        </div>

        {/* Hover Zoom Icon */}
        <div className="absolute top-2 right-2 p-1 rounded bg-black/60 text-white opacity-0 group-hover/art:opacity-100 transition-opacity">
          <ZoomIn className="w-3 h-3" />
        </div>
      </div>

      {/* Action Buttons: Generate from Prompt & Download */}
      <div className="flex items-center gap-1.5 mt-2.5">
        <button
          type="button"
          disabled={isGenerating}
          onClick={onGenerateCoverArt}
          className="flex-1 py-1 px-2 bg-[#1b1c23] hover:bg-[#252833] border border-[#2f3240] hover:border-red-500/50 text-[9px] text-white rounded font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
          title="Generate custom dark gritty cover art based on current prompt and BPM"
        >
          {isGenerating ? (
            <Loader2 className="w-3 h-3 text-red-500 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3 text-red-400" />
          )}
          <span>{coverArtUrl ? 'Redo Art' : 'Gen Cover'}</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadImage}
          className="p-1 border border-[#2f3240] hover:border-white/30 text-[#8e9299] hover:text-white rounded transition-colors cursor-pointer"
          title="Download high-resolution cover art JPG"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Lightbox Modal on Zoom */}
      <AnimatePresence>
        {isZoomed && (
          <div 
            onClick={() => setIsZoomed(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full hardware-card p-3 border border-red-500/50 rounded overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#262832] text-xs font-mono">
                <span className="text-white font-bold uppercase">Vinyl Artwork • {bpm} BPM</span>
                <button 
                  onClick={() => setIsZoomed(false)}
                  className="text-[#888] hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>
              <img
                src={displayImage}
                alt="Track Cover Art Preview"
                referrerPolicy="no-referrer"
                className="w-full aspect-square object-cover rounded border border-[#222]"
              />
              <div className="flex justify-between items-center pt-3 text-[10px] font-mono text-[#8e9299]">
                <span className="truncate max-w-[260px]">"{prompt.slice(0, 45)}..."</span>
                <button
                  onClick={handleDownloadImage}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Save Image
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
