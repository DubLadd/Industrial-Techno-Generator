import React, { useState } from 'react';
import { 
  Tag, 
  FileText, 
  Download, 
  Check, 
  Music, 
  Sliders, 
  Sparkles, 
  Layers, 
  Info,
  Key as KeyIcon,
  X
} from 'lucide-react';
import { TrackMetadata } from '../utils/audioMastering';
import { motion, AnimatePresence } from 'motion/react';

interface TrackMetadataPanelProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: TrackMetadata;
  onUpdateMetadata: (metadata: TrackMetadata) => void;
  onConfirmExport: () => void;
  isExporting: boolean;
  currentBpm: number;
}

const COMMON_TECHNO_KEYS = [
  'Fm', 'Am', 'Dm', 'C#m', 'Gm', 'Em', 'Bbm', 'F#m', 'Cm', 'Ebm'
];

export function TrackMetadataPanel({
  isOpen,
  onClose,
  metadata,
  onUpdateMetadata,
  onConfirmExport,
  isExporting,
  currentBpm
}: TrackMetadataPanelProps) {
  const [formData, setFormData] = useState<TrackMetadata>({
    ...metadata,
    bpm: metadata.bpm || currentBpm,
    year: metadata.year || new Date().getFullYear().toString()
  });

  const handleChange = (field: keyof TrackMetadata, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdateMetadata(updated);
  };

  const handleSelectKey = (key: string) => {
    handleChange('key', key);
  };

  const handleSaveAndExport = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMetadata(formData);
    onConfirmExport();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="hardware-card max-w-lg w-full p-6 border border-red-500/50 shadow-[0_0_50px_rgba(255,68,68,0.25)] rounded relative"
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-[#282a35]">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-red-500" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Export Metadata & ID3 Tagging
              </h3>
              <p className="text-[10px] text-[#7d8291]">
                Embeds RIFF INFO & ID3v2.3 tags directly into the exported WAV binary.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#7d8291] hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveAndExport} className="space-y-4 text-xs">
          {/* Title & Artist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#8e9299] uppercase mb-1 font-bold">
                Track Title (INAM / TIT2) *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g. Sledgehammer Berlin Kick"
                className="w-full bg-[#0c0d11] border border-[#272935] rounded p-2 text-white text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#8e9299] uppercase mb-1 font-bold">
                Artist / Producer (IART / TPE1) *
              </label>
              <input
                type="text"
                required
                value={formData.artist}
                onChange={(e) => handleChange('artist', e.target.value)}
                placeholder="e.g. Industrial Studio"
                className="w-full bg-[#0c0d11] border border-[#272935] rounded p-2 text-white text-xs focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Genre & BPM */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#8e9299] uppercase mb-1 font-bold">
                Genre (IGNR / TCON)
              </label>
              <input
                type="text"
                value={formData.genre}
                onChange={(e) => handleChange('genre', e.target.value)}
                placeholder="e.g. Industrial Techno"
                className="w-full bg-[#0c0d11] border border-[#272935] rounded p-2 text-white text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#8e9299] uppercase mb-1 font-bold">
                Tempo (TBPM)
              </label>
              <input
                type="number"
                min="60"
                max="240"
                value={formData.bpm}
                onChange={(e) => handleChange('bpm', parseInt(e.target.value) || currentBpm)}
                className="w-full bg-[#0c0d11] border border-[#272935] rounded p-2 text-white text-xs focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Musical Key & Quick Key Pills */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-[#8e9299] uppercase font-bold flex items-center gap-1">
                <KeyIcon className="w-3 h-3 text-amber-400" />
                <span>Musical Key (TKEY)</span>
              </label>
              <span className="text-[9px] text-[#6d717d]">Standard DJ Camelot / Notation</span>
            </div>

            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={formData.key}
                onChange={(e) => handleChange('key', e.target.value)}
                placeholder="e.g. Fm"
                className="w-24 bg-[#0c0d11] border border-[#272935] rounded p-2 text-amber-400 font-bold text-xs focus:outline-none focus:border-amber-500 uppercase"
              />
              <div className="flex-1 flex flex-wrap items-center gap-1">
                {COMMON_TECHNO_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleSelectKey(k)}
                    className={`px-2 py-1 text-[9px] rounded font-bold border transition-colors cursor-pointer ${
                      formData.key === k
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                        : 'bg-[#14151b] border-[#22242e] text-[#717684] hover:text-white'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comment & Notes */}
          <div>
            <label className="block text-[10px] text-[#8e9299] uppercase mb-1 font-bold">
              Mastering Comment (ICMT / COMM)
            </label>
            <input
              type="text"
              value={formData.comment || ''}
              onChange={(e) => handleChange('comment', e.target.value)}
              placeholder="e.g. Normalized to -1.0 dBFS • Hard-Knee Limited"
              className="w-full bg-[#0c0d11] border border-[#272935] rounded p-2 text-white text-xs focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Embedded Tags Preview Callout */}
          <div className="p-3 bg-[#0a0b0e] border border-[#1d1f27] rounded text-[9px] space-y-1 text-[#787d8c]">
            <div className="text-white font-bold uppercase flex items-center gap-1.5">
              <Check className="w-3 h-3 text-green-400" />
              <span>Binary Tag Chunks to Inject:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[8px] pt-1">
              <div>
                <b className="text-amber-400/90 block">RIFF INFO LIST:</b>
                INAM: "{formData.title}"<br />
                IART: "{formData.artist}"<br />
                IGNR: "{formData.genre}"
              </div>
              <div>
                <b className="text-green-400/90 block">ID3v2.3 CHUNK:</b>
                TBPM: "{formData.bpm}" | TKEY: "{formData.key}"<br />
                TIT2: "{formData.title}"<br />
                TPE1: "{formData.artist}"
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#23242c]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-[#2b2d37] text-[#8e9299] hover:text-white rounded text-[10px] uppercase font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isExporting}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,68,68,0.3)] disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Embedding & Exporting...' : 'Export WAV with Tags'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
