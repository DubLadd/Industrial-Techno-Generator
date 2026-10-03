export type GenerationMode = 'clip' | 'pro';

export type TechnoCategory = 
  | 'Hard' 
  | 'Ambient' 
  | 'Acid' 
  | 'Industrial' 
  | 'Hypnotic' 
  | 'Peak Time' 
  | 'Raw';

export const TECHNO_CATEGORIES: TechnoCategory[] = [
  'Hard',
  'Ambient',
  'Acid',
  'Industrial',
  'Hypnotic',
  'Peak Time',
  'Raw'
];

export interface TechnoPreset {
  id: string;
  name: string;
  category: TechnoCategory;
  subgenre: string;
  description: string;
  prompt: string;
  mode: GenerationMode;
  bpm: number;
  distortion: number; // 0 - 100
  resonance: number;  // 0 - 100
  feedback: number;   // 0 - 100
  reverb: number;     // 0 - 100
  createdAt: number;
  isBuiltIn?: boolean;
}

export const DEFAULT_TECHNO_PRESETS: TechnoPreset[] = [
  {
    id: 'preset-schranz-anvil',
    name: 'Schranz Anvil Assault',
    category: 'Hard',
    subgenre: 'Hard Techno / Schranz',
    description: 'Hyper-relentless 152 BPM velocity with distorted sledgehammer kicks and metallic factory clangs.',
    prompt: 'High-speed industrial Schranz techno, 152 BPM, hyper-distorted punchy kick, metallic anvil strikes, clashing iron machinery, white noise filter sweeps, raw aggressive velocity, Berlin basement atmosphere.',
    mode: 'pro',
    bpm: 152,
    distortion: 98,
    resonance: 45,
    feedback: 85,
    reverb: 50,
    createdAt: 1711000000000,
    isBuiltIn: true,
  },
  {
    id: 'preset-acid-warehouse',
    name: 'Acid 303 Meltdown',
    category: 'Acid',
    subgenre: 'Industrial Acid',
    description: 'Screaming squelching TB-303 acid line driven through heavy distortion pedal over an aggressive 909 kick.',
    prompt: 'Aggressive industrial acid techno, 142 BPM, screeching overdriven Roland TB-303 resonant acid bassline, relentless 909 kick drum, sizzling open hi-hats, warehouse rave reverberation, high energy.',
    mode: 'pro',
    bpm: 142,
    distortion: 94,
    resonance: 90,
    feedback: 60,
    reverb: 65,
    createdAt: 1711000001000,
    isBuiltIn: true,
  },
  {
    id: 'preset-hypnotic-drone',
    name: 'Subterranean Drone Vault',
    category: 'Ambient',
    subgenre: 'Dark Ambient Drone',
    description: 'Deep subterranean sub-drone texture with evolving modular filter modulations and clinical click percussions.',
    prompt: 'Deep atmospheric dark ambient industrial techno, 126 BPM, subterranean bass drone with slow resonant sweep, cavernous dub delay reflections, minimal textures, clinical high-frequency clock pulses, eerie dystopian atmosphere.',
    mode: 'clip',
    bpm: 126,
    distortion: 45,
    resonance: 88,
    feedback: 82,
    reverb: 95,
    createdAt: 1711000002000,
    isBuiltIn: true,
  },
  {
    id: 'preset-berghain-rumble',
    name: 'Berghain Sub-Rumble',
    category: 'Hypnotic',
    subgenre: 'Dark Hypnotic',
    description: 'Subterranean 138 BPM kick with reverberant warehouse rumble, metallic ride cymbals, and minimal modular synth blips.',
    prompt: 'Dark hypnotic industrial techno, 138 BPM, massive sub-bass kick drum with warehouse rumble decay, hollow metallic ride percussions, subterranean low-frequency oscillation, cavernous industrial acoustic space.',
    mode: 'clip',
    bpm: 138,
    distortion: 82,
    resonance: 64,
    feedback: 70,
    reverb: 88,
    createdAt: 1711000003000,
    isBuiltIn: true,
  },
  {
    id: 'preset-ebm-foundry',
    name: 'EBM Foundry Gear',
    category: 'Industrial',
    subgenre: 'EBM / Industrial',
    description: 'Mechanical body-music rhythms, sequencing bass synthesizer, and pneumatic steam exhausts.',
    prompt: 'Dark EBM industrial body music, 128 BPM, syncopated modular bassline sequence, heavy gated snare, metallic pipe percussion, hydraulic hiss and factory machinery samples, bleak dystopian electronic groove.',
    mode: 'clip',
    bpm: 128,
    distortion: 68,
    resonance: 72,
    feedback: 55,
    reverb: 60,
    createdAt: 1711000004000,
    isBuiltIn: true,
  },
  {
    id: 'preset-rotterdam-hard',
    name: 'Rotterdam Sledgehammer',
    category: 'Hard',
    subgenre: 'Hardcore Industrial',
    description: '155 BPM distorted four-on-the-floor sledgehammer kick with piercing siren leads and rapid hi-hat rolls.',
    prompt: 'Brutal hard industrial techno, 155 BPM, devastating distorted kick drum with clipped square-wave harmonics, screeching dark synthesizer sirens, relentless driving velocity, warehouse sound system pressure.',
    mode: 'pro',
    bpm: 155,
    distortion: 99,
    resonance: 50,
    feedback: 90,
    reverb: 40,
    createdAt: 1711000005000,
    isBuiltIn: true,
  },
  {
    id: 'preset-detroit-machina',
    name: 'Detroit Machina 909',
    category: 'Raw',
    subgenre: 'Raw Detroit Industrial',
    description: 'Analog tape saturation, raw clattering shaker grooves, distorted syncopated chord stabs.',
    prompt: 'Raw analog Detroit industrial techno, 136 BPM, distorted 909 rimshot groove, overdriven chord stabs, tape hiss and tube saturation, dark driving momentum, mechanical rhythms.',
    mode: 'pro',
    bpm: 136,
    distortion: 75,
    resonance: 58,
    feedback: 62,
    reverb: 70,
    createdAt: 1711000006000,
    isBuiltIn: true,
  },
  {
    id: 'preset-peak-monolith',
    name: 'Monolith Peak Velocity',
    category: 'Peak Time',
    subgenre: 'Peak Time Industrial',
    description: 'Peak-time festival warehouse weapon with rolling bassline drive and tension risers.',
    prompt: 'High-energy peak time industrial techno, 140 BPM, relentless rolling bassline, thunderous sub kick, sharp closed hi-hats, tense noise riser drops, dark festival rave energy.',
    mode: 'pro',
    bpm: 140,
    distortion: 88,
    resonance: 68,
    feedback: 72,
    reverb: 75,
    createdAt: 1711000007000,
    isBuiltIn: true,
  }
];

const PRESETS_STORAGE_KEY = 'industrial_techno_presets_v3';

export function loadPresets(): TechnoPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(DEFAULT_TECHNO_PRESETS));
      return DEFAULT_TECHNO_PRESETS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all presets have a valid category
      return parsed.map((p: any) => ({
        ...p,
        category: p.category || (p.subgenre?.includes('Hard') ? 'Hard' : p.subgenre?.includes('Acid') ? 'Acid' : p.subgenre?.includes('Drone') ? 'Ambient' : 'Industrial')
      }));
    }
    return DEFAULT_TECHNO_PRESETS;
  } catch (e) {
    console.error('Failed to load presets from localStorage', e);
    return DEFAULT_TECHNO_PRESETS;
  }
}

export function savePresets(presets: TechnoPreset[]): void {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save presets to localStorage', e);
  }
}
