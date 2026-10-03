import React, { useState } from 'react';
import { 
  Music, 
  Layers, 
  Sparkles, 
  Dices, 
  Check, 
  Wand2, 
  Volume2, 
  Zap, 
  Cpu, 
  Radio, 
  Filter, 
  Disc,
  Guitar,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface GenreItem {
  id: string;
  name: string;
  category: 'Techno' | 'Electronic' | 'Rock/Metal' | 'Bass/Breaks' | 'Cinematic' | 'Lo-Fi';
  defaultBpm: number;
  description: string;
  defaultInstruments: string[];
}

export interface InstrumentItem {
  id: string;
  name: string;
  category: 'rhythm' | 'bass' | 'lead' | 'fx';
  tag: string;
  description: string;
}

export const GENRE_CATALOG: GenreItem[] = [
  {
    id: 'industrial-techno',
    name: 'Industrial Techno',
    category: 'Techno',
    defaultBpm: 138,
    description: 'Relentless distorted kicks, dark factory machinery, aggressive hypnotic groove.',
    defaultInstruments: ['tr-909', 'anvil-foley', 'tb-303', 'factory-drone']
  },
  {
    id: 'acid-techno',
    name: 'Acid Techno',
    category: 'Techno',
    defaultBpm: 142,
    description: 'Screaming Roland TB-303 squelch, resonant filter sweeps, raw 909 beats.',
    defaultInstruments: ['tr-909', 'tb-303', 'modular-arp', 'noise-sweeps']
  },
  {
    id: 'berlin-warehouse',
    name: 'Berlin Warehouse',
    category: 'Techno',
    defaultBpm: 145,
    description: 'Echoing concrete cavern reverb, thundering sub-rumble kicks, cavernous peak-time drive.',
    defaultInstruments: ['tr-909', 'moog-sub', 'modular-arp', 'factory-drone']
  },
  {
    id: 'cyberpunk-darksynth',
    name: 'Cyberpunk Darksynth',
    category: 'Electronic',
    defaultBpm: 128,
    description: 'Dystopian neon noir synthesizers, aggressive arpeggiators, heavy retro-futuristic bass.',
    defaultInstruments: ['tr-808', 'moog-sub', 'supersaw-lead', 'cyber-bells']
  },
  {
    id: 'darkwave-postpunk',
    name: 'Darkwave / EBM',
    category: 'Electronic',
    defaultBpm: 134,
    description: 'Cold wave analog synth pads, motorik driving basslines, vintage drum machines.',
    defaultInstruments: ['tr-909', 'moog-sub', 'rhodes-noir', 'tape-flutter']
  },
  {
    id: 'industrial-metal',
    name: 'Industrial Metal',
    category: 'Rock/Metal',
    defaultBpm: 130,
    description: 'Downtuned chugging electric guitars, mechanical electronic drums, crushing distortion.',
    defaultInstruments: ['tr-909', 'distorted-guitar', 'distorted-bass', 'metal-chains']
  },
  {
    id: 'dnb-neurofunk',
    name: 'Drum & Bass (Neuro)',
    category: 'Bass/Breaks',
    defaultBpm: 174,
    description: 'Ultra-fast syncopated breakbeats, menacing reese bass modulations, technical groove.',
    defaultInstruments: ['breakbeat-kit', 'reese-bass', 'supersaw-lead', 'noise-sweeps']
  },
  {
    id: 'uk-garage-dubstep',
    name: 'UK Garage / Darkstep',
    category: 'Bass/Breaks',
    defaultBpm: 140,
    description: 'Syncopated 2-step skippy rhythms, deep sub-bass weight, metallic industrial claps.',
    defaultInstruments: ['tr-808', 'distorted-bass', 'rhodes-noir', 'sub-impact']
  },
  {
    id: 'dark-ambient-cinematic',
    name: 'Dark Ambient Score',
    category: 'Cinematic',
    defaultBpm: 90,
    description: 'Expansive ominous drones, bowed dark acoustic cello, heavy sub pulses, eerie tension.',
    defaultInstruments: ['haunting-cello', 'factory-drone', 'moog-sub', 'tape-flutter']
  },
  {
    id: 'dark-phonk',
    name: 'Industrial Phonk / Trap',
    category: 'Lo-Fi',
    defaultBpm: 124,
    description: 'Saturated 808 sub glides, syncopated cowbell stabs, gritty analog tape compression.',
    defaultInstruments: ['tr-808', 'sub-impact', 'cyber-bells', 'tape-flutter']
  }
];

export const INSTRUMENT_CATALOG: InstrumentItem[] = [
  // Rhythm
  {
    id: 'tr-909',
    name: 'TR-909 Kick & Hats',
    category: 'rhythm',
    tag: 'RHYTHM',
    description: 'Punchy 4/4 analog kick with sizzling metallic hi-hats'
  },
  {
    id: 'tr-808',
    name: 'TR-808 Sub Boom',
    category: 'rhythm',
    tag: 'RHYTHM',
    description: 'Booming tuned sub kick with extended decay'
  },
  {
    id: 'breakbeat-kit',
    name: 'Breakbeat Chopped Kit',
    category: 'rhythm',
    tag: 'RHYTHM',
    description: 'Fast acoustic breakbeat snare rolls & ghost notes'
  },
  {
    id: 'anvil-foley',
    name: 'Anvil & Iron Foley',
    category: 'rhythm',
    tag: 'RHYTHM',
    description: 'Industrial metal clanks and rhythmic foundry hammer strikes'
  },

  // Bass
  {
    id: 'tb-303',
    name: 'TB-303 Acid Bass',
    category: 'bass',
    tag: 'BASS',
    description: 'Iconic squelching resonant low-pass saw bassline'
  },
  {
    id: 'moog-sub',
    name: 'Moog Sub Analog Bass',
    category: 'bass',
    tag: 'BASS',
    description: 'Warm, fat dual-oscillator analog low-end punch'
  },
  {
    id: 'reese-bass',
    name: 'Reese Bass (Neuro)',
    category: 'bass',
    tag: 'BASS',
    description: 'Menacing pitch-phased detuned saw modulation'
  },
  {
    id: 'distorted-bass',
    name: 'Overdriven Electric Bass',
    category: 'bass',
    tag: 'BASS',
    description: 'Heavy plectrum-picked electric bass with tube grit'
  },

  // Leads & Melodics
  {
    id: 'distorted-guitar',
    name: 'Industrial Chug Guitar',
    category: 'lead',
    tag: 'LEAD',
    description: 'High-gain drop-tuned power chords & metal riffs'
  },
  {
    id: 'supersaw-lead',
    name: 'Detuned Supersaw Pluck',
    category: 'lead',
    tag: 'LEAD',
    description: 'Wide stereo sawtooth synthesizer with fast decay'
  },
  {
    id: 'modular-arp',
    name: 'Modular Synth Arpeggio',
    category: 'lead',
    tag: 'LEAD',
    description: 'Hypnotic sequenced melodies cycling dark harmonic minor scales'
  },
  {
    id: 'haunting-cello',
    name: 'Dark Solo Cello',
    category: 'lead',
    tag: 'LEAD',
    description: 'Bowed acoustic strings with rich expressive vibrato'
  },
  {
    id: 'rhodes-noir',
    name: 'Rhodes Electric Piano',
    category: 'lead',
    tag: 'LEAD',
    description: 'Neo-noir electric piano chords with vintage tremolo'
  },
  {
    id: 'cyber-bells',
    name: 'Cyberpunk FM Bells',
    category: 'lead',
    tag: 'LEAD',
    description: 'Cold metallic FM synthesis bells and digital chimes'
  },

  // Atmospheres & FX
  {
    id: 'factory-drone',
    name: 'Warehouse Factory Drone',
    category: 'fx',
    tag: 'FX/ATMO',
    description: 'Cavernous concrete reverb, steam valves, and low rumble'
  },
  {
    id: 'metal-chains',
    name: 'Scraped Metal Chains',
    category: 'fx',
    tag: 'FX/ATMO',
    description: 'Abrasive metallic texture and industrial impact scrapes'
  },
  {
    id: 'tape-flutter',
    name: 'Vintage Tape & Vinyl Hiss',
    category: 'fx',
    tag: 'FX/ATMO',
    description: 'Warm lo-fi tape flutter, subtle wow, and needle crackle'
  },
  {
    id: 'noise-sweeps',
    name: 'White Noise Risers',
    category: 'fx',
    tag: 'FX/ATMO',
    description: 'Tension-building resonant frequency sweep transitions'
  },
  {
    id: 'sub-impact',
    name: 'Sub-Bass Impact Drop',
    category: 'fx',
    tag: 'FX/ATMO',
    description: 'Low-frequency seismic drop markers on key downbeats'
  }
];

interface InstrumentGenrePickerProps {
  currentPrompt: string;
  onApplyPrompt: (newPrompt: string, newBpm: number) => void;
  currentBpm: number;
  onBpmChange: (bpm: number) => void;
  distortion: number;
  resonance: number;
  onGenerateMusic: () => void;
  isGenerating: boolean;
}

export function InstrumentGenrePicker({
  currentPrompt,
  onApplyPrompt,
  currentBpm,
  onBpmChange,
  distortion,
  resonance,
  onGenerateMusic,
  isGenerating
}: InstrumentGenrePickerProps) {
  const [selectedGenreId, setSelectedGenreId] = useState<string>('industrial-techno');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([
    'tr-909',
    'tb-303',
    'modular-arp',
    'factory-drone'
  ]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'rhythm' | 'bass' | 'lead' | 'fx'>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const selectedGenre = GENRE_CATALOG.find(g => g.id === selectedGenreId) || GENRE_CATALOG[0];

  // Helper to build a comprehensive prompt for Lyria
  const buildInstrumentalPrompt = (genre: GenreItem, instIds: string[], targetBpm: number) => {
    const instNames = instIds
      .map(id => INSTRUMENT_CATALOG.find(i => i.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    const distDesc = distortion > 70 ? 'heavy overdriven distortion' : distortion > 40 ? 'analog saturation' : 'clean punchy';
    const resDesc = resonance > 70 ? 'screaming resonant filter modulations' : 'controlled warm filtering';

    return `Pure instrumental track in ${genre.name} style at ${targetBpm} BPM. Completely instrumental, no vocals, no singing, no spoken words. Featured instruments and arrangement: ${instNames || 'analog synthesisers and drum machines'}. Sonic character: ${genre.description} Features ${distDesc} and ${resDesc}. High dynamic range, professional studio master mix.`;
  };

  const handleSelectGenre = (genre: GenreItem) => {
    setSelectedGenreId(genre.id);
    onBpmChange(genre.defaultBpm);

    // If no instruments picked, populate with defaults
    let newInstIds = selectedInstrumentIds;
    if (newInstIds.length === 0) {
      newInstIds = genre.defaultInstruments;
      setSelectedInstrumentIds(newInstIds);
    }

    const newPrompt = buildInstrumentalPrompt(genre, newInstIds, genre.defaultBpm);
    onApplyPrompt(newPrompt, genre.defaultBpm);
  };

  const handleToggleInstrument = (instId: string) => {
    let next: string[];
    if (selectedInstrumentIds.includes(instId)) {
      next = selectedInstrumentIds.filter(id => id !== instId);
    } else {
      next = [...selectedInstrumentIds, instId];
    }
    setSelectedInstrumentIds(next);

    const newPrompt = buildInstrumentalPrompt(selectedGenre, next, currentBpm);
    onApplyPrompt(newPrompt, currentBpm);
  };

  const handleRandomizeArrangement = () => {
    // Pick random genre
    const randomGenre = GENRE_CATALOG[Math.floor(Math.random() * GENRE_CATALOG.length)];
    setSelectedGenreId(randomGenre.id);
    onBpmChange(randomGenre.defaultBpm);

    // Pick 1 rhythm, 1-2 bass, 1 lead, 1 fx
    const rhythms = INSTRUMENT_CATALOG.filter(i => i.category === 'rhythm');
    const basses = INSTRUMENT_CATALOG.filter(i => i.category === 'bass');
    const leads = INSTRUMENT_CATALOG.filter(i => i.category === 'lead');
    const fxs = INSTRUMENT_CATALOG.filter(i => i.category === 'fx');

    const picked = [
      rhythms[Math.floor(Math.random() * rhythms.length)].id,
      basses[Math.floor(Math.random() * basses.length)].id,
      leads[Math.floor(Math.random() * leads.length)].id,
      fxs[Math.floor(Math.random() * fxs.length)].id
    ];

    setSelectedInstrumentIds(picked);
    const newPrompt = buildInstrumentalPrompt(randomGenre, picked, randomGenre.defaultBpm);
    onApplyPrompt(newPrompt, randomGenre.defaultBpm);
  };

  const filteredInstruments = INSTRUMENT_CATALOG.filter(inst => {
    if (activeCategoryFilter === 'all') return true;
    return inst.category === activeCategoryFilter;
  });

  return (
    <div className="hardware-card p-5 relative overflow-hidden font-mono text-xs border border-[#2b2d37] space-y-5">
      {/* Decorative Screws */}
      <div className="absolute top-2 left-2 w-2 h-2 rounded-full border border-[#333] bg-[#1a1a1c]" />
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full border border-[#333] bg-[#1a1a1c]" />
      <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full border border-[#333] bg-[#1a1a1c]" />
      <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full border border-[#333] bg-[#1a1a1c]" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23252d] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-500">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Instrument & Genre Studio
              </h3>
              <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold uppercase">
                AI Instrumental
              </span>
            </div>
            <p className="text-[10px] text-[#787d8a] mt-0.5">
              Select musical genre and combine live instruments to build pure vocal-free instrumental compositions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRandomizeArrangement}
            className="px-2.5 py-1.5 bg-[#181920] hover:bg-[#232530] border border-[#2d303d] hover:border-red-500/50 text-[10px] text-white rounded font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            title="Randomize genre and instrument combination"
          >
            <Dices className="w-3.5 h-3.5 text-red-400" />
            <span>Randomize Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 text-[10px] text-[#8e9299] hover:text-white border border-[#2d303d] rounded cursor-pointer"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-5">
          {/* Section 1: Genre Selector Strip */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] text-[#8e9299] uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-red-400" />
                <span>1. Select Genre Preset ({GENRE_CATALOG.length} Available)</span>
              </label>
              <span className="text-[10px] text-[#6d717d]">
                ACTIVE: <b className="text-white">{selectedGenre.name}</b> • <b className="text-amber-400">{selectedGenre.defaultBpm} BPM</b>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {GENRE_CATALOG.map((genre) => {
                const isSelected = selectedGenreId === genre.id;
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => handleSelectGenre(genre)}
                    className={`p-2.5 rounded text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-red-500/15 border-red-500 text-white shadow-[0_0_12px_rgba(255,68,68,0.25)]'
                        : 'bg-[#121318] border-[#22242c] text-[#8a8f9c] hover:border-[#383b47] hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[11px] font-bold truncate block">{genre.name}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1" />}
                      </div>
                      <span className="text-[9px] text-[#676b76] uppercase block mt-0.5">
                        {genre.category}
                      </span>
                    </div>
                    <div className="text-[9px] text-amber-400/90 font-bold mt-2 pt-1 border-t border-white/5">
                      {genre.defaultBpm} BPM
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Genre Description Callout */}
            <div className="mt-2 p-2 bg-[#0c0d11] border border-[#1e2028] rounded flex items-center justify-between text-[10px] text-[#8e9299]">
              <span className="italic line-clamp-1">"{selectedGenre.description}"</span>
              <button
                type="button"
                onClick={() => onBpmChange(selectedGenre.defaultBpm)}
                className="text-[9px] uppercase px-1.5 py-0.5 bg-[#1b1c24] hover:bg-[#252834] text-amber-400 rounded border border-[#2b2d39] ml-2 shrink-0 cursor-pointer"
                title="Sync project tempo to genre standard"
              >
                Sync {selectedGenre.defaultBpm} BPM
              </button>
            </div>
          </div>

          {/* Section 2: Instrument Matrix */}
          <div>
            <div className="flex flex-wrap justify-between items-center mb-2.5 gap-2">
              <label className="text-[10px] text-[#8e9299] uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Guitar className="w-3.5 h-3.5 text-green-400" />
                <span>2. Pick Instruments ({selectedInstrumentIds.length} Selected)</span>
              </label>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1 text-[9px]">
                {(['all', 'rhythm', 'bass', 'lead', 'fx'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded uppercase font-bold border transition-all cursor-pointer ${
                      activeCategoryFilter === cat
                        ? 'bg-[#292b36] text-white border-green-500/60'
                        : 'bg-[#121317] text-[#686d79] border-[#20222a] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {filteredInstruments.map((inst) => {
                const isSelected = selectedInstrumentIds.includes(inst.id);
                return (
                  <div
                    key={inst.id}
                    onClick={() => handleToggleInstrument(inst.id)}
                    className={`p-2.5 rounded border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-green-500/10 border-green-500/70 text-white shadow-[0_0_10px_rgba(34,197,94,0.15)]'
                        : 'bg-[#101116] border-[#22242c] text-[#7e8391] hover:border-[#383b47] hover:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-bold text-[11px] leading-snug">{inst.name}</span>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected 
                          ? 'bg-green-500 border-green-400 text-black' 
                          : 'border-[#333] bg-[#18191f]'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>

                    <p className="text-[9px] text-[#686d79] mt-1 line-clamp-2 leading-relaxed">
                      {inst.description}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5 text-[8px] uppercase">
                      <span className={isSelected ? 'text-green-400 font-bold' : 'text-[#555]'}>
                        {inst.tag}
                      </span>
                      <span className="text-[#555]">{isSelected ? 'ACTIVE' : 'OFF'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Assembled Instrumental Action Card */}
          <div className="p-3.5 bg-[#0e0f14] border border-[#272935] rounded flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_#22c55e]" />
                <span className="text-white text-[11px] font-bold uppercase tracking-wider">
                  INSTRUMENTAL ARRANGEMENT READY
                </span>
                <span className="text-[#717684] text-[10px]">
                  ({selectedInstrumentIds.length} Instruments • {selectedGenre.name} • {currentBpm} BPM)
                </span>
              </div>
              <p className="text-[10px] text-[#7e8391] line-clamp-1 italic">
                "{currentPrompt}"
              </p>
            </div>

            <button
              type="button"
              disabled={isGenerating}
              onClick={onGenerateMusic}
              className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-mono text-[11px] uppercase tracking-wider font-bold rounded flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,68,68,0.4)] disabled:opacity-50 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Generate Instrumental Track</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
