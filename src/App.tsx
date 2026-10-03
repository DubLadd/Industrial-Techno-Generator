/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Music, 
  Play, 
  Pause,
  Download, 
  Settings, 
  Activity, 
  Zap, 
  Volume2, 
  AlertCircle,
  Loader2,
  Key,
  Sliders,
  Bookmark,
  VolumeX,
  Radio,
  Sparkles,
  Headphones,
  Tag,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TechnoPreset, TechnoCategory, loadPresets, savePresets, DEFAULT_TECHNO_PRESETS } from './types/presets';
import { InteractiveKnob } from './components/InteractiveKnob';
import { AudioVisualizer } from './components/AudioVisualizer';
import { TechnoPresetsRack } from './components/TechnoPresetsRack';
import { InstrumentGenrePicker } from './components/InstrumentGenrePicker';
import { TapTempoButton } from './components/TapTempoButton';
import { AudioScrubber } from './components/AudioScrubber';
import { MasterEqualizer } from './components/MasterEqualizer';
import { TrackCoverArt } from './components/TrackCoverArt';
import { TrackMetadataPanel } from './components/TrackMetadataPanel';
import { AutomationRack, AutomationCurves, evaluateCurveValue } from './components/AutomationRack';
import { IndustrialDemoSynth } from './utils/demoSynth';
import { 
  normalizeAudioBuffer, 
  renderMasterWithEq, 
  audioBufferToWav,
  TrackMetadata
} from './utils/audioMastering';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type GenerationMode = 'clip' | 'pro';

export default function App() {
  // Preset & Synthesis State
  const [presets, setPresets] = useState<TechnoPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Knobs & Parameters
  const [prompt, setPrompt] = useState('Dark, gritty industrial techno with heavy distorted kicks, metallic percussion, and atmospheric drones. 138 BPM.');
  const [mode, setMode] = useState<GenerationMode>('clip');
  const [bpm, setBpm] = useState<number>(138);
  const [distortion, setDistortion] = useState<number>(85);
  const [resonance, setResonance] = useState<number>(64);
  const [feedback, setFeedback] = useState<number>(70);
  const [reverb, setReverb] = useState<number>(80);

  // Generation & Audio State
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);

  // Web Audio API State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [analyserReady, setAnalyserReady] = useState<boolean>(false);

  // Master Equalizer Shelf State (-12dB to +12dB)
  const [lowEq, setLowEq] = useState<number>(0);
  const [midEq, setMidEq] = useState<number>(0);
  const [highEq, setHighEq] = useState<number>(0);

  // Normalization State (-1.0 dB target)
  const [isNormalized, setIsNormalized] = useState<boolean>(true);
  const [normalizationStats, setNormalizationStats] = useState<{
    originalPeakDb: number;
    gainAppliedDb: number;
    targetPeakDb: number;
  } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Soft Limiter (Hard-Knee 0dB Knee, -1.0dB Threshold)
  const [softLimiterEnabled, setSoftLimiterEnabled] = useState<boolean>(true);

  // Main Rack Tab: 'knobs' | 'automation'
  const [activeDspTab, setActiveDspTab] = useState<'knobs' | 'automation'>('knobs');

  // Automation Curves & State
  const [automationEnabled, setAutomationEnabled] = useState<boolean>(true);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [automationCurves, setAutomationCurves] = useState<AutomationCurves>({
    distortion: [
      { id: 'd1', time: 0.0, value: 25 },
      { id: 'd2', time: 0.35, value: 50 },
      { id: 'd3', time: 0.7, value: 80 },
      { id: 'd4', time: 1.0, value: 95 }
    ],
    feedback: [
      { id: 'f1', time: 0.0, value: 20 },
      { id: 'f2', time: 0.5, value: 65 },
      { id: 'f3', time: 0.8, value: 35 },
      { id: 'f4', time: 1.0, value: 75 }
    ],
    reverb: [
      { id: 'r1', time: 0.0, value: 30 },
      { id: 'r2', time: 0.45, value: 70 },
      { id: 'r3', time: 0.55, value: 20 },
      { id: 'r4', time: 1.0, value: 65 }
    ]
  });

  // Track Metadata & Export Panel State
  const [isMetadataPanelOpen, setIsMetadataPanelOpen] = useState<boolean>(false);
  const [trackMetadata, setTrackMetadata] = useState<TrackMetadata>({
    title: 'Industrial Techno Master',
    artist: 'Berlin Sound Lab',
    genre: 'Industrial Techno',
    bpm: 138,
    key: 'Fm',
    comment: 'Mastered to -1.0 dBFS • Hard-Knee Limited',
    year: new Date().getFullYear().toString()
  });

  // Cover Art State
  const [coverArtUrl, setCoverArtUrl] = useState<string | null>('/src/assets/images/dark_techno_cover_1791062237705.jpg');
  const [isGeneratingCoverArt, setIsGeneratingCoverArt] = useState<boolean>(false);

  // Audio Buffers
  const rawAudioBufferRef = useRef<AudioBuffer | null>(null);
  const normalizedAudioBufferRef = useRef<AudioBuffer | null>(null);

  // Biquad Filter Nodes for real-time Master EQ & Limiter
  const lowShelfRef = useRef<BiquadFilterNode | null>(null);
  const midPeakRef = useRef<BiquadFilterNode | null>(null);
  const highShelfRef = useRef<BiquadFilterNode | null>(null);
  const limiterNodeRef = useRef<DynamicsCompressorNode | null>(null);

  // Crossfade Gain-Node Bridge (prevents harsh audio pops when switching between demo synth and media track)
  const demoGainRef = useRef<GainNode | null>(null);
  const mediaGainRef = useRef<GainNode | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const demoSynthRef = useRef<IndustrialDemoSynth | null>(null);

  // Load Presets on Mount
  useEffect(() => {
    checkApiKey();
    const stored = loadPresets();
    setPresets(stored);
    if (stored.length > 0) {
      setActivePresetId(stored[0].id);
    }
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } else {
      setHasApiKey(true);
    }
  };

  const handleOpenKeySelection = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  // Initialize Web Audio API Analyser, Equalizer Shelves & Graph
  const initAudioGraph = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;

      // 100 Hz Low Shelf Filter
      const lowShelf = ctx.createBiquadFilter();
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 100;
      lowShelf.gain.value = lowEq;

      // 1.5 kHz Mid Peaking Filter
      const midPeak = ctx.createBiquadFilter();
      midPeak.type = 'peaking';
      midPeak.frequency.value = 1500;
      midPeak.Q.value = 1.0;
      midPeak.gain.value = midEq;

      // 8.5 kHz High Shelf Filter
      const highShelf = ctx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 8500;
      highShelf.gain.value = highEq;

      // Connect EQ Chain & Hard-Knee Soft Limiter: lowShelf -> midPeak -> highShelf -> limiter -> analyser -> destination
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = softLimiterEnabled ? -1.0 : 0.0;
      limiter.knee.value = 0.0;     // 0 dB Knee = Exact Hard-Knee
      limiter.ratio.value = softLimiterEnabled ? 20.0 : 1.0;
      limiter.attack.value = 0.001; // 1ms ultra-fast transient catch
      limiter.release.value = 0.05; // 50ms fast recovery

      lowShelf.connect(midPeak);
      midPeak.connect(highShelf);
      highShelf.connect(limiter);
      limiter.connect(analyser);
      analyser.connect(ctx.destination);

      // Crossfade Gain Nodes (Anti-pop bridge)
      const demoGain = ctx.createGain();
      demoGain.gain.value = 1.0;

      const mediaGain = ctx.createGain();
      mediaGain.gain.value = 1.0;

      // Both bridge gains route into the master lowShelf EQ filter
      demoGain.connect(lowShelf);
      mediaGain.connect(lowShelf);

      demoGainRef.current = demoGain;
      mediaGainRef.current = mediaGain;

      audioContextRef.current = ctx;
      analyserNodeRef.current = analyser;
      lowShelfRef.current = lowShelf;
      midPeakRef.current = midPeak;
      highShelfRef.current = highShelf;
      limiterNodeRef.current = limiter;

      // Connect HTMLAudioElement through Media Gain Bridge & EQ Chain if ready
      if (audioRef.current && !sourceNodeRef.current) {
        try {
          const source = ctx.createMediaElementSource(audioRef.current);
          source.connect(mediaGain);
          sourceNodeRef.current = source;
        } catch (e) {
          console.warn('Audio source connection note:', e);
        }
      }

      // Initialize Demo Synth (feeds into demoGain bridge)
      demoSynthRef.current = new IndustrialDemoSynth(ctx, demoGain);
      setAnalyserReady(true);
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Sync Equalizer Gains to Audio Graph in Real-Time
  useEffect(() => {
    if (lowShelfRef.current) lowShelfRef.current.gain.value = lowEq;
    if (midPeakRef.current) midPeakRef.current.gain.value = midEq;
    if (highShelfRef.current) highShelfRef.current.gain.value = highEq;
  }, [lowEq, midEq, highEq]);

  // Sync Soft Limiter to Audio Graph
  useEffect(() => {
    if (limiterNodeRef.current && audioContextRef.current) {
      const now = audioContextRef.current.currentTime;
      limiterNodeRef.current.threshold.cancelScheduledValues(now);
      limiterNodeRef.current.threshold.setValueAtTime(softLimiterEnabled ? -1.0 : 0.0, now);
      limiterNodeRef.current.ratio.cancelScheduledValues(now);
      limiterNodeRef.current.ratio.setValueAtTime(softLimiterEnabled ? 20.0 : 1.0, now);
    }
  }, [softLimiterEnabled]);

  const handleToggleSoftLimiter = () => {
    setSoftLimiterEnabled(prev => !prev);
  };

  // Drive automation curves dynamically during track playback
  useEffect(() => {
    let animId: number;
    const updatePlaybackAutomation = () => {
      const audio = audioRef.current;
      if (audio && isPlayingAudio && audio.duration > 0) {
        const progress = Math.max(0, Math.min(1, audio.currentTime / audio.duration));
        setPlaybackProgress(progress);

        if (automationEnabled) {
          const autoDist = evaluateCurveValue(automationCurves.distortion, progress, distortion);
          const autoFeed = evaluateCurveValue(automationCurves.feedback, progress, feedback);
          const autoRev = evaluateCurveValue(automationCurves.reverb, progress, reverb);
          
          setDistortion(autoDist);
          setFeedback(autoFeed);
          setReverb(autoRev);
        }
      }
      if (isPlayingAudio) {
        animId = requestAnimationFrame(updatePlaybackAutomation);
      }
    };

    if (isPlayingAudio) {
      animId = requestAnimationFrame(updatePlaybackAutomation);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlayingAudio, automationEnabled, automationCurves]);

  // Apply prompt assembled from Genre and Instrument Matrix
  const handleApplyInstrumentalPrompt = (newPrompt: string, newBpm: number) => {
    setPrompt(newPrompt);
    setBpm(newBpm);
  };

  // Generate dark, gritty album cover art based on current prompt metadata
  const handleGenerateCoverArt = async () => {
    setIsGeneratingCoverArt(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const activePreset = presets.find(p => p.id === activePresetId);
      const genreKeyword = prompt.match(/in (.*?) style/i)?.[1] || activePreset?.category || 'Industrial Techno';

      const coverPrompt = `Dark, gritty, atmospheric album cover art for an underground ${genreKeyword} instrumental record. Brutalist architecture, analog textures, high contrast with crimson red neon glow, heavy film grain and analog vinyl record wear texture. Text elements: "${bpm} BPM • ${genreKeyword.toUpperCase()}", minimalist distressed typography. 1:1 square aspect ratio. Raw, dark, abrasive.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: coverPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            const base64 = part.inlineData.data;
            setCoverArtUrl(`data:image/png;base64,${base64}`);
            break;
          }
        }
      }
    } catch (err: any) {
      console.error('Cover art generation error:', err);
    } finally {
      setIsGeneratingCoverArt(false);
    }
  };

  // Connect Audio Element to Media Gain Bridge once Audio Element is rendered
  useEffect(() => {
    if (audioRef.current && audioContextRef.current && mediaGainRef.current && !sourceNodeRef.current) {
      try {
        const source = audioContextRef.current.createMediaElementSource(audioRef.current);
        source.connect(mediaGainRef.current);
        sourceNodeRef.current = source;
      } catch (e) {
        console.warn('Media element source already connected or error:', e);
      }
    }
  }, [audioUrl]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: TechnoPreset) => {
    setActivePresetId(preset.id);
    setPrompt(preset.prompt);
    setMode(preset.mode);
    setBpm(preset.bpm);
    setDistortion(preset.distortion);
    setResonance(preset.resonance);
    setFeedback(preset.feedback);
    setReverb(preset.reverb);
  };

  // Save Current Prompt & Knobs as Preset
  const handleSaveCurrentAsPreset = (
    name: string, 
    category: TechnoCategory, 
    subgenre: string, 
    description: string
  ) => {
    const newPreset: TechnoPreset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      category,
      subgenre,
      description,
      prompt,
      mode,
      bpm,
      distortion,
      resonance,
      feedback,
      reverb,
      createdAt: Date.now(),
      isBuiltIn: false
    };

    const updated = [newPreset, ...presets];
    setPresets(updated);
    savePresets(updated);
    setActivePresetId(newPreset.id);
  };

  // Delete Preset
  const handleDeletePreset = (presetId: string) => {
    const updated = presets.filter(p => p.id !== presetId);
    setPresets(updated);
    savePresets(updated);
    if (activePresetId === presetId) {
      setActivePresetId(updated[0]?.id || null);
    }
  };

  // Reset to Built-in Factory Presets
  const handleResetDefaults = () => {
    if (confirm('Restore factory Techno Presets? Custom patches will be reset.')) {
      setPresets(DEFAULT_TECHNO_PRESETS);
      savePresets(DEFAULT_TECHNO_PRESETS);
      setActivePresetId(DEFAULT_TECHNO_PRESETS[0].id);
      handleSelectPreset(DEFAULT_TECHNO_PRESETS[0]);
    }
  };

  // Import Presets
  const handleImportPresets = (imported: TechnoPreset[]) => {
    setPresets(imported);
    savePresets(imported);
    if (imported.length > 0) {
      setActivePresetId(imported[0].id);
      handleSelectPreset(imported[0]);
    }
  };

  // Sync Knobs into Prompt
  const handleInjectKnobsIntoPrompt = () => {
    let base = prompt;
    // Replace or append BPM
    if (/\b\d{2,3}\s*BPM\b/i.test(base)) {
      base = base.replace(/\b\d{2,3}\s*BPM\b/i, `${bpm} BPM`);
    } else {
      base += `, ${bpm} BPM`;
    }

    // Add textural note based on knobs
    const distText = distortion > 80 ? 'hyper-distorted overdrive' : distortion > 50 ? 'analog saturated' : 'clean punchy';
    const resText = resonance > 75 ? 'screaming resonant filter' : resonance > 40 ? 'sweeping lowpass' : 'deep sub filtered';
    
    setPrompt(`${base}. Features ${distText} kicks and ${resText}.`);
  };

  // Crossfade Transition Constant (60ms envelope eliminates DC offset and phase-discontinuity pops)
  const CROSSFADE_TIME = 0.06;

  // Smooth Crossfade to Demo Synth
  const crossfadeToDemo = () => {
    initAudioGraph();
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;

    const demoGain = demoGainRef.current;
    const mediaGain = mediaGainRef.current;

    // Fade out media playback smoothly if active
    if (mediaGain && audioRef.current && !audioRef.current.paused) {
      mediaGain.gain.cancelScheduledValues(now);
      mediaGain.gain.setValueAtTime(mediaGain.gain.value, now);
      mediaGain.gain.linearRampToValueAtTime(0.0001, now + CROSSFADE_TIME);

      setTimeout(() => {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsPlayingAudio(false);
        }
      }, CROSSFADE_TIME * 1000);
    }

    // Fade in demo synth smoothly
    if (demoGain) {
      demoGain.gain.cancelScheduledValues(now);
      demoGain.gain.setValueAtTime(0.0001, now);
      demoGain.gain.linearRampToValueAtTime(1.0, now + CROSSFADE_TIME);
    }

    demoSynthRef.current?.start(bpm);
    setIsDemoPlaying(true);
  };

  // Smooth Stop Demo Synth
  const stopDemoWithFade = () => {
    const ctx = audioContextRef.current;
    if (!ctx || !demoGainRef.current) {
      demoSynthRef.current?.stop();
      setIsDemoPlaying(false);
      return;
    }

    const now = ctx.currentTime;
    const demoGain = demoGainRef.current;
    demoGain.gain.cancelScheduledValues(now);
    demoGain.gain.setValueAtTime(demoGain.gain.value, now);
    demoGain.gain.linearRampToValueAtTime(0.0001, now + CROSSFADE_TIME);

    setTimeout(() => {
      demoSynthRef.current?.stop();
      setIsDemoPlaying(false);
    }, CROSSFADE_TIME * 1000);
  };

  // Smooth Crossfade to Generated Media Track
  const crossfadeToMedia = () => {
    initAudioGraph();
    const ctx = audioContextRef.current;
    if (!ctx || !audioRef.current) return;
    const now = ctx.currentTime;

    const demoGain = demoGainRef.current;
    const mediaGain = mediaGainRef.current;

    // Fade out demo synth smoothly if it is running
    if (demoGain && isDemoPlaying) {
      demoGain.gain.cancelScheduledValues(now);
      demoGain.gain.setValueAtTime(demoGain.gain.value, now);
      demoGain.gain.linearRampToValueAtTime(0.0001, now + CROSSFADE_TIME);

      setTimeout(() => {
        demoSynthRef.current?.stop();
        setIsDemoPlaying(false);
      }, CROSSFADE_TIME * 1000);
    }

    // Fade in media playback smoothly
    if (mediaGain) {
      mediaGain.gain.cancelScheduledValues(now);
      mediaGain.gain.setValueAtTime(0.0001, now);
      mediaGain.gain.linearRampToValueAtTime(1.0, now + CROSSFADE_TIME);
    }

    audioRef.current.play().catch(e => console.log('Playback error:', e));
    setIsPlayingAudio(true);
  };

  // Smooth Pause Media Track
  const pauseMediaWithFade = () => {
    const ctx = audioContextRef.current;
    if (!ctx || !mediaGainRef.current || !audioRef.current) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
      return;
    }

    const now = ctx.currentTime;
    const mediaGain = mediaGainRef.current;
    mediaGain.gain.cancelScheduledValues(now);
    mediaGain.gain.setValueAtTime(mediaGain.gain.value, now);
    mediaGain.gain.linearRampToValueAtTime(0.0001, now + CROSSFADE_TIME);

    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingAudio(false);
    }, CROSSFADE_TIME * 1000);
  };

  // Toggle Web Audio Demo Synth (909 / Acid pattern) with Crossfade Bridge
  const toggleDemoSynth = () => {
    if (isDemoPlaying) {
      stopDemoWithFade();
    } else {
      crossfadeToDemo();
    }
  };

  // Audio generation logic
  const generateMusic = async () => {
    if (!prompt.trim()) return;

    // Stop demo synth with anti-pop fade if running
    if (isDemoPlaying) {
      stopDemoWithFade();
    }

    initAudioGraph();
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setLyrics(null);
    setProgress(0);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const modelName = mode === 'clip' ? "lyria-3-clip-preview" : "lyria-3-pro-preview";
      
      const response = await ai.models.generateContentStream({
        model: modelName,
        contents: prompt,
      });

      let audioBase64 = "";
      let currentLyrics = "";
      let mimeType = "audio/wav";

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 1, 95));
      }, 500);

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !currentLyrics) {
            currentLyrics = part.text;
            setLyrics(currentLyrics);
          }
        }
      }

      clearInterval(progressInterval);
      setProgress(100);

      if (audioBase64) {
        const binary = atob(audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        // Initialize Audio Graph if not yet active
        initAudioGraph();
        const ctx = audioContextRef.current!;

        try {
          // Decode audio into buffer for volume normalization
          const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
          rawAudioBufferRef.current = decoded;

          // Normalize volume levels to -1.0 dBFS for consistent, punchy output
          const normResult = normalizeAudioBuffer(decoded, ctx, -1.0);
          normalizedAudioBufferRef.current = normResult.normalizedBuffer;

          setNormalizationStats({
            originalPeakDb: normResult.originalPeakDb,
            gainAppliedDb: normResult.gainAppliedDb,
            targetPeakDb: -1.0
          });

          // Create normalized lossless WAV Blob
          const normalizedBlob = audioBufferToWav(normResult.normalizedBuffer);
          const url = URL.createObjectURL(normalizedBlob);
          setAudioUrl(url);
        } catch (normErr) {
          console.warn('Decode/Normalize fallback:', normErr);
          const fallbackBlob = new Blob([bytes], { type: mimeType });
          const url = URL.createObjectURL(fallbackBlob);
          setAudioUrl(url);
        }

        // Auto-play the generated track after creation
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.log('Autoplay deferred for user gesture:', e));
          }
        }, 150);

        // Auto-generate matching dark gritty cover art in background
        handleGenerateCoverArt();
      } else {
        throw new Error("No audio data received from the model.");
      }

    } catch (err: any) {
      console.error("Generation error:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("API Key error. Please re-select your API key.");
      } else {
        setError(err.message || "Failed to generate music. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset EQ Shelves
  const handleResetEq = () => {
    setLowEq(0);
    setMidEq(0);
    setHighEq(0);
  };

  // Toggle -1.0dB Volume Normalization A/B comparison
  const handleToggleNormalize = () => {
    const nextNormalized = !isNormalized;
    setIsNormalized(nextNormalized);

    const targetBuffer = nextNormalized 
      ? normalizedAudioBufferRef.current 
      : rawAudioBufferRef.current;

    if (targetBuffer) {
      const wasPlaying = isPlayingAudio;
      const currentPos = audioRef.current?.currentTime || 0;

      const newBlob = audioBufferToWav(targetBuffer);
      const newUrl = URL.createObjectURL(newBlob);
      setAudioUrl(newUrl);

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = currentPos;
          if (wasPlaying) {
            audioRef.current.play().catch(e => console.log('Playback resume note:', e));
          }
        }
      }, 50);
    }
  };

  // Export Master with EQ Coloring, -1.0dB Normalization, and Embedded ID3 / RIFF Metadata
  const handleExportColoredMaster = async (customMeta?: TrackMetadata) => {
    const metaToUse = customMeta || trackMetadata;
    const bufferToUse = isNormalized
      ? (normalizedAudioBufferRef.current || rawAudioBufferRef.current)
      : (rawAudioBufferRef.current || normalizedAudioBufferRef.current);

    if (!bufferToUse) {
      if (audioUrl) {
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `${metaToUse.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'master'}-${bpm}bpm.wav`;
        a.click();
      }
      return;
    }

    setIsExporting(true);
    try {
      // If user colored the audio with Low, Mid, or High EQ, or soft limiter is active, render through OfflineAudioContext
      let finalBuffer = bufferToUse;
      const isColored = lowEq !== 0 || midEq !== 0 || highEq !== 0;
      if (isColored || softLimiterEnabled) {
        finalBuffer = await renderMasterWithEq(bufferToUse, lowEq, midEq, highEq, softLimiterEnabled);
      }

      // Encode lossless WAV with embedded RIFF INFO and ID3v2.3 tag chunks
      const finalizedBlob = audioBufferToWav(finalBuffer, {
        ...metaToUse,
        bpm: bpm
      });
      const exportUrl = URL.createObjectURL(finalizedBlob);
      const a = document.createElement('a');
      a.href = exportUrl;
      const safeTitle = metaToUse.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'techno-master';
      a.download = `${safeTitle}-${bpm}bpm-${metaToUse.key.toLowerCase()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(exportUrl), 10000);
      setIsMetadataPanelOpen(false);
    } catch (err) {
      console.error('Master render error, falling back:', err);
      if (audioUrl) {
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `techno-master-${bpm}bpm.wav`;
        a.click();
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle Play/Pause for generated audio
  const handleTogglePlayPause = () => {
    initAudioGraph();
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      crossfadeToMedia();
    } else {
      pauseMediaWithFade();
    }
  };

  // Audio Playback event handlers for Analyser synchronization
  const handleAudioPlay = () => {
    initAudioGraph();
    if (isDemoPlaying) {
      stopDemoWithFade();
    }
    const ctx = audioContextRef.current;
    if (ctx && mediaGainRef.current) {
      const now = ctx.currentTime;
      mediaGainRef.current.gain.cancelScheduledValues(now);
      mediaGainRef.current.gain.setValueAtTime(1.0, now);
    }
    setIsPlayingAudio(true);
  };

  const handleAudioPause = () => {
    setIsPlayingAudio(false);
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
  };

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0c]">
        <div className="hardware-card p-8 max-w-md w-full text-center space-y-6 border border-red-500/40">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/30">
              <Key className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase font-mono">Authentication Required</h1>
          <p className="text-[#8e9299] text-sm leading-relaxed font-mono">
            To use Lyria music generation models, you must select a paid Gemini API key. 
            Please visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-red-400 underline">billing documentation</a> for more info.
          </p>
          <button 
            onClick={handleOpenKeySelection}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-mono font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,68,68,0.4)]"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  const isAnyAudioActive = isPlayingAudio || isDemoPlaying;

  return (
    <div className="min-h-screen p-3 md:p-8 flex flex-col items-center bg-[#0a0a0c]">
      {/* Header Rack Bar */}
      <header className="w-full max-w-6xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#1f2026] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="status-led active pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8e9299] font-mono">
                DSP CORE ONLINE
              </span>
            </div>
            <div className="h-3 w-px bg-[#262830]" />
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isAnyAudioActive ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-[#292a30]'}`} />
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8e9299] font-mono">
                {isDemoPlaying ? 'SYNTH RUNNING' : isPlayingAudio ? 'PLAYBACK ACTIVE' : 'AUDIO ENGINE READY'}
              </span>
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none font-mono text-white">
            Industrial <span className="text-red-500">Techno</span> Gen
          </h1>
          <p className="text-[11px] text-[#717684] font-mono mt-1">
            Algorithmic sound synthesis rack & real-time spectral analyzer
          </p>
        </div>

        {/* Model Mode Switcher & Quick Demo Synth Trigger */}
        <div className="flex flex-col sm:flex-row items-end gap-3 font-mono">
          {/* Web Audio Demo Synth Preview Trigger */}
          <button
            onClick={toggleDemoSynth}
            className={`px-3 py-1.5 border text-[10px] uppercase font-bold tracking-wider rounded flex items-center gap-1.5 transition-all cursor-pointer ${
              isDemoPlaying 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse' 
                : 'border-[#2c2f38] text-[#9398a6] hover:text-white hover:border-[#424654]'
            }`}
            title="Preview real-time frequency visualizer with built-in 909/303 acid loop"
          >
            <Radio className="w-3.5 h-3.5" />
            {isDemoPlaying ? 'STOP TEST LOOP' : 'TEST VISUALIZER (909 BEAT)'}
          </button>

          <div className="text-right">
            <div className="text-[9px] uppercase tracking-[0.2em] text-[#6d717d] mb-1">
              Active Generator
            </div>
            <div className="flex gap-1">
              <button 
                className={`px-2.5 py-1 text-[10px] border font-mono uppercase tracking-wider cursor-pointer transition-colors ${
                  mode === 'clip' 
                    ? 'bg-red-600 text-white border-red-500 font-bold shadow-[0_0_10px_rgba(255,68,68,0.3)]' 
                    : 'border-[#282a32] text-[#8e9299] hover:text-white'
                }`} 
                onClick={() => setMode('clip')}
              >
                CLIP (30S)
              </button>
              <button 
                className={`px-2.5 py-1 text-[10px] border font-mono uppercase tracking-wider cursor-pointer transition-colors ${
                  mode === 'pro' 
                    ? 'bg-red-600 text-white border-red-500 font-bold shadow-[0_0_10px_rgba(255,68,68,0.3)]' 
                    : 'border-[#282a32] text-[#8e9299] hover:text-white'
                }`} 
                onClick={() => setMode('pro')}
              >
                PRO (FULL)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid: Control Rack & Output / Visualizer */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Generator Controls & Rotary Synthesizer Knobs */}
        <section className="lg:col-span-6 space-y-6">
          <div className="hardware-card p-5 relative overflow-hidden">
            {/* Progress bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#202127]">
              <motion.div 
                className="h-full bg-red-500 shadow-[0_0_8px_#ff4444]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#8e9299] flex items-center gap-1.5 font-mono">
                <Settings className="w-3.5 h-3.5 text-red-500" /> Synthesis Prompt
              </label>
              
              <button
                onClick={handleInjectKnobsIntoPrompt}
                className="text-[9px] font-mono text-[#8a8f9d] hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                title="Inject current BPM and hardware knob values into prompt"
              >
                <Sparkles className="w-3 h-3 text-red-500" /> Sync Knobs to Prompt
              </button>
            </div>

            <textarea 
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                // Detach preset ID if user freely modifies
                setActivePresetId(null);
              }}
              className="w-full h-32 bg-black/60 border border-[#262830] p-3 text-xs text-white focus:outline-none focus:border-red-500 transition-colors resize-none font-mono rounded"
              placeholder="Describe the industrial texture, tempo, kick saturation, metallic reverberation..."
            />

            {/* Quick Prompt Tags */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[
                '+ Distorted 909 Kick',
                '+ Resonant 303 Acid',
                '+ Cavernous Reverb',
                '+ Anvil Hits',
                '+ Sub-Bass Drone'
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setPrompt(prev => prev.trim().endsWith('.') ? `${prev.slice(0, -1)}, ${tag.replace('+ ', '')}.` : `${prev}, ${tag.replace('+ ', '')}`);
                    setActivePresetId(null);
                  }}
                  className="px-2 py-0.5 bg-[#17181d] hover:bg-[#23242c] border border-[#2a2c35] text-[9px] font-mono text-[#8e9299] hover:text-white rounded transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Action Bar */}
            <div className="mt-5 flex gap-3 items-center">
              <button 
                onClick={generateMusic}
                disabled={isGenerating}
                className={`flex-1 py-3.5 flex items-center justify-center gap-3 font-bold font-mono text-xs uppercase tracking-widest rounded transition-all cursor-pointer ${
                  isGenerating 
                    ? 'bg-[#1a1a1c] text-[#555] cursor-not-allowed border border-[#2b2d35]' 
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_25px_rgba(255,68,68,0.3)]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    Generating {mode === 'clip' ? '30s Clip' : 'Full Track'}...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    Synthesize Track ({mode === 'clip' ? '30s' : 'Full'})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Hardware Rotary Knobs & Automation Rack Section */}
          <div className="hardware-card p-4">
            <div className="flex flex-wrap justify-between items-center mb-3 border-b border-[#23242a] pb-2 gap-2">
              <div className="flex items-center gap-1.5 bg-[#0e0f13] border border-[#232530] rounded p-0.5 font-mono">
                <button
                  type="button"
                  onClick={() => setActiveDspTab('knobs')}
                  className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeDspTab === 'knobs'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'text-[#7d8291] hover:text-white'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>DSP Knobs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDspTab('automation')}
                  className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeDspTab === 'automation'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'text-[#7d8291] hover:text-white'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  <span>Automation</span>
                  {automationEnabled && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleNormalize}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1 transition-all cursor-pointer ${
                    isNormalized
                      ? 'bg-green-500/15 text-green-400 border-green-500/40 shadow-[0_0_8px_rgba(34,197,94,0.2)]'
                      : 'bg-[#18191f] text-[#6d717d] border-[#292a33]'
                  }`}
                  title="Ensure output volume is automatically normalized to -1.0 dBFS ceiling after generation"
                >
                  <Zap className={`w-3 h-3 ${isNormalized ? 'fill-green-400 text-green-400' : 'text-[#666]'}`} />
                  <span>NORM -1.0dB {isNormalized ? 'ON' : 'OFF'}</span>
                </button>
                <span className="text-[9px] text-[#606470] font-mono hidden md:inline">
                  {activeDspTab === 'knobs' ? 'Drag knobs up/down' : 'Draw modulation curves'}
                </span>
              </div>
            </div>

            {activeDspTab === 'knobs' ? (
              <div className="grid grid-cols-5 gap-2">
                {/* Tempo Column with Knob + Tap Tempo Button */}
                <div className="flex flex-col gap-1.5">
                  <InteractiveKnob 
                    label="TEMPO" 
                    value={bpm} 
                    min={110} 
                    max={175} 
                    unit="BPM" 
                    onChange={setBpm}
                    accentColor="#ff8844"
                  />
                  <TapTempoButton 
                    currentBpm={bpm} 
                    onBpmChange={setBpm} 
                    minBpm={110} 
                    maxBpm={175}
                    className="w-full"
                  />
                </div>

                <InteractiveKnob 
                  label="DISTORT" 
                  value={distortion} 
                  onChange={setDistortion}
                  accentColor="#ff3333"
                />
                <InteractiveKnob 
                  label="RESONANCE" 
                  value={resonance} 
                  onChange={setResonance}
                  accentColor="#22c55e"
                />
                <InteractiveKnob 
                  label="FEEDBACK" 
                  value={feedback} 
                  onChange={setFeedback}
                  accentColor="#f59e0b"
                />
                <InteractiveKnob 
                  label="REVERB" 
                  value={reverb} 
                  onChange={setReverb}
                  accentColor="#06b6d4"
                />
              </div>
            ) : (
              <AutomationRack
                curves={automationCurves}
                onUpdateCurves={setAutomationCurves}
                isEnabled={automationEnabled}
                onToggleEnabled={() => setAutomationEnabled(!automationEnabled)}
                playbackProgress={playbackProgress}
                isPlaying={isPlayingAudio}
                currentDistortion={distortion}
                currentFeedback={feedback}
                currentReverb={reverb}
              />
            )}
          </div>
        </section>

        {/* Right Column: Real-Time Frequency Visualizer & Output Monitor */}
        <section className="lg:col-span-6 space-y-6">
          
          {/* Real-Time Frequency Visualizer Component */}
          <AudioVisualizer 
            analyserNode={analyserNodeRef.current}
            isPlaying={isAnyAudioActive}
          />

          {/* Master Output & Playback Rack with Cover Art Preview */}
          <div className="hardware-card p-5 flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-[#24262b] pb-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#8e9299] flex items-center gap-2 font-mono">
                <Activity className="w-3.5 h-3.5 text-red-500" /> Master Audio Stream & Output Stage
              </label>
              <div className="text-[10px] text-red-500 font-mono font-bold">
                {audioUrl ? 'STEREO WAV • 48.0 KHZ' : 'NO CARRIER'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
              {/* Left/Main Column: Master Audio Stream, Scrubber & Equalizer (3 cols on lg) */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="flex-1 flex flex-col items-center justify-center border border-[#24262c] bg-black/40 rounded p-4 text-center relative overflow-hidden min-h-[160px]">
                  <AnimatePresence mode="wait">
                    {isGenerating ? (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4 py-4"
                      >
                        <div className="flex justify-center gap-1.5 h-12 items-end">
                          {[...Array(12)].map((_, i) => (
                            <motion.div 
                              key={i}
                              className="w-1.5 bg-red-500 rounded-xs"
                              animate={{ height: [8, 48, 16, 40, 12] }}
                              transition={{ repeat: Infinity, duration: 0.4 + i * 0.08, ease: "easeInOut" }}
                            />
                          ))}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-mono uppercase tracking-widest text-red-500 animate-pulse font-bold">
                            Synthesizing Audio Stream...
                          </p>
                          <p className="text-[10px] text-[#6d717d] font-mono">
                            Neural model rendering audio chunks ({progress}%)
                          </p>
                        </div>
                      </motion.div>
                    ) : audioUrl ? (
                      <motion.div 
                        key="ready"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full space-y-4"
                      >
                        {/* Underlying Native Audio Element (wired to Web Audio Analyser Graph) */}
                        <audio 
                          ref={audioRef}
                          src={audioUrl} 
                          crossOrigin="anonymous"
                          onPlay={handleAudioPlay}
                          onPause={handleAudioPause}
                          onEnded={handleAudioEnded}
                          className="hidden"
                        />

                        {/* Custom Audio Scrubber with Scrubbing & Transport Controls */}
                        <AudioScrubber
                          audioRef={audioRef}
                          isPlaying={isPlayingAudio}
                          onTogglePlay={handleTogglePlayPause}
                          audioUrl={audioUrl}
                          trackLabel={`Techno Master • ${bpm} BPM (${mode === 'clip' ? '30s Clip' : 'Full Track'})`}
                        />

                        {/* Master Equalizer Rack with Frequency Shelves & Soft Limiter */}
                        <MasterEqualizer
                          lowGain={lowEq}
                          midGain={midEq}
                          highGain={highEq}
                          onLowGainChange={setLowEq}
                          onMidGainChange={setMidEq}
                          onHighGainChange={setHighEq}
                          onResetEq={handleResetEq}
                          isNormalized={isNormalized}
                          onToggleNormalize={handleToggleNormalize}
                          normalizationStats={normalizationStats}
                          softLimiterEnabled={softLimiterEnabled}
                          onToggleSoftLimiter={handleToggleSoftLimiter}
                        />

                        {/* Channel Routing Status & Master Download Link */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-[#1e2027] text-[9px] font-mono text-[#6d717d]">
                          <div className="flex items-center gap-3 uppercase tracking-wider">
                            <span>L/R: ROUTED</span>
                            <span className="text-amber-400/80">X-FADE: ACTIVE</span>
                            <span className={isPlayingAudio ? 'text-green-400 font-bold' : ''}>
                              {isPlayingAudio ? 'ANALYZER ENGAGED' : 'STANDBY'}
                            </span>
                            {softLimiterEnabled && (
                              <span className="text-red-400 font-semibold hidden md:inline">
                                LIMITER: -1.0dB
                              </span>
                            )}
                            {normalizationStats && (
                              <span className="text-green-400 font-semibold hidden md:inline">
                                PEAK: -1.0 dBFS
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsMetadataPanelOpen(true)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#17181f] hover:bg-[#22242f] border border-[#2b2d39] hover:border-amber-500/50 text-[10px] uppercase tracking-wider text-amber-400 rounded transition-all cursor-pointer shadow-xs"
                              title="Edit track Title, Artist, Genre, BPM, Key, and ID3 tags before saving"
                            >
                              <Tag className="w-3.5 h-3.5 text-amber-400" />
                              <span>Edit Metadata & Tags</span>
                            </button>

                            <button 
                              type="button"
                              disabled={isExporting}
                              onClick={() => handleExportColoredMaster()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b1c22] hover:bg-[#252730] border border-[#2d303a] hover:border-red-500/50 text-[10px] uppercase tracking-widest text-white hover:text-red-400 rounded transition-all cursor-pointer shadow-xs disabled:opacity-50"
                              title="Export lossless WAV with embedded ID3 tags, active EQ coloring, and -1.0dB normalization"
                            >
                              {isExporting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
                                  <span>Rendering Master...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5 text-red-500" />
                                  <span>Export WAV Master</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : error ? (
                      <motion.div 
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-3 py-2 font-mono"
                      >
                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                        <p className="text-xs text-red-400 max-w-sm leading-relaxed">{error}</p>
                        <button 
                          onClick={() => setError(null)} 
                          className="text-[10px] uppercase text-[#8e9299] hover:text-white underline cursor-pointer"
                        >
                          Dismiss Error
                        </button>
                      </motion.div>
                    ) : (
                      <div className="space-y-3 opacity-40 font-mono py-4">
                        <Volume2 className="w-10 h-10 mx-auto text-[#717684]" />
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-white">No Audio Generated Yet</p>
                          <p className="text-[9px] text-[#8e9299] mt-0.5">
                            Initiate synthesis or click "TEST VISUALIZER (909 BEAT)" above
                          </p>
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Column: Track Cover Art Preview (1 col on lg) */}
              <div className="lg:col-span-1 h-full flex flex-col">
                <TrackCoverArt
                  coverArtUrl={coverArtUrl}
                  isGenerating={isGeneratingCoverArt}
                  onGenerateCoverArt={handleGenerateCoverArt}
                  prompt={prompt}
                  bpm={bpm}
                  className="h-full"
                />
              </div>
            </div>

            {lyrics && (
              <div className="mt-4 p-3 bg-black/40 border border-[#22242a] rounded overflow-y-auto max-h-28 font-mono">
                <h4 className="text-[9px] uppercase tracking-widest text-[#8e9299] mb-1 border-b border-[#23242a] pb-1">
                  Model Generation Log / Notes
                </h4>
                <p className="text-[11px] text-[#8e9299] leading-relaxed italic whitespace-pre-wrap">
                  {lyrics}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Full-Width Section: Instrument & Genre Studio */}
        <section className="lg:col-span-12">
          <InstrumentGenrePicker
            currentPrompt={prompt}
            onApplyPrompt={handleApplyInstrumentalPrompt}
            currentBpm={bpm}
            onBpmChange={setBpm}
            distortion={distortion}
            resonance={resonance}
            onGenerateMusic={generateMusic}
            isGenerating={isGenerating}
          />
        </section>

        {/* Full-Width Section: Techno Presets Rack */}
        <section className="lg:col-span-12">
          <TechnoPresetsRack 
            presets={presets}
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
            onSaveCurrentAsPreset={handleSaveCurrentAsPreset}
            onDeletePreset={handleDeletePreset}
            onResetDefaults={handleResetDefaults}
            onImportPresets={handleImportPresets}
            currentPrompt={prompt}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mt-12 pt-6 border-t border-[#1e2026] flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-[#555a66] uppercase tracking-[0.25em] font-mono">
        <div>INDUSTRIAL TECHNO SYNTHESIZER V2.1.0 • WEB AUDIO DSP</div>
        <div className="flex flex-wrap gap-5">
          <span>SAMPLE RATE: 48000 HZ</span>
          <span>FFT SIZE: 512</span>
          <span>CHANNELS: 2 (STEREO)</span>
        </div>
      </footer>
      {/* Track Metadata & ID3 Tagging Modal */}
      <TrackMetadataPanel
        isOpen={isMetadataPanelOpen}
        onClose={() => setIsMetadataPanelOpen(false)}
        metadata={trackMetadata}
        onUpdateMetadata={setTrackMetadata}
        onConfirmExport={() => handleExportColoredMaster(trackMetadata)}
        isExporting={isExporting}
        currentBpm={bpm}
      />
    </div>
  );
}

