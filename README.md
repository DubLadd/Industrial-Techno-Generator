Markdown
# ⚡ Industrial Techno Generator

An in-browser Web Audio API synthesis and pattern engine designed for generating raw, distorted industrial techno, EBM sequences, and heavy 145 BPM driving sub-bass.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Web Audio API](https://img.shields.io/badge/audio-Web%20Audio%20API-orange.svg)
![Status](https://img.shields.io/badge/status-active-brightgreen.svg)

---

## 🔊 Key Features

- **DSP Synthesis Engines:** Custom web-synth architecture utilizing wave-shapers, bitcrushers, granular pitch shifts, and saturated sub-bass loops.
- **Dynamic Step Sequencer:** Polymetric step modulation with pattern chaining, probability triggers, and beat mutation algorithms.
- **Industrial Distortion Chain:** Overdriven filter feedback, soft-clipping saturation, and resonant peak sweeps.
- **Zero External Audio Dependencies:** 100% browser-native synthesis and real-time audio node routing.

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone [https://github.com/DubLadd/Industrial-Techno-Generator.git](https://github.com/DubLadd/Industrial-Techno-Generator.git)
cd Industrial-Techno-Generator
2. Run Locally
If the project uses a standard static bundle (e.g., Vite/HTML):

Bash
# If using npm scripts
npm install
npm run dev
Or serve static files directly using any local HTTP server:

Bash
npx serve .
🎛 Architecture & Audio Graph
[ Step Sequencer Clock ]
           │
           ├──► [ Kick Synth Node ] ──► [ WaveShaper / Saturation ] ──┐
           ├──► [ Noise / Perc Synth ] ──► [ HighPass / Bitcrusher ] ┼──► [ Master Compression ] ──► Destination
           └──► [ Bass / Synth Line ] ─► [ LowPass Filter + LFO ] ───┘
Clock Precision: Uses high-resolution audioContext.currentTime scheduling to prevent timing drift during dense 16th/32nd note rolls.

Audio Routing: Modular node design allows dynamic insertion of FX buffers, delay feedback, and distortion stages.

🛠 Tech Stack
Audio Engine: Web Audio API (AudioContext, GainNode, WaveShaperNode, BiquadFilterNode)

UI / Frontend: Modern JavaScript / TypeScript, Tailwind CSS / Canvas API

Deployment: GitHub Pages / Vercel ready

📄 License
This project is open-source and available under the MIT License.
