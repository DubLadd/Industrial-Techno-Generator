/**
 * Audio Mastering Utilities:
 * - Peak normalization to target dBFS (e.g. -1.0 dB)
 * - OfflineAudioContext 3-band shelf EQ rendering for downloads
 * - Hard-Knee Soft Limiter to prevent clipping before final export
 * - 16-bit PCM WAV encoder with embedded RIFF INFO & ID3v2 metadata chunks
 */

export interface NormalizationResult {
  normalizedBuffer: AudioBuffer;
  originalPeakDb: number;
  gainAppliedDb: number;
  targetPeakDb: number;
}

export interface TrackMetadata {
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  key: string;
  comment?: string;
  year?: string;
}

/**
 * Normalizes an AudioBuffer to a target peak level (default -1.0 dBFS)
 */
export function normalizeAudioBuffer(
  audioBuffer: AudioBuffer,
  ctx: AudioContext | OfflineAudioContext,
  targetPeakDb: number = -1.0
): NormalizationResult {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;

  let maxPeak = 0;
  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxPeak) {
        maxPeak = abs;
      }
    }
  }

  const originalPeakDb = maxPeak > 0.00001 ? 20 * Math.log10(maxPeak) : -96;
  const targetPeak = Math.pow(10, targetPeakDb / 20); // -1.0dB -> ~0.89125
  const multiplier = maxPeak > 0.0001 ? targetPeak / maxPeak : 1.0;
  const gainAppliedDb = 20 * Math.log10(multiplier);

  const normalizedBuffer = ctx.createBuffer(numChannels, length, sampleRate);
  for (let ch = 0; ch < numChannels; ch++) {
    const srcData = audioBuffer.getChannelData(ch);
    const destData = normalizedBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const val = srcData[i] * multiplier;
      destData[i] = Math.max(-0.999, Math.min(0.999, val));
    }
  }

  return {
    normalizedBuffer,
    originalPeakDb: Math.round(originalPeakDb * 10) / 10,
    gainAppliedDb: Math.round(gainAppliedDb * 10) / 10,
    targetPeakDb
  };
}

/**
 * Applies a hard-knee soft-saturation limiter logic to prevent digital clipping.
 */
export function applyHardKneeLimiterLogic(
  buffer: AudioBuffer,
  thresholdDb: number = -1.0,
  ceilingDb: number = -0.1
): void {
  const threshold = Math.pow(10, thresholdDb / 20);
  const ceiling = Math.pow(10, ceilingDb / 20);
  const range = ceiling - threshold;
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;

  for (let ch = 0; ch < numChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const x = data[i];
      const absX = Math.abs(x);

      if (absX <= threshold) continue;

      const excess = absX - threshold;
      const compressedExcess = range * Math.tanh(excess / (range || 0.001));
      const limitedAbs = threshold + compressedExcess;
      data[i] = (x < 0 ? -1 : 1) * Math.min(ceiling, limitedAbs);
    }
  }
}

/**
 * Renders an AudioBuffer through Low, Mid, and High shelf equalizers and an optional
 * hard-knee soft limiter using OfflineAudioContext.
 */
export async function renderMasterWithEq(
  sourceBuffer: AudioBuffer,
  lowDb: number,
  midDb: number,
  highDb: number,
  softLimiterEnabled: boolean = true
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    sourceBuffer.numberOfChannels,
    sourceBuffer.length,
    sourceBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = sourceBuffer;

  const lowFilter = offlineCtx.createBiquadFilter();
  lowFilter.type = 'lowshelf';
  lowFilter.frequency.value = 100;
  lowFilter.gain.value = lowDb;

  const midFilter = offlineCtx.createBiquadFilter();
  midFilter.type = 'peaking';
  midFilter.frequency.value = 1500;
  midFilter.Q.value = 1.0;
  midFilter.gain.value = midDb;

  const highFilter = offlineCtx.createBiquadFilter();
  highFilter.type = 'highshelf';
  highFilter.frequency.value = 8500;
  highFilter.gain.value = highDb;

  source.connect(lowFilter);
  lowFilter.connect(midFilter);
  midFilter.connect(highFilter);

  if (softLimiterEnabled) {
    const limiter = offlineCtx.createDynamicsCompressor();
    limiter.threshold.value = -1.0;
    limiter.knee.value = 0.0;     // 0 dB Knee = Exact Hard-Knee
    limiter.ratio.value = 20.0;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;

    highFilter.connect(limiter);
    limiter.connect(offlineCtx.destination);
  } else {
    highFilter.connect(offlineCtx.destination);
  }

  source.start(0);
  const renderedBuffer = await offlineCtx.startRendering();

  if (softLimiterEnabled) {
    applyHardKneeLimiterLogic(renderedBuffer, -1.0, -0.1);
  }

  return renderedBuffer;
}

/**
 * Builds a RIFF INFO LIST chunk binary block for standard media players
 */
function buildRiffInfoChunk(metadata: TrackMetadata): Uint8Array {
  const subChunks: { id: string; text: string }[] = [
    { id: 'INAM', text: metadata.title || 'Untitled Master' },
    { id: 'IART', text: metadata.artist || 'AI Studio' },
    { id: 'IGNR', text: metadata.genre || 'Industrial Techno' },
    { id: 'ICMT', text: `Key: ${metadata.key || 'Fm'} | BPM: ${metadata.bpm || 138} | ${metadata.comment || 'Mastered at -1.0 dBFS'}` },
    { id: 'ICRD', text: metadata.year || new Date().getFullYear().toString() },
    { id: 'ISFT', text: 'Industrial Techno Studio DSP' }
  ];

  let listContentSize = 4; // for 'INFO' 4-byte ID
  for (const sc of subChunks) {
    const textBytes = sc.text.length + 1; // null-terminated
    const pad = textBytes % 2 === 1 ? 1 : 0;
    listContentSize += 8 + textBytes + pad;
  }

  const listChunkSize = 8 + listContentSize;
  const buffer = new ArrayBuffer(listChunkSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Write 'LIST'
  bytes[0] = 0x4c; bytes[1] = 0x49; bytes[2] = 0x53; bytes[3] = 0x54;
  view.setUint32(4, listContentSize, true);
  // Write 'INFO'
  bytes[8] = 0x49; bytes[9] = 0x4e; bytes[10] = 0x46; bytes[11] = 0x4f;

  let offset = 12;
  for (const sc of subChunks) {
    // 4-char ID
    for (let i = 0; i < 4; i++) {
      bytes[offset + i] = sc.id.charCodeAt(i);
    }
    const textLen = sc.text.length + 1;
    view.setUint32(offset + 4, textLen, true);
    offset += 8;

    // String + null terminator
    for (let i = 0; i < sc.text.length; i++) {
      bytes[offset + i] = sc.text.charCodeAt(i);
    }
    bytes[offset + sc.text.length] = 0;
    offset += textLen;

    // Word padding
    if (textLen % 2 === 1) {
      bytes[offset] = 0;
      offset += 1;
    }
  }

  return bytes;
}

/**
 * Builds an ID3v2.3 tag chunk ('id3 ') for standard DAWs and DJ Software
 * Supporting TIT2 (Title), TPE1 (Artist), TCON (Genre), TBPM (BPM), TKEY (Key), COMM (Comment)
 */
function buildId3Chunk(metadata: TrackMetadata): Uint8Array {
  const frames: { id: string; content: string }[] = [
    { id: 'TIT2', content: metadata.title || 'Untitled Master' },
    { id: 'TPE1', content: metadata.artist || 'AI Studio' },
    { id: 'TCON', content: metadata.genre || 'Industrial Techno' },
    { id: 'TBPM', content: (metadata.bpm || 138).toString() },
    { id: 'TKEY', content: metadata.key || 'Fm' },
    { id: 'COMM', content: metadata.comment || 'Mastered at -1.0 dBFS' },
    { id: 'TENC', content: 'Industrial Techno Studio' }
  ];

  // Encode frames
  const frameBuffers: Uint8Array[] = [];
  let totalFramesSize = 0;

  for (const f of frames) {
    const isComm = f.id === 'COMM';
    let framePayload: Uint8Array;

    if (isComm) {
      // COMM frame format: encoding(1 byte) + lang(3 bytes 'eng') + short desc null(1) + comment string
      const commentBytes = f.content.length;
      framePayload = new Uint8Array(5 + commentBytes);
      framePayload[0] = 0; // ISO-8859-1
      framePayload[1] = 0x65; framePayload[2] = 0x6e; framePayload[3] = 0x67; // 'eng'
      framePayload[4] = 0; // empty short description
      for (let i = 0; i < commentBytes; i++) {
        framePayload[5 + i] = f.content.charCodeAt(i);
      }
    } else {
      // Text frame format: encoding(1 byte 0x00) + text string
      framePayload = new Uint8Array(1 + f.content.length);
      framePayload[0] = 0; // ISO-8859-1
      for (let i = 0; i < f.content.length; i++) {
        framePayload[1 + i] = f.content.charCodeAt(i);
      }
    }

    const frameHeader = new Uint8Array(10);
    // 4-char ID
    for (let i = 0; i < 4; i++) frameHeader[i] = f.id.charCodeAt(i);
    // 4-byte size (big endian)
    const sz = framePayload.length;
    frameHeader[4] = (sz >> 24) & 0xff;
    frameHeader[5] = (sz >> 16) & 0xff;
    frameHeader[6] = (sz >> 8) & 0xff;
    frameHeader[7] = sz & 0xff;
    // 2-byte flags (0x0000)
    frameHeader[8] = 0;
    frameHeader[9] = 0;

    const fullFrame = new Uint8Array(10 + framePayload.length);
    fullFrame.set(frameHeader, 0);
    fullFrame.set(framePayload, 10);

    frameBuffers.push(fullFrame);
    totalFramesSize += fullFrame.length;
  }

  // ID3v2 10-byte header
  const id3v2Header = new Uint8Array(10);
  id3v2Header[0] = 0x49; id3v2Header[1] = 0x44; id3v2Header[2] = 0x33; // 'ID3'
  id3v2Header[3] = 0x03; // version 2.3
  id3v2Header[4] = 0x00; // revision 0
  id3v2Header[5] = 0x00; // flags

  // Synchsafe integer size (7 bits per byte)
  id3v2Header[6] = (totalFramesSize >> 21) & 0x7f;
  id3v2Header[7] = (totalFramesSize >> 14) & 0x7f;
  id3v2Header[8] = (totalFramesSize >> 7) & 0x7f;
  id3v2Header[9] = totalFramesSize & 0x7f;

  const id3PayloadSize = 10 + totalFramesSize;
  const pad = id3PayloadSize % 2 === 1 ? 1 : 0;
  const chunkHeaderAndSize = 8 + id3PayloadSize + pad;

  const outBuffer = new ArrayBuffer(chunkHeaderAndSize);
  const view = new DataView(outBuffer);
  const outBytes = new Uint8Array(outBuffer);

  // 'id3 ' (RIFF chunk ID with trailing space)
  outBytes[0] = 0x69; outBytes[1] = 0x64; outBytes[2] = 0x33; outBytes[3] = 0x20;
  view.setUint32(4, id3PayloadSize, true);

  outBytes.set(id3v2Header, 8);
  let curOffset = 18;
  for (const fb of frameBuffers) {
    outBytes.set(fb, curOffset);
    curOffset += fb.length;
  }
  if (pad === 1) {
    outBytes[curOffset] = 0;
  }

  return outBytes;
}

/**
 * Encodes an AudioBuffer to a 16-bit PCM WAV Blob with embedded RIFF INFO and ID3 metadata
 */
export function audioBufferToWav(buffer: AudioBuffer, metadata?: TrackMetadata): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numOfChan * bytesPerSample;

  const dataLength = buffer.length * blockAlign;

  // Build metadata chunks if provided
  let infoChunk: Uint8Array | null = null;
  let id3Chunk: Uint8Array | null = null;
  let metadataTotalBytes = 0;

  if (metadata) {
    infoChunk = buildRiffInfoChunk(metadata);
    id3Chunk = buildId3Chunk(metadata);
    metadataTotalBytes = infoChunk.length + id3Chunk.length;
  }

  const baseWavHeaderLength = 44;
  const totalFileLength = baseWavHeaderLength + dataLength + metadataTotalBytes;
  const arrayBuffer = new ArrayBuffer(totalFileLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength + metadataTotalBytes, true);
  writeString(8, 'WAVE');

  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Interleave audio samples
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numOfChan; ch++) {
      let sample = Math.max(-1, Math.min(1, channels[ch][i]));
      sample = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  // Append RIFF INFO chunk and ID3 chunk at the end of the WAV file
  if (infoChunk && id3Chunk) {
    const outBytes = new Uint8Array(arrayBuffer);
    outBytes.set(infoChunk, offset);
    offset += infoChunk.length;
    outBytes.set(id3Chunk, offset);
  }

  return new Blob([view], { type: 'audio/wav' });
}
