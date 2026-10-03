import React, { useState, useEffect, useRef } from 'react';
import { 
  Bookmark, 
  Plus, 
  Trash2, 
  Check, 
  Download, 
  Upload, 
  RotateCcw, 
  Sliders, 
  Sparkles,
  Search,
  Flame,
  Tag,
  Filter,
  Volume2,
  VolumeX,
  Play,
  Square,
  Headphones,
  Radio
} from 'lucide-react';
import { TechnoPreset, TechnoCategory, TECHNO_CATEGORIES } from '../types/presets';
import { presetAuditionEngine } from '../utils/presetAuditionSynth';
import { motion, AnimatePresence } from 'motion/react';

interface TechnoPresetsRackProps {
  presets: TechnoPreset[];
  activePresetId: string | null;
  onSelectPreset: (preset: TechnoPreset) => void;
  onSaveCurrentAsPreset: (name: string, category: TechnoCategory, subgenre: string, description: string) => void;
  onDeletePreset: (presetId: string) => void;
  onResetDefaults: () => void;
  onImportPresets: (imported: TechnoPreset[]) => void;
  currentPrompt: string;
}

export function TechnoPresetsRack({
  presets,
  activePresetId,
  onSelectPreset,
  onSaveCurrentAsPreset,
  onDeletePreset,
  onResetDefaults,
  onImportPresets,
  currentPrompt
}: TechnoPresetsRackProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState<TechnoCategory>('Hard');
  const [newPresetSubgenre, setNewPresetSubgenre] = useState('Industrial Techno');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<'all' | 'clip' | 'pro'>('all');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Audition state (5-second isolated preview clip)
  const [auditioningPresetId, setAuditioningPresetId] = useState<string | null>(null);
  const [auditionProgress, setAuditionProgress] = useState<number>(0);
  const countdownIntervalRef = useRef<number | null>(null);

  // Cleanup audition on unmount
  useEffect(() => {
    return () => {
      presetAuditionEngine.stop();
      if (countdownIntervalRef.current !== null) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleAuditionPreset = (preset: TechnoPreset, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If already auditioning this preset, stop it
    if (auditioningPresetId === preset.id) {
      handleStopAudition();
      return;
    }

    // Stop existing audition timer
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    setAuditioningPresetId(preset.id);
    setAuditionProgress(5);

    // Countdown timer for 5 seconds
    let secondsLeft = 5;
    countdownIntervalRef.current = window.setInterval(() => {
      secondsLeft -= 1;
      setAuditionProgress(secondsLeft);
      if (secondsLeft <= 0) {
        if (countdownIntervalRef.current !== null) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    }, 1000);

    // Play 5-second audition via dedicated small GainNode (isolated bus, zero master interruption)
    presetAuditionEngine.auditionPreset(
      preset.id,
      preset.category,
      preset.bpm,
      preset.distortion,
      preset.resonance,
      () => {
        setAuditioningPresetId(null);
        setAuditionProgress(0);
        if (countdownIntervalRef.current !== null) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    );
  };

  const handleStopAudition = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    presetAuditionEngine.stop();
    setAuditioningPresetId(null);
    setAuditionProgress(0);
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const handlePresetCardClick = (preset: TechnoPreset) => {
    onSelectPreset(preset);
    // Trigger the 5-second audition preview without interrupting the master track
    handleAuditionPreset(preset);
  };

  const handleOpenSaveModal = () => {
    const suggested = currentPrompt.slice(0, 24).trim();
    setNewPresetName(suggested ? `Preset: ${suggested}...` : 'Custom Industrial Patch');
    setNewPresetDesc('Saved customized sound profile and generation prompt.');
    setIsModalOpen(true);
  };

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    onSaveCurrentAsPreset(
      newPresetName.trim(),
      newPresetCategory,
      newPresetSubgenre.trim() || 'Custom Industrial',
      newPresetDesc.trim()
    );

    setIsModalOpen(false);
    triggerToast('Preset saved to hardware bank!');
  };

  const triggerToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(presets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `techno-presets-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast('Exported preset library JSON');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json) && json.length > 0) {
          onImportPresets(json);
          triggerToast(`Imported ${json.length} presets successfully!`);
        } else {
          alert('Invalid preset JSON format.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredPresets = presets.filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesFilter = filterMode === 'all' || p.mode === filterMode;
    const matchesQuery = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subgenre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesFilter && matchesQuery;
  });

  const getCategoryBadgeClass = (category: TechnoCategory) => {
    switch (category) {
      case 'Hard':
        return 'border-red-500/40 text-red-400 bg-red-500/10';
      case 'Acid':
        return 'border-lime-500/40 text-lime-400 bg-lime-500/10';
      case 'Ambient':
        return 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10';
      case 'Industrial':
        return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
      case 'Hypnotic':
        return 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10';
      case 'Peak Time':
        return 'border-orange-500/40 text-orange-400 bg-orange-500/10';
      case 'Raw':
        return 'border-zinc-400/40 text-zinc-300 bg-zinc-500/10';
      default:
        return 'border-[#2d2f36] text-[#8e9299] bg-[#1a1b20]';
    }
  };

  return (
    <div className="hardware-card p-5 relative overflow-hidden">
      {/* Decorative Rack Screws */}
      <div className="absolute top-2 left-2 w-2 h-2 rounded-full border border-[#333] bg-[#1a1a1c]" />
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full border border-[#333] bg-[#1a1a1c]" />
      <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full border border-[#333] bg-[#1a1a1c]" />
      <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full border border-[#333] bg-[#1a1a1c]" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#24262b] pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold tracking-tight uppercase font-mono">
              Techno Presets Bank
            </h3>
            <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono">
              {presets.length} SAVED
            </span>

            {/* Audition Active Status Banner */}
            {auditioningPresetId && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-lime-500/15 border border-lime-500/40 text-lime-400 text-[9px] font-mono font-bold animate-pulse">
                <Headphones className="w-3 h-3 text-lime-400" />
                <span>AUDITIONING ({auditionProgress}s) • ISOLATED GAIN BUS</span>
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#7d818c] font-mono mt-0.5">
            Click any preset to load parameters and play a 5-second audio preview via dedicated GainNode (non-interrupting).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {auditioningPresetId && (
            <button
              onClick={handleStopAudition}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-red-400 font-mono text-[10px] uppercase tracking-wider font-bold rounded border border-red-500/40 flex items-center gap-1 transition-all cursor-pointer"
              title="Stop current audition clip"
            >
              <Square className="w-3 h-3 fill-red-400" /> Stop Audition
            </button>
          )}

          <button
            onClick={handleOpenSaveModal}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] uppercase tracking-wider font-bold rounded flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,68,68,0.3)] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Save Current Patch
          </button>

          <button
            onClick={handleExportJSON}
            title="Export presets to JSON"
            className="p-1.5 border border-[#2d2f36] hover:border-white/30 text-[#8e9299] hover:text-white rounded transition-colors text-[10px] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <label
            title="Import presets from JSON"
            className="p-1.5 border border-[#2d2f36] hover:border-white/30 text-[#8e9299] hover:text-white rounded transition-colors text-[10px] cursor-pointer flex items-center justify-center"
          >
            <Upload className="w-3.5 h-3.5" />
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportJSON} 
              className="hidden" 
            />
          </label>

          <button
            onClick={onResetDefaults}
            title="Restore default factory presets"
            className="p-1.5 border border-[#2d2f36] hover:border-white/30 text-[#8e9299] hover:text-white rounded transition-colors text-[10px] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar: Category Dropdown, Search Input, and Mode Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0e0f13] border border-[#262832] rounded px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] text-[#7d818c] uppercase">CATEGORY:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-white text-[11px] font-mono focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-[#121317] text-white">
                All Categories ({presets.length})
              </option>
              {TECHNO_CATEGORIES.map((cat) => {
                const count = presets.filter(p => p.category === cat).length;
                return (
                  <option key={cat} value={cat} className="bg-[#121317] text-white">
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-[#5d616c] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category, subgenre, BPM, keywords..."
              className="w-full bg-[#0d0e11] border border-[#232429] rounded pl-8 pr-3 py-1 text-[11px] text-white placeholder-[#525660] focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
        </div>

        {/* Filter Mode buttons */}
        <div className="flex items-center gap-1">
          {(['all', 'clip', 'pro'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider border rounded transition-all cursor-pointer ${
                filterMode === mode
                  ? 'bg-[#292a30] text-white border-red-500 font-bold'
                  : 'border-[#24262b] text-[#6d717d] hover:text-white'
              }`}
            >
              {mode === 'all' ? 'ALL' : mode === 'clip' ? 'CLIP (30S)' : 'PRO (FULL)'}
            </button>
          ))}
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-3 px-3 py-1.5 bg-red-500/10 border border-red-500/40 text-red-400 text-[10px] font-mono rounded flex items-center gap-2"
          >
            <Check className="w-3 h-3" />
            <span>{feedbackMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
        {filteredPresets.length === 0 ? (
          <div className="col-span-full py-8 text-center border border-dashed border-[#26282f] rounded text-[#676b77] text-xs font-mono">
            No presets found in category "{selectedCategory}". Try selecting another category or saving a new preset!
          </div>
        ) : (
          filteredPresets.map((preset) => {
            const isActive = activePresetId === preset.id;
            const isAuditioning = auditioningPresetId === preset.id;

            return (
              <div
                key={preset.id}
                onClick={() => handlePresetCardClick(preset)}
                className={`hardware-card p-3 rounded text-left transition-all cursor-pointer relative group flex flex-col justify-between border ${
                  isAuditioning
                    ? 'border-lime-500 shadow-[0_0_18px_rgba(132,204,22,0.25)] bg-[#141812]'
                    : isActive 
                    ? 'border-red-500 shadow-[0_0_15px_rgba(255,68,68,0.2)] bg-[#191717]' 
                    : 'border-[#24262c] hover:border-[#3d4049] hover:bg-[#16171b]'
                }`}
              >
                {/* Active indicator LED, Title and Mode Badge */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div 
                      className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                        isAuditioning
                          ? 'bg-lime-400 shadow-[0_0_8px_#a3e635] animate-ping'
                          : isActive 
                          ? 'bg-red-500 shadow-[0_0_8px_#ff0000]' 
                          : 'bg-[#2d2e35]'
                      }`} 
                    />
                    <h4 className="text-[12px] font-bold font-mono text-white truncate group-hover:text-red-400 transition-colors">
                      {preset.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Animated Equalizer Waveform indicator when auditioning */}
                    {isAuditioning && (
                      <div className="flex items-end gap-0.5 h-3 px-1 py-0.5 bg-lime-500/10 rounded border border-lime-500/30">
                        <span className="w-0.5 h-2.5 bg-lime-400 animate-pulse" />
                        <span className="w-0.5 h-1.5 bg-lime-400 animate-bounce" />
                        <span className="w-0.5 h-3 bg-lime-400 animate-pulse" />
                      </div>
                    )}

                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold shrink-0 ${
                      preset.mode === 'clip' 
                        ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' 
                        : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                    }`}>
                      {preset.mode === 'clip' ? '30S' : 'PRO'}
                    </span>
                  </div>
                </div>

                {/* Category Badge & Subgenre & BPM badge */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {/* Category Pill */}
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${getCategoryBadgeClass(preset.category)}`}>
                    {preset.category}
                  </span>

                  <span className="text-[9px] font-mono text-[#a5abb7] bg-[#22242a] px-1.5 py-0.5 rounded">
                    {preset.subgenre}
                  </span>
                  
                  <span className="text-[9px] font-mono text-[#ff8844] bg-[#281a15] px-1.5 py-0.5 rounded font-bold">
                    {preset.bpm} BPM
                  </span>
                </div>

                {/* Description / Prompt excerpt */}
                <p className="text-[10px] text-[#7b808e] font-mono line-clamp-2 leading-relaxed mb-3">
                  {preset.description || preset.prompt}
                </p>

                {/* Bottom Knob Summary & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#202227] text-[9px] font-mono text-[#6c707d]">
                  <div className="flex items-center gap-2">
                    <span>DIST: <b className="text-white/80">{preset.distortion}%</b></span>
                    <span>RES: <b className="text-white/80">{preset.resonance}%</b></span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* 5-Second Audition Button */}
                    <button
                      type="button"
                      onClick={(e) => handleAuditionPreset(preset, e)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        isAuditioning
                          ? 'bg-lime-500 text-black shadow-[0_0_10px_rgba(132,204,22,0.4)]'
                          : 'bg-[#1e2028] text-lime-400 hover:bg-lime-500/20 border border-lime-500/30'
                      }`}
                      title="Audition 5-second audio preview (isolated GainNode bus, won't interrupt master track)"
                    >
                      {isAuditioning ? (
                        <>
                          <Square className="w-2.5 h-2.5 fill-black" />
                          <span>STOP ({auditionProgress}s)</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-2.5 h-2.5 fill-lime-400" />
                          <span>AUDITION</span>
                        </>
                      )}
                    </button>

                    {/* Load Preset Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPreset(preset);
                      }}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-red-500 text-black' 
                          : 'bg-[#25272e] text-white hover:bg-red-500 hover:text-black'
                      }`}
                    >
                      {isActive ? 'LOADED' : 'LOAD'}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete preset "${preset.name}"?`)) {
                          onDeletePreset(preset.id);
                        }
                      }}
                      title="Delete preset"
                      className="p-1 text-[#545763] hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Save Preset Modal with Category Assignment */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="hardware-card p-6 max-w-md w-full border border-red-500/50 shadow-[0_0_40px_rgba(255,68,68,0.2)] rounded relative"
            >
              <div className="flex justify-between items-center mb-4 border-b border-[#2b2d35] pb-2 font-mono">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-bold uppercase text-white tracking-wide">
                    Store Techno Preset
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs text-[#8e9299] hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmSave} className="space-y-3.5 font-mono text-xs">
                <div>
                  <label className="block text-[#8e9299] uppercase text-[10px] mb-1">
                    Preset Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="e.g. Sledgehammer Berlin Kick"
                    className="w-full bg-[#0a0a0c] border border-[#2d2f36] rounded p-2 text-white text-xs focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-[#8e9299] uppercase text-[10px] mb-1">
                      Category *
                    </label>
                    <select
                      value={newPresetCategory}
                      onChange={(e) => setNewPresetCategory(e.target.value as TechnoCategory)}
                      className="w-full bg-[#0a0a0c] border border-[#2d2f36] rounded p-2 text-white text-xs focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      {TECHNO_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subgenre Tag */}
                  <div>
                    <label className="block text-[#8e9299] uppercase text-[10px] mb-1">
                      Subgenre Tag
                    </label>
                    <input
                      type="text"
                      value={newPresetSubgenre}
                      onChange={(e) => setNewPresetSubgenre(e.target.value)}
                      placeholder="e.g. Acid 303, Schranz"
                      className="w-full bg-[#0a0a0c] border border-[#2d2f36] rounded p-2 text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#8e9299] uppercase text-[10px] mb-1">
                    Patch Notes / Description
                  </label>
                  <textarea
                    rows={2}
                    value={newPresetDesc}
                    onChange={(e) => setNewPresetDesc(e.target.value)}
                    placeholder="Sound characteristics, intended mixing space..."
                    className="w-full bg-[#0a0a0c] border border-[#2d2f36] rounded p-2 text-white text-xs focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                <div className="p-2.5 bg-[#0e0f13] border border-[#222329] rounded text-[10px] text-[#7e8391] space-y-1">
                  <div className="text-[#a4a9b5] uppercase font-bold">Parameters to capture:</div>
                  <div className="truncate">Prompt: "{currentPrompt.slice(0, 55)}..."</div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#23242a]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 border border-[#2c2e36] text-[#8e9299] hover:text-white rounded text-[10px] uppercase font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer shadow-[0_0_15px_rgba(255,68,68,0.3)]"
                  >
                    Save Preset
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
