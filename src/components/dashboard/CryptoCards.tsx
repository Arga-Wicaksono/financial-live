'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { PriceCell } from './PriceCell';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CryptoPairData {
  pair: string;
  name: string;
  high: number;
  low: number;
  vol_idr: number;
  last: number;
  buy: number;
  sell: number;
  server_time: number;
  change_pct: number;
}

interface CryptoResponse {
  data: CryptoPairData[];
  server_time: number;
  stale: boolean;
}

type Direction = 'up' | 'down';

// ── Helpers ────────────────────────────────────────────────────────────────────

const ICONS: Record<string, string> = {
  BTC: '\u20BF', ETH: '\u039E', SOL: '\u25CE', XRP: '\u25CF', BNB: '\u25C6', DOGE: '\u25CF', USDT: '\u20AE',
};

const ICON_COLORS: Record<string, string> = {
  BTC: 'text-amber-400', ETH: 'text-indigo-400', SOL: 'text-violet-400',
  XRP: 'text-slate-300', BNB: 'text-yellow-400', DOGE: 'text-orange-400', USDT: 'text-emerald-400',
};

function formatVol(vol: number): string {
  if (vol === 0) return '-';
  if (vol >= 1e12) return `${(vol / 1e12).toFixed(1)}T`;
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}M`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(0)}Jt`;
  return String(vol);
}

function detectDirection(data: CryptoPairData[], ref: React.MutableRefObject<Map<string, number>>): Map<string, Direction> {
  const dirs = new Map<string, Direction>();
  for (const item of data) {
    const prev = ref.current.get(item.pair);
    if (prev !== undefined && item.last !== prev && prev !== 0) {
      dirs.set(item.pair, item.last > prev ? 'up' : 'down');
    }
    ref.current.set(item.pair, item.last);
  }
  return dirs;
}

// ── Mini Price Range Bar ──────────────────────────────────────────────────────

function MiniPriceBar({ low, high, last }: { low: number; high: number; last: number }) {
  if (high === 0 || low === 0) return null;
  const range = high - low;
  const pct = Math.max(0, Math.min(100, ((last - low) / range) * 100));
  const isUp = last >= (high + low) / 2;
  const color = isUp ? 'bg-green-500' : 'bg-red-400';

  return (
    <div className="mini-bar-track mt-1">
      <div
        className="mini-bar-fill bg-gradient-to-r from-red-400/50 via-zinc-500/50 to-green-500/50"
        style={{ left: '0%', width: '100%' }}
      />
      <div
        className={`mini-bar-dot ${color}`}
        style={{ left: `${pct}%`, color: isUp ? '#22c55e' : '#f87171' }}
      />
    </div>
  );
}

// ── Volume Bar ─────────────────────────────────────────────────────────────────

function VolumeBar({ vol, maxVol }: { vol: number; maxVol: number }) {
  const pct = maxVol > 0 ? Math.max(5, (vol / maxVol) * 100) : 5;
  return (
    <div className="vol-bar mt-0.5">
      <div
        className="vol-bar-fill bg-gradient-to-r from-amber-500/60 to-amber-400/40"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Compact Crypto Card (single row layout) ────────────────────────────────────

function CryptoCard({ item, dir, tick, showVolume }: { item: CryptoPairData; dir?: Direction; tick: number; showVolume?: boolean }) {
  const icon = ICONS[item.name] || '\u25CF';
  const iconColor = ICON_COLORS[item.name] || 'text-zinc-400';
  const isUp = item.change_pct > 0;
  const isDown = item.change_pct < 0;

  const cardAnim = dir === 'up'
    ? 'animate-card-up'
    : dir === 'down'
      ? 'animate-card-down'
      : '';

  return (
    <div className={`rounded-lg px-2.5 py-2 flex flex-col justify-between transition-all duration-300 relative overflow-hidden bg-zinc-900/40 border border-zinc-800/30 hover:border-zinc-700/50 h-full ${cardAnim}`}>
      {/* Top: Icon + Name + Change */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-zinc-800/60 flex items-center justify-center shrink-0">
            <span className={`text-sm leading-none ${iconColor}`}>{icon}</span>
          </div>
          <div>
            <span className="font-bold text-white text-xs tracking-wide">{item.name}</span>
            <span className="text-zinc-600 text-[9px] font-normal block leading-none">/IDR</span>
          </div>
        </div>
        <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
          isUp
            ? 'bg-green-500/15 text-green-400 border border-green-500/20'
            : isDown
              ? 'bg-red-500/15 text-red-400 border border-red-500/20'
              : 'bg-zinc-800/40 text-zinc-500 border border-zinc-700/30'
        }`}>
          {isUp ? '\u25B2' : isDown ? '\u25BC' : '\u25CF'}
          {' '}{isUp ? '+' : ''}{item.change_pct.toFixed(2)}%
        </div>
      </div>

      {/* Price */}
      <div className="mb-1">
        <PriceCell
          key={`price-${item.pair}-${tick}`}
          value={item.last}
          format="currency"
          decimals={0}
          className="text-sm font-bold tabular-nums"
          direction={dir}
        />
      </div>

      {/* Price range bar */}
      <MiniPriceBar low={item.low} high={item.high} last={item.last} />

      {/* Bid/Ask + Volume */}
      <div className="flex items-center justify-between mt-1.5 text-[9px]">
        <div>
          <span className="text-zinc-600">B </span>
          <span className="text-green-400/80 tabular-nums font-medium">
            {new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(item.buy)}
          </span>
        </div>
        <div>
          <span className="text-zinc-600">J </span>
          <span className="text-red-400/80 tabular-nums font-medium">
            {new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(item.sell)}
          </span>
        </div>
        {showVolume && (
          <div className="text-zinc-500 tabular-nums">
            V: {formatVol(item.vol_idr)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Crypto Cards Grid ─────────────────────────────────────────────────────────

export function CryptoCards() {
  const [data, setData] = useState<CryptoPairData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [directions, setDirections] = useState<Map<string, Direction>>(new Map());

  const prevRef = useRef<Map<string, number>>(new Map());
  const hasLoadedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/crypto');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: CryptoResponse = await res.json();

      if (!json.data || json.data.length === 0) {
        throw new Error('Empty data from API');
      }

      const dirs = detectDirection(json.data, prevRef);
      if (dirs.size > 0) {
        setDirections(dirs);
        setTick(t => t + 1);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setDirections(new Map()), 800);
      }

      setData(json.data);
      setLoading(false);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('CryptoCards fetch error:', err);
      if (!hasLoadedRef.current) {
        setError('Gagal memuat data crypto');
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [fetchData]);

  const maxVol = useMemo(() => Math.max(...data.map(d => d.vol_idr), 1), [data]);

  if (loading && !error) {
    return (
      <div className="h-full flex flex-col p-2 gap-2">
        <div className="flex items-center gap-2 px-1">
          <div className="skeleton-shimmer h-3 w-20 rounded" />
          <div className="skeleton-shimmer h-2 w-16 rounded" />
        </div>
        <div className="flex-1 grid grid-cols-7 gap-1.5">
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="rounded-lg p-2 bg-zinc-900/40 border border-zinc-800/20">
              <div className="skeleton-shimmer h-3 w-10 rounded mb-1.5" />
              <div className="skeleton-shimmer h-4 w-20 rounded mb-1.5" />
              <div className="skeleton-shimmer h-1.5 w-full rounded mb-1.5" />
              <div className="skeleton-shimmer h-2.5 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="text-xs text-red-400 block">{error}</span>
          <button onClick={fetchData} className="mt-1 text-[10px] text-zinc-500 hover:text-white underline">Coba lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-2 gap-2">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-amber-500" />
          <span className="text-[11px] font-bold text-amber-400/90 tracking-widest uppercase">Crypto / IDR</span>
          <span className="text-[9px] text-zinc-700 font-mono">Indodax</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Volume summary inline */}
          <div className="flex items-center gap-2">
            {data.slice(0, 4).map(item => (
              <div key={item.pair} className="flex items-center gap-1">
                <span className={`text-[9px] font-bold ${ICON_COLORS[item.name] || 'text-zinc-400'}`}>{item.name}</span>
                <span className="text-[9px] text-zinc-500 tabular-nums">{formatVol(item.vol_idr)}</span>
                <VolumeBar vol={item.vol_idr} maxVol={maxVol} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot-pulse" />
            <span className="text-[9px] text-zinc-600 font-mono">10s</span>
          </div>
        </div>
      </div>

      {/* Single row: 7 crypto cards */}
      <div className="flex-1 grid grid-cols-7 gap-1.5 min-h-0">
        {data.map(item => (
          <CryptoCard
            key={item.pair}
            item={item}
            dir={directions.get(item.pair)}
            tick={tick}
            showVolume={true}
          />
        ))}
      </div>
    </div>
  );
}
