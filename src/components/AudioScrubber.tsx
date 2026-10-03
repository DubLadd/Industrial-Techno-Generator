import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Repeat, 
  Volume2, 
  VolumeX, 
  SkipBack,
  Sliders
} from 'lucide-react';

interface AudioScrubberProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  audioUrl: string | null;
  trackLabel?: string;
}

export function AudioScrubber({
  audioRef,
  isPlaying,
  onTogglePlay,
  audioUrl,
  trackLabel = 'Techno Master'
}: AudioScrubberProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0); // 0 to 1
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showRemainingTime, setShowRemainingTime] = useState(false);

  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Sync with audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isScrubbing) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      if (!isLooping) {
        setCurrentTime(0);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    // Initial check
    if (audio.duration && !isNaN(audio.duration)) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioRef, isScrubbing, isLooping, audioUrl]);

  // Scrubbing drag handlers (mouse & touch)
  const calculateProgressFromEvent = (clientX: number): number => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    return progress;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const progress = calculateProgressFromEvent(e.clientX);
    setIsScrubbing(true);
    setScrubPosition(progress);

    const targetTime = progress * (duration || 1);
    setCurrentTime(targetTime);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    const progress = calculateProgressFromEvent(e.touches[0].clientX);
    setIsScrubbing(true);
    setScrubPosition(progress);

    const targetTime = progress * (duration || 1);
    setCurrentTime(targetTime);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubbing) return;
      const progress = calculateProgressFromEvent(e.clientX);
      setScrubPosition(progress);
      setCurrentTime(progress * (duration || 1));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isScrubbing || e.touches.length === 0) return;
      const progress = calculateProgressFromEvent(e.touches[0].clientX);
      setScrubPosition(progress);
      setCurrentTime(progress * (duration || 1));
    };

    const handleMouseUp = () => {
      if (!isScrubbing) return;
      setIsScrubbing(false);
      if (audioRef.current && duration > 0) {
        audioRef.current.currentTime = scrubPosition * duration;
      }
    };

    const handleTouchEnd = () => {
      if (!isScrubbing) return;
      setIsScrubbing(false);
      if (audioRef.current && duration > 0) {
        audioRef.current.currentTime = scrubPosition * duration;
      }
    };

    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isScrubbing, scrubPosition, duration, audioRef]);

  // Hover timestamp calculation
  const handleMouseMoveHover = (e: React.MouseEvent) => {
    const progress = calculateProgressFromEvent(e.clientX);
    setHoverPosition(progress);
  };

  const handleMouseLeaveHover = () => {
    setHoverPosition(null);
  };

  // Jump controls
  const handleJump = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
  };

  const toggleLoop = () => {
    if (!audioRef.current) return;
    const next = !isLooping;
    setIsLooping(next);
    audioRef.current.loop = next;
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      audioRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  };

  // Formatter: mm:ss.s
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00.0';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    const tenths = Math.floor((timeInSeconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  const currentDisplayTime = isScrubbing ? scrubPosition * duration : currentTime;
  const progressRatio = duration > 0 ? currentDisplayTime / duration : 0;
  const progressPercent = Math.max(0, Math.min(100, progressRatio * 100));

  return (
    <div className="w-full bg-[#121317] border border-[#262832] rounded p-4 font-mono shadow-inner space-y-3 select-none">
      
      {/* Top Scrubber Header: Title, Playhead Times, and Loop status */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-bold text-white text-[11px] uppercase tracking-wide truncate max-w-[180px]">
            {trackLabel}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e2028] text-[#8e9299] border border-[#2b2d36]">
            MASTER SCRUB
          </span>
        </div>

        {/* Digital Time Code Readout */}
        <div 
          onClick={() => setShowRemainingTime(!showRemainingTime)}
          className="flex items-center gap-1 bg-[#0a0a0c] px-2.5 py-1 rounded border border-[#262830] cursor-pointer hover:border-red-500/50 transition-colors"
          title="Click to toggle remaining time / total duration"
        >
          <span className="text-red-400 font-bold tracking-widest text-[12px]">
            {formatTime(currentDisplayTime)}
          </span>
          <span className="text-[#555a66] text-[10px]">/</span>
          <span className="text-[#8e9299] text-[10px]">
            {showRemainingTime 
              ? `-${formatTime(Math.max(0, duration - currentDisplayTime))}` 
              : formatTime(duration)
            }
          </span>
        </div>
      </div>

      {/* Main Interactive Seek Bar with Scrubbing */}
      <div className="relative pt-2 pb-1">
        <div
          ref={progressBarRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onMouseMove={handleMouseMoveHover}
          onMouseLeave={handleMouseLeaveHover}
          className="relative h-6 w-full bg-[#0a0a0c] rounded border border-[#252730] cursor-pointer flex items-center group overflow-hidden touch-none"
        >
          {/* Background Grid Ticks (Authentic tape ruler / waveform notches) */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, #3d414f, #3d414f 1px, transparent 1px, transparent 12px)'
            }}
          />

          {/* Active Progress Fill Bar */}
          <div
            className="h-full bg-gradient-to-r from-red-800 to-red-600 transition-all duration-75 relative flex items-center justify-end"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Subtle glow highlight on leading edge */}
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_#ffffff]" />
          </div>

          {/* Playhead Scrubbing Thumb Indicator */}
          <div
            className={`absolute top-0 bottom-0 w-3 -ml-1.5 bg-white border border-red-500 rounded-xs flex items-center justify-center shadow-[0_0_12px_rgba(255,255,255,0.8)] pointer-events-none transition-transform duration-75 ${
              isScrubbing ? 'scale-125 bg-red-400' : 'group-hover:scale-110'
            }`}
            style={{ left: `${progressPercent}%` }}
          >
            <div className="w-0.5 h-3 bg-red-700" />
          </div>

          {/* Hover Time Tooltip */}
          {hoverPosition !== null && !isScrubbing && (
            <div
              className="absolute -top-7 -translate-x-1/2 bg-[#1a1b22] text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#3b3e4d] pointer-events-none shadow-md"
              style={{ left: `${hoverPosition * 100}%` }}
            >
              {formatTime(hoverPosition * (duration || 0))}
            </div>
          )}

          {/* Live Scrubbing Tooltip */}
          {isScrubbing && (
            <div
              className="absolute -top-7 -translate-x-1/2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(255,68,68,0.5)] pointer-events-none"
              style={{ left: `${scrubPosition * 100}%` }}
            >
              {formatTime(scrubPosition * (duration || 0))} (SCRUB)
            </div>
          )}
        </div>
      </div>

      {/* Transport Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1e2028]">
        {/* Playback & Skip Controls */}
        <div className="flex items-center gap-2">
          {/* Main Play/Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-4 py-2 rounded font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(255,68,68,0.3)]'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-black" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>PLAY</span>
              </>
            )}
          </button>

          {/* Restart */}
          <button
            type="button"
            onClick={handleRestart}
            title="Restart track from 0:00"
            className="p-2 bg-[#18191f] hover:bg-[#23242c] border border-[#282a33] text-[#8e9299] hover:text-white rounded transition-colors cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Rewind 5s */}
          <button
            type="button"
            onClick={() => handleJump(-5)}
            title="Skip back 5 seconds"
            className="px-2.5 py-1.5 bg-[#18191f] hover:bg-[#23242c] border border-[#282a33] text-[10px] text-[#8e9299] hover:text-white rounded transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>-5s</span>
          </button>

          {/* Forward 5s */}
          <button
            type="button"
            onClick={() => handleJump(5)}
            title="Skip forward 5 seconds"
            className="px-2.5 py-1.5 bg-[#18191f] hover:bg-[#23242c] border border-[#282a33] text-[10px] text-[#8e9299] hover:text-white rounded transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCw className="w-3 h-3" />
            <span>+5s</span>
          </button>

          {/* Loop Mode */}
          <button
            type="button"
            onClick={toggleLoop}
            title={isLooping ? 'Looping enabled' : 'Looping disabled'}
            className={`px-2.5 py-1.5 rounded border text-[10px] uppercase font-bold flex items-center gap-1 transition-all cursor-pointer ${
              isLooping
                ? 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_10px_rgba(255,68,68,0.2)]'
                : 'bg-[#18191f] border-[#282a33] text-[#6e727e] hover:text-white'
            }`}
          >
            <Repeat className="w-3 h-3" />
            <span>LOOP</span>
          </button>
        </div>

        {/* Volume & Level Slider */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="text-[#8e9299] hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1 bg-[#282a33] accent-red-500 cursor-pointer"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
          <span className="text-[10px] text-[#717582] w-7 text-right">
            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}
