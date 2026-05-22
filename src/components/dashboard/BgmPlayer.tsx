'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Music, Volume2, VolumeX, Radio } from 'lucide-react';

// ── Radio Stream Player ──────────────────────────────────────────────────────
// No crossOrigin attribute → browser won't block playback

class RadioPlayer {
  private audio: HTMLAudioElement | null = null;
  private _isPlaying = false;
  private _isLoading = false;

  async start(url: string, volume: number): Promise<boolean> {
    if (this._isPlaying) this.stop();
    this._isLoading = true;

    return new Promise<boolean>((resolve) => {
      this.audio = new Audio();
      this.audio.volume = volume;
      // NO crossOrigin — allows playback from any stream

      this.audio.addEventListener('playing', () => {
        this._isPlaying = true;
        this._isLoading = false;
        resolve(true);
      }, { once: true });

      this.audio.addEventListener('error', (e) => {
        console.warn('BGM stream error:', url, e);
        this._isPlaying = false;
        this._isLoading = false;
        resolve(false);
      }, { once: true });

      // Timeout fallback — if no playing/error in 8s, assume connected
      setTimeout(() => {
        if (!this._isPlaying && this._isLoading) {
          this._isLoading = false;
          // For HLS/icecast streams, 'playing' may not fire immediately
          // Check if audio is actually advancing
          if (this.audio && !this.audio.paused) {
            this._isPlaying = true;
            resolve(true);
          } else {
            resolve(false);
          }
        }
      }, 8000);

      this.audio.src = url;
      this.audio.play().catch(() => {
        this._isLoading = false;
        resolve(false);
      });
    });
  }

  setVolume(vol: number) {
    if (this.audio) this.audio.volume = vol;
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
    this._isPlaying = false;
    this._isLoading = false;
  }

  get isPlaying() { return this._isPlaying; }
  get isLoading() { return this._isLoading; }
}

// ── Free Radio Streams ────────────────────────────────────────────────────────

const TRACKS: { label: string; url: string; genre: string }[] = [
  {
    label: 'Lo-Fi Chill Beats',
    url: 'https://stream.zeno.fm/0r0xa792kwzuv',
    genre: 'Lo-Fi',
  },
  {
    label: 'Smooth Jazz 24/7',
    url: 'https://jazz-wr04.ice.infomaniak.ch/jazz-wr04-128.mp3',
    genre: 'Jazz',
  },
  {
    label: 'Lofi Hip Hop Radio',
    url: 'https://play.streamafrica.net/lofiradio',
    genre: 'Lo-Fi',
  },
  {
    label: 'Chillhop Radio',
    url: 'https://streams.fluxfm.de/Chillhop/mp3-320',
    genre: 'Chillhop',
  },
  {
    label: 'Ambient Space Radio',
    url: 'https://icecast.walmradio.com:8443/classic',
    genre: 'Ambient',
  },
  {
    label: 'Deep House Radio',
    url: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    genre: 'Deep House',
  },
];

// ── BGM Player Component ──────────────────────────────────────────────────────

export function BgmPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [showPanel, setShowPanel] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<RadioPlayer | null>(null);
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

  const stopCurrent = useCallback(() => {
    playerRef.current?.stop();
    playerRef.current = null;
  }, []);

  const playTrack = useCallback(async (trackIdx: number, vol: number) => {
    setError(null);
    setIsLoading(true);
    const track = TRACKS[trackIdx];

    const player = new RadioPlayer();
    const ok = await player.start(track.url, vol);

    if (ok) {
      playerRef.current = player;
      setIsPlaying(true);
      setError(null);
    } else {
      player.stop();
      setIsPlaying(false);
      setError(`${track.label} gagal. Coba track lain.`);
    }
    setIsLoading(false);
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      stopCurrent();
      setIsPlaying(false);
      setError(null);
      return;
    }

    await playTrack(currentTrack, volume);
  }, [isPlaying, currentTrack, volume, stopCurrent, playTrack]);

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    playerRef.current?.setVolume(v);
  }, []);

  const switchTrack = useCallback(async (idx: number) => {
    if (idx === currentTrack && isPlaying) return;

    stopCurrent();
    setIsPlaying(false);
    setCurrentTrack(idx);

    // Small delay so audio element can fully reset
    setTimeout(async () => {
      await playTrack(idx, volume);
    }, 200);
  }, [currentTrack, isPlaying, volume, stopCurrent, playTrack]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCurrent(); };
  }, [stopCurrent]);

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
        ) : isLoading ? (
          <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-green-400 rounded-full animate-spin" />
        ) : (
          <Radio className="w-3.5 h-3.5 text-zinc-600" />
        )}
        <span className={`text-xs font-semibold tracking-wider uppercase ${isPlaying ? 'text-green-400' : isLoading ? 'text-zinc-500' : 'text-zinc-600'}`}>
          {isLoading ? 'LOAD' : isPlaying ? 'BGM ON' : 'BGM'}
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
        <div className="absolute bottom-full right-0 mb-2 w-80 rounded-lg border border-zinc-800/40 bg-zinc-900/95 backdrop-blur-sm shadow-2xl shadow-black/50 p-3 z-50"
          style={{ animation: 'bgm-fade-in 0.15s ease-out' }}
        >
          {/* Track List */}
          <div className="mb-3">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-1.5">Radio Stations</div>
            <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto">
              {TRACKS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => switchTrack(i)}
                  disabled={isLoading}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all duration-150 disabled:opacity-50 ${
                    i === currentTrack
                      ? 'bg-zinc-800/60 border border-zinc-700/30'
                      : 'hover:bg-zinc-800/30 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      i === currentTrack && isPlaying ? 'bg-green-400 animate-pulse' : 'bg-zinc-700'
                    }`} />
                    <span className={`text-xs font-medium ${i === currentTrack ? 'text-zinc-200' : 'text-zinc-500'}`}>
                      {t.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-700 bg-zinc-800/50 px-1.5 py-0.5 rounded">{t.genre}</span>
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
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              onChange={e => changeVolume(parseInt(e.target.value) / 100)}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-zinc-800 accent-green-500"
            />
          </div>

          {/* Now Playing / Error */}
          {isPlaying && (
            <div className="mt-2 pt-2 border-t border-zinc-800/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500">Now playing: {track.label}</span>
            </div>
          )}
          {error && (
            <div className="mt-2 pt-2 border-t border-red-900/30">
              <span className="text-[10px] text-red-400/80">{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
