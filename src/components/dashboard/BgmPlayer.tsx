'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Music, Volume2, VolumeX } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type BgmMode = 'synth' | 'file';

// ── Ambient Synth Engine (Web Audio API) ────────────────────────────────────────
// Rewritten: louder, warmer mid-range tones suitable for YouTube live streams

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

    // Master gain — boost the input volume significantly
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = volume * 3.5; // 3.5x boost so default 0.3 → 1.05 effective
    this.masterGain.connect(this.ctx.destination);

    // Warm low-pass filter — wider cutoff for audible mid-range
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1800;
    this.filter.Q.value = 0.7;
    this.filter.connect(this.masterGain);

    // ── Pad Layer: Rich Cmaj7 chord in audible range ──
    // C3(130), E3(164), G3(196), B3(246) — pleasant jazz voicing
    const padNotes = [130.81, 164.81, 196.0, 246.94];
    const padGains = [0.15, 0.12, 0.13, 0.10];

    padNotes.forEach((freq, i) => {
      // Two detuned oscillators per note for warmth
      for (const detune of [-6, 6]) {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = detune;

        const oscGain = this.ctx!.createGain();
        oscGain.gain.value = padGains[i];

        osc.connect(oscGain);
        oscGain.connect(this.filter!);
        osc.start();
        this.oscillators.push(osc);
      }

      // Slow LFO tremolo per voice
      const lfo = this.ctx!.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.04 + i * 0.015;
      const lfoGain = this.ctx!.createGain();
      lfoGain.gain.value = padGains[i] * 0.25;
      lfo.connect(lfoGain);
      lfo.start();
      this.lfos.push(lfo);
      // Note: LFO connected below via separate routing
    });

    // ── Sub-bass: gentle foundation ──
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 65.41; // C2
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.10;
    sub.connect(subGain);
    subGain.connect(this.filter!);
    sub.start();
    this.oscillators.push(sub);

    // ── High shimmer: C5 + E5 sparkle ──
    const shimmerNotes = [523.25, 659.25]; // C5, E5
    shimmerNotes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      // Bandpass for sparkle
      const bp = this.ctx!.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 3;

      const oscGain = this.ctx!.createGain();
      oscGain.gain.value = 0.025;

      // LFO for gentle shimmer
      const lfo = this.ctx!.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.06 + i * 0.03;
      const lfoGain = this.ctx!.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);
      lfo.start();
      this.lfos.push(lfo);

      osc.connect(bp);
      bp.connect(oscGain);
      oscGain.connect(this.masterGain!);
      osc.start();
      this.oscillators.push(osc);
    });

    // ── Triangle pad for richness ──
    const tri = this.ctx.createOscillator();
    tri.type = 'triangle';
    tri.frequency.value = 261.63; // C4
    const triGain = this.ctx.createGain();
    triGain.gain.value = 0.06;
    tri.connect(triGain);
    triGain.connect(this.filter!);
    tri.start();
    this.oscillators.push(tri);

    // ── Slow filter sweep for movement ──
    const filterLfo = this.ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 0.025;
    const filterLfoGain = this.ctx.createGain();
    filterLfoGain.gain.value = 500; // sweep ±500Hz
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(this.filter.frequency);
    filterLfo.start();
    this.lfos.push(filterLfo);

    this.isRunning = true;
  }

  setVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(vol * 3.5, this.ctx.currentTime, 0.3);
    }
  }

  stop() {
    // Fade out before stopping
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
    setTimeout(() => {
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
    }, 300);
  }

  get running() {
    return this.isRunning;
  }
}

// ── File-based Audio Player ───────────────────────────────────────────────────

class FileAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private _isPlaying = false;

  async start(url: string, volume: number) {
    if (this._isPlaying) this.stop();
    this.audio = new Audio(url);
    this.audio.loop = true;
    this.audio.volume = volume;
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
}

// ── Track list ────────────────────────────────────────────────────────────────
// synth = Web Audio API (guaranteed to work, no CORS)
// file = local public audio file

const TRACKS = [
  { label: 'Ambient Synth', mode: 'synth' as BgmMode, desc: 'Generated' },
  { label: 'Ambient Synth v2', mode: 'synth2' as BgmMode, desc: 'Deep Pad' },
];

// ── Ambient Synth v2 (Deep Pad) ───────────────────────────────────────────────

class AmbientSynthV2 {
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
    this.masterGain.gain.value = volume * 3.0;
    this.masterGain.connect(this.ctx.destination);

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1200;
    this.filter.Q.value = 0.5;
    this.filter.connect(this.masterGain);

    // Dm9 chord: D3, F3, A3, C4, E4 — cinematic feel
    const notes = [146.83, 174.61, 220.0, 261.63, 329.63];
    const gains = [0.14, 0.11, 0.12, 0.08, 0.06];

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = i < 3 ? 'triangle' : 'sine';
      osc.frequency.value = freq;

      // Detune for width
      const osc2 = this.ctx!.createOscillator();
      osc2.type = osc.type;
      osc2.frequency.value = freq;
      osc2.detune.value = 8;

      const gain = this.ctx!.createGain();
      gain.gain.value = gains[i];

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.filter!);
      osc.start();
      osc2.start();
      this.oscillators.push(osc, osc2);

      // Tremolo
      const lfo = this.ctx!.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.03 + i * 0.01;
      const lfoGain = this.ctx!.createGain();
      lfoGain.gain.value = gains[i] * 0.2;
      lfo.connect(lfoGain);
      lfo.start();
      this.lfos.push(lfo);
    });

    // Sub bass
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 73.42; // D2
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.12;
    sub.connect(subGain);
    subGain.connect(this.filter!);
    sub.start();
    this.oscillators.push(sub);

    // High pad E5
    const high = this.ctx.createOscillator();
    high.type = 'sine';
    high.frequency.value = 659.25;
    const highGain = this.ctx.createGain();
    highGain.gain.value = 0.02;
    const highLfo = this.ctx.createOscillator();
    highLfo.type = 'sine';
    highLfo.frequency.value = 0.05;
    const highLfoGain = this.ctx.createGain();
    highLfoGain.gain.value = 0.015;
    highLfo.connect(highLfoGain);
    highLfoGain.connect(highGain.gain);
    high.connect(highGain);
    highGain.connect(this.masterGain!);
    high.start();
    highLfo.start();
    this.oscillators.push(high);
    this.lfos.push(highLfo);

    // Filter sweep
    const fLfo = this.ctx.createOscillator();
    fLfo.type = 'sine';
    fLfo.frequency.value = 0.02;
    const fLfoGain = this.ctx.createGain();
    fLfoGain.gain.value = 400;
    fLfo.connect(fLfoGain);
    fLfoGain.connect(this.filter.frequency);
    fLfo.start();
    this.lfos.push(fLfo);

    this.isRunning = true;
  }

  setVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(vol * 3.0, this.ctx.currentTime, 0.3);
    }
  }

  stop() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
    setTimeout(() => {
      this.oscillators.forEach(o => { try { o.stop(); } catch {} });
      this.lfos.forEach(l => { try { l.stop(); } catch {} });
      this.oscillators = [];
      this.lfos = [];
      if (this.ctx) { this.ctx.close(); this.ctx = null; }
      this.masterGain = null;
      this.filter = null;
      this.isRunning = false;
    }, 300);
  }

  get running() { return this.isRunning; }
}

// ── BGM Player Component ──────────────────────────────────────────────────────

export function BgmPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [showPanel, setShowPanel] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const synth1Ref = useRef<AmbientSynth | null>(null);
  const synth2Ref = useRef<AmbientSynthV2 | null>(null);
  const fileRef = useRef<FileAudioPlayer | null>(null);
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

  const stopAll = useCallback(() => {
    synth1Ref.current?.stop();
    synth1Ref.current = null;
    synth2Ref.current?.stop();
    synth2Ref.current = null;
    fileRef.current?.stop();
    fileRef.current = null;
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      stopAll();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    const track = TRACKS[currentTrack];

    if (track.mode === 'synth') {
      const synth = new AmbientSynth();
      await synth.start(volume);
      synth1Ref.current = synth;
      setIsPlaying(true);
    } else if (track.mode === 'synth2') {
      const synth = new AmbientSynthV2();
      await synth.start(volume);
      synth2Ref.current = synth;
      setIsPlaying(true);
    } else {
      const player = new FileAudioPlayer();
      // For file mode, you'd place an mp3 in /public/bgm/ and reference /bgm/track.mp3
      await player.start(track.desc, volume);
      fileRef.current = player;
      setIsPlaying(player.isPlaying);
    }

    setIsLoading(false);
  }, [isPlaying, volume, currentTrack, stopAll]);

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    synth1Ref.current?.setVolume(v);
    synth2Ref.current?.setVolume(v);
    fileRef.current?.setVolume(v);
  }, []);

  const switchTrack = useCallback((idx: number) => {
    const wasPlaying = isPlaying;
    stopAll();
    setIsPlaying(false);
    setCurrentTrack(idx);

    if (wasPlaying) {
      setTimeout(async () => {
        const track = TRACKS[idx];
        if (track.mode === 'synth') {
          const synth = new AmbientSynth();
          await synth.start(volume);
          synth1Ref.current = synth;
          setIsPlaying(true);
        } else if (track.mode === 'synth2') {
          const synth = new AmbientSynthV2();
          await synth.start(volume);
          synth2Ref.current = synth;
          setIsPlaying(true);
        } else {
          const player = new FileAudioPlayer();
          await player.start(track.desc, volume);
          fileRef.current = player;
          setIsPlaying(player.isPlaying);
        }
      }, 400); // wait for fade-out
    }
  }, [isPlaying, volume, stopAll]);

  // Cleanup
  useEffect(() => {
    return () => { stopAll(); };
  }, [stopAll]);

  const track = TRACKS[currentTrack];

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
              {TRACKS.map((t, i) => (
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
                  <span className="text-[10px] text-zinc-700">{t.desc}</span>
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
