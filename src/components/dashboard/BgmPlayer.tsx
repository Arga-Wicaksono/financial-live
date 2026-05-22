'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Music, Volume2, VolumeX } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type BgmMode = 'synth' | 'custom';

// ── Ambient Synth Engine (Web Audio API) ────────────────────────────────────────

class AmbientSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private lfos: OscillatorNode[] = [];
  private filter: BiquadFilterNode | null = null;
  private isRunning = false;

  async start(volume: number) {
    if (this.isRunning) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = volume;
    this.masterGain.connect(this.ctx.destination);

    // Low-pass filter for warmth
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 800;
    this.filter.Q.value = 0.5;
    this.filter.connect(this.masterGain);

    // Chord tones: C2, G2, C3, E3, G3 — soft financial ambient
    const notes = [65.41, 98.0, 130.81, 164.81, 196.0];
    const types: OscillatorType[] = ['sine', 'sine', 'triangle', 'sine', 'sine'];
    const gains = [0.08, 0.06, 0.05, 0.03, 0.04];

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = types[i];
      osc.frequency.value = freq;

      // Individual gain
      const oscGain = this.ctx!.createGain();
      oscGain.gain.value = gains[i];

      // LFO for slow tremolo — each voice slightly different rate
      const lfo = this.ctx!.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.05 + i * 0.02; // very slow
      const lfoGain = this.ctx!.createGain();
      lfoGain.gain.value = gains[i] * 0.3; // subtle modulation
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);
      lfo.start();
      this.lfos.push(lfo);

      osc.connect(oscGain);
      oscGain.connect(this.filter!);
      osc.start();
      this.oscillators.push(osc);
    });

    // Slow filter sweep for movement
    const filterLfo = this.ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 0.03;
    const filterLfoGain = this.ctx.createGain();
    filterLfoGain.gain.value = 300;
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(this.filter.frequency);
    filterLfo.start();
    this.lfos.push(filterLfo);

    // High shimmer layer
    const shimmer = this.ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 523.25; // C5
    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.value = 0.008;
    const shimmerFilter = this.ctx.createBiquadFilter();
    shimmerFilter.type = 'bandpass';
    shimmerFilter.frequency.value = 600;
    shimmerFilter.Q.value = 2;
    const shimmerLfo = this.ctx.createOscillator();
    shimmerLfo.type = 'sine';
    shimmerLfo.frequency.value = 0.08;
    const shimmerLfoGain = this.ctx.createGain();
    shimmerLfoGain.gain.value = 0.006;
    shimmerLfo.connect(shimmerLfoGain);
    shimmerLfoGain.connect(shimmerGain.gain);
    shimmer.connect(shimmerFilter);
    shimmerFilter.connect(shimmerGain);
    shimmerGain.connect(this.masterGain);
    shimmer.start();
    shimmerLfo.start();
    this.oscillators.push(shimmer);
    this.lfos.push(shimmerLfo);

    this.isRunning = true;
  }

  setVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.3);
    }
  }

  stop() {
    this.oscillators.forEach(o => { try { o.stop(); } catch {} });
    this.lfos.forEach(l => { try { l.stop(); } catch {} });
    this.oscillators = [];
    this.lfos = [];
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
    this.filter = null;
    this.isRunning = false;
  }

  get running() {
    return this.isRunning;
  }
}

// ── Custom Audio Player ───────────────────────────────────────────────────────

class CustomAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private _isPlaying = false;

  async start(url: string, volume: number) {
    if (this._isPlaying) this.stop();
    this.audio = new Audio(url);
    this.audio.loop = true;
    this.audio.volume = volume;
    this.audio.crossOrigin = 'anonymous';
    try {
      await this.audio.play();
      this._isPlaying = true;
    } catch {
      this._isPlaying = false;
    }
  }

  setVolume(vol: number) {
    if (this.audio) this.audio.volume = vol;
  }

  pause() {
    if (this.audio) {
      this.audio.pause();
      this._isPlaying = false;
    }
  }

  async resume() {
    if (this.audio) {
      try {
        await this.audio.play();
        this._isPlaying = true;
      } catch {}
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this._isPlaying = false;
  }

  get isPlaying() {
    return this._isPlaying;
  }

  get loaded() {
    return this.audio !== null;
  }
}

// ── Preset royalty-free music URLs ─────────────────────────────────────────────

const PRESET_TRACKS = [
  { label: 'Ambient Synth', url: '__synth__', mode: 'synth' as BgmMode },
  { label: 'Lo-Fi Chill', url: 'https://stream.zeno.fm/0r0xa792kwzuv', mode: 'custom' as BgmMode },
  { label: 'Chillhop Radio', url: 'https://streams.fluxfm.de/Chillhop/mp3-320', mode: 'custom' as BgmMode },
  { label: 'Ambient Space', url: 'https://icecast.walmradio.com:8443/classic', mode: 'custom' as BgmMode },
];

// ── BGM Player Component ──────────────────────────────────────────────────────

export function BgmPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [showPanel, setShowPanel] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [audioReady, setAudioReady] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const synthRef = useRef<AmbientSynth | null>(null);
  const customRef = useRef<CustomAudioPlayer | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    }
    if (showPanel) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPanel]);

  const togglePlay = useCallback(async () => {
    const track = PRESET_TRACKS[currentTrack];

    if (isPlaying) {
      // Stop all
      synthRef.current?.stop();
      synthRef.current = null;
      customRef.current?.stop();
      customRef.current = null;
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);

    if (track.mode === 'synth') {
      const synth = new AmbientSynth();
      await synth.start(volume);
      synthRef.current = synth;
      setIsPlaying(true);
      setAudioReady(true);
    } else {
      const player = new CustomAudioPlayer();
      await player.start(track.url, volume);
      customRef.current = player;
      setIsPlaying(player.isPlaying);
      setAudioReady(player.isPlaying);
    }

    setIsLoading(false);
  }, [isPlaying, volume, currentTrack]);

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    synthRef.current?.setVolume(v);
    customRef.current?.setVolume(v);
  }, []);

  const switchTrack = useCallback((idx: number) => {
    const wasPlaying = isPlaying;
    // Stop current
    synthRef.current?.stop();
    synthRef.current = null;
    customRef.current?.stop();
    customRef.current = null;
    setIsPlaying(false);
    setCurrentTrack(idx);

    // Auto-play new track if was playing
    if (wasPlaying) {
      setTimeout(async () => {
        const track = PRESET_TRACKS[idx];
        if (track.mode === 'synth') {
          const synth = new AmbientSynth();
          await synth.start(volume);
          synthRef.current = synth;
          setIsPlaying(true);
        } else {
          const player = new CustomAudioPlayer();
          await player.start(track.url, volume);
          customRef.current = player;
          setIsPlaying(player.isPlaying);
        }
      }, 100);
    }
  }, [isPlaying, volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.stop();
      customRef.current?.stop();
    };
  }, []);

  const track = PRESET_TRACKS[currentTrack];

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Toggle Button ── */}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-800/40 bg-zinc-900/40 hover:bg-zinc-800/50 transition-all duration-200 disabled:opacity-50"
        title={isPlaying ? 'Stop BGM' : 'Play BGM'}
      >
        {isPlaying ? (
          <Volume2 className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <VolumeX className="w-3.5 h-3.5 text-zinc-600" />
        )}
        <span className={`text-xs font-semibold tracking-wider uppercase ${isPlaying ? 'text-green-400' : 'text-zinc-600'}`}>
          {isLoading ? '...' : isPlaying ? 'BGM ON' : 'BGM'}
        </span>
      </button>

      {/* ── Expand/Collapse ── */}
      <button
        onClick={() => setShowPanel(p => !p)}
        className="ml-1 p-1 rounded-md hover:bg-zinc-800/30 transition-colors duration-200"
        title="BGM Settings"
      >
        <Music className={`w-3 h-3 transition-colors duration-200 ${showPanel ? 'text-amber-400' : 'text-zinc-700'}`} />
      </button>

      {/* ── Floating Panel ── */}
      {showPanel && (
        <div className="absolute bottom-full right-0 mb-2 w-72 rounded-lg border border-zinc-800/40 bg-zinc-900/95 backdrop-blur-sm shadow-2xl shadow-black/50 p-3 z-50"
          style={{ animation: 'bgm-fade-in 0.15s ease-out' }}
        >
          {/* Track List */}
          <div className="mb-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-1.5">Pilih Track</div>
            <div className="flex flex-col gap-0.5">
              {PRESET_TRACKS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => switchTrack(i)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all duration-150 ${
                    i === currentTrack
                      ? 'bg-zinc-800/60 border border-zinc-700/30'
                      : 'hover:bg-zinc-800/30 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${i === currentTrack && isPlaying ? 'bg-green-400' : 'bg-zinc-700'}`} />
                    <span className={`text-xs font-medium ${i === currentTrack ? 'text-zinc-200' : 'text-zinc-500'}`}>{t.label}</span>
                  </div>
                  <span className="text-[10px] text-zinc-700">{t.mode === 'synth' ? 'Synth' : 'Radio'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">Volume</div>
              <span className="text-xs text-zinc-500 font-mono tabular-nums">{Math.round(volume * 100)}%</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(volume * 100)}
                onChange={e => changeVolume(parseInt(e.target.value) / 100)}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-zinc-800 accent-green-500"
              />
            </div>
          </div>

          {/* Now Playing */}
          {isPlaying && (
            <div className="mt-2 pt-2 border-t border-zinc-800/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500">Now playing: {track.label}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
