/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { 
  Music, 
  Play, 
  Square, 
  Download, 
  Settings, 
  Activity, 
  Zap, 
  Volume2, 
  AlertCircle,
  Loader2,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [prompt, setPrompt] = useState('Dark, gritty industrial techno with heavy distorted kicks, metallic percussion, and atmospheric drones. 135 BPM.');
  const [mode, setMode] = useState<GenerationMode>('clip');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } else {
      // Fallback for local dev or if not in AIS environment
      setHasApiKey(true);
    }
  };

  const handleOpenKeySelection = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Assume success as per guidelines
    }
  };

  const generateMusic = async () => {
    if (!prompt.trim()) return;
    
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

      // Simulate progress for UI feedback
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
        const blob = new Blob([bytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
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

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="hardware-card p-8 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-red-500/10 border border-red-500/30">
              <Key className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase">Authentication Required</h1>
          <p className="text-[#8e9299] text-sm leading-relaxed">
            To use Lyria music generation models, you must select a paid Gemini API key. 
            Please visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-red-400 underline">billing documentation</a> for more info.
          </p>
          <button 
            onClick={handleOpenKeySelection}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-10 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-5xl mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="status-led active pulse" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8e9299]">System Online</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
            Industrial <br />
            <span className="text-red-500">Techno</span> Gen
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#8e9299] mb-1">Model Status</div>
          <div className="flex gap-1">
            <div className={`px-2 py-1 text-[10px] border ${mode === 'clip' ? 'bg-red-500 text-black border-red-500' : 'border-[#2a2a2a] text-[#8e9299]'} cursor-pointer`} onClick={() => setMode('clip')}>CLIP-30S</div>
            <div className={`px-2 py-1 text-[10px] border ${mode === 'pro' ? 'bg-red-500 text-black border-red-500' : 'border-[#2a2a2a] text-[#8e9299]'} cursor-pointer`} onClick={() => setMode('pro')}>PRO-FULL</div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Control Panel */}
        <section className="lg:col-span-7 space-y-6">
          <div className="hardware-card p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#2a2a2a]">
              <motion.div 
                className="h-full bg-red-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#8e9299] flex items-center gap-2">
                <Settings className="w-3 h-3" /> Input Parameters
              </label>
              <div className="flex gap-2">
                <div className="status-led active" />
                <div className="status-led" />
                <div className="status-led" />
              </div>
            </div>

            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-40 bg-black/50 border border-[#2a2a2a] p-4 text-sm focus:outline-none focus:border-red-500 transition-colors resize-none"
              placeholder="Enter sonic description..."
            />

            <div className="mt-6 flex flex-wrap gap-4 items-center">
              <button 
                onClick={generateMusic}
                disabled={isGenerating}
                className={`flex-1 py-4 flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all ${isGenerating ? 'bg-[#1a1a1a] text-[#444] cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(255,68,68,0.2)]'}`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Initiate Sequence
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Visualizers / Knobs (Decorative) */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Distortion', val: 85 },
              { label: 'Resonance', val: 42 },
              { label: 'Feedback', val: 67 }
            ].map((knob, i) => (
              <div key={i} className="hardware-card p-4 flex flex-col items-center justify-center gap-3">
                <div className="knob-container">
                  <div className="knob-indicator" style={{ transform: `rotate(${(knob.val / 100) * 270 - 135}deg)` }} />
                </div>
                <span className="text-[9px] uppercase tracking-widest text-[#8e9299]">{knob.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Output Panel */}
        <section className="lg:col-span-5 space-y-6">
          <div className="hardware-card p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#8e9299] flex items-center gap-2">
                <Activity className="w-3 h-3" /> Output Monitor
              </label>
              <div className="text-[10px] text-red-500 font-bold">24-BIT / 48KHZ</div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center border border-[#2a2a2a] bg-black/30 rounded p-8 text-center relative overflow-hidden">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-center gap-1 h-12 items-end">
                      {[...Array(8)].map((_, i) => (
                        <motion.div 
                          key={i}
                          className="w-1 bg-red-500"
                          animate={{ height: [10, 40, 20, 48, 15] }}
                          transition={{ repeat: Infinity, duration: 0.5 + i * 0.1, ease: "easeInOut" }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-red-500 animate-pulse">Synthesizing audio waves...</p>
                  </motion.div>
                ) : audioUrl ? (
                  <motion.div 
                    key="ready"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full space-y-6"
                  >
                    <div className="p-6 rounded-full bg-red-500/10 border border-red-500/20 mx-auto w-24 h-24 flex items-center justify-center">
                      <Music className="w-10 h-10 text-red-500" />
                    </div>
                    
                    <div className="space-y-2">
                      <audio 
                        ref={audioRef}
                        src={audioUrl} 
                        controls 
                        className="w-full h-8 accent-red-500"
                      />
                      <div className="flex justify-between text-[9px] text-[#8e9299] uppercase tracking-tighter">
                        <span>L-CHANNEL</span>
                        <span>R-CHANNEL</span>
                      </div>
                    </div>

                    <a 
                      href={audioUrl} 
                      download={`industrial-techno-${Date.now()}.wav`}
                      className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-white hover:text-red-500 transition-colors"
                    >
                      <Download className="w-3 h-3" /> Export Master
                    </a>
                  </motion.div>
                ) : error ? (
                  <motion.div 
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                    <p className="text-xs text-red-400 max-w-[200px]">{error}</p>
                    <button onClick={() => setError(null)} className="text-[10px] uppercase underline">Dismiss</button>
                  </motion.div>
                ) : (
                  <div className="space-y-4 opacity-30">
                    <Volume2 className="w-12 h-12 mx-auto" />
                    <p className="text-[10px] uppercase tracking-widest">Awaiting Signal</p>
                  </div>
                )}
              </AnimatePresence>

              {/* Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-5" 
                style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
              />
            </div>

            {lyrics && (
              <div className="mt-6 p-4 bg-black/20 border border-[#2a2a2a] rounded overflow-y-auto max-h-40">
                <h4 className="text-[9px] uppercase tracking-widest text-[#8e9299] mb-2 border-b border-[#2a2a2a] pb-1">Metadata / Lyrics</h4>
                <p className="text-xs text-[#8e9299] leading-relaxed italic whitespace-pre-wrap">
                  {lyrics}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mt-12 pt-6 border-t border-[#2a2a2a] flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] text-[#444] uppercase tracking-[0.3em]">
        <div>© 2026 INDUSTRIAL TECHNO GENERATOR V1.0.4</div>
        <div className="flex gap-6">
          <span>Latency: 42ms</span>
          <span>Buffer: 1024</span>
          <span>Sample: 48000</span>
        </div>
      </footer>
    </div>
  );
}
