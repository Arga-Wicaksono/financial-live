'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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

// ── Compact Crypto Card ───────────────────────────────────────────────────────

function CryptoCard({ item, dir, tick }: { item: CryptoPairData; dir?: Direction; tick: number }) {
  const icon = ICONS[item.name] || '\u25CF';
  const iconColor = ICON_COLORS[item.name] || 'text-zinc-400';
  const isUp = item.change_pct > 0;
  const isDown = item.change_pct < 0;

  const cardAnim = dir === 'up' ? 'animate-card-up' : dir === 'down' ? 'animate-card-down' : '';

  return (
    <div className={`rounded-md px-3 py-2 flex flex-col justify-between transition-all duration-300 relative overflow-hidden bg-zinc-900/40 border border-zinc-800/30 hover:border-zinc-700/50 h-full ${cardAnim}`}>
      {/* Top: Icon + Name + Change */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-md bg-zinc-800/60 flex items-center justify-center shrink-0">
            <span className={`text-lg leading-none ${iconColor}`}>{icon}</span>
          </div>
          <div>
            <span className="font-bold text-white text-sm tracking-wide">{item.name}</span>
            <span className="text-zinc-600 text-[10px] font-normal block leading-none">/IDR</span>
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
          isUp ? 'bg-green-500/15 text-green-400 border border-green-500/20'
            : isDown ? 'bg-red-500/15 text-red-400 border border-red-500/20'
            : 'bg-zinc-800/40 text-zinc-500 border border-zinc-700/30'
        }`}>
          {isUp ? '\u25B2' : isDown ? '\u25BC' : '\u25CF'}
          {' '}{isUp ? '+' : ''}{item.change_pct.toFixed(2)}%
        </div>
      </div>

      {/* Price */}
      <div className="my-2">
        <PriceCell
          key={`price-${item.pair}-${tick}`}
          value={item.last}
          format="currency"
          decimals={0}
          className="text-xl font-bold tabular-nums"
          direction={dir}
        />
      </div>

      {/* Bid/Ask + Volume */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-green-400/70 tabular-nums">
          {new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(item.buy)}
        </span>
        <span className="text-zinc-600 text-[10px]">B / J</span>
        <span className="text-red-400/70 tabular-nums">
          {new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(item.sell)}
        </span>
      </div>
      <div className="text-[10px] text-zinc-600 mt-0.5 tabular-nums">
        Vol: {formatVol(item.vol_idr)}
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

      if (!json.data || json.data.length === 0) throw new Error('Empty data from API');

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
      if (!hasLoadedRef.current) setError('Gagal memuat data crypto');
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

  if (loading && !error) {
    return (
      <div className="h-full flex flex-col p-3 gap-2">
        <div className="flex items-center gap-2 px-1">
          <div className="skeleton-shimmer h-3 w-24 rounded" />
          <div className="skeleton-shimmer h-2.5 w-14 rounded" />
        </div>
        <div className="flex-1 grid grid-cols-7 gap-1.5">
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="rounded-md p-3 bg-zinc-900/40 border border-zinc-800/20">
              <div className="skeleton-shimmer h-4 w-12 rounded mb-2" />
              <div className="skeleton-shimmer h-5 w-full rounded mb-2" />
              <div className="skeleton-shimmer h-2 w-full rounded" />
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
          <span className="text-sm text-red-400 block">{error}</span>
          <button onClick={fetchData} className="mt-1 text-xs text-zinc-500 hover:text-white underline">Coba lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 gap-1.5">
      {/* Section header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-amber-500" />
          <span className="text-xs font-bold text-amber-400/90 tracking-widest uppercase">Crypto / IDR</span>
          <span className="text-[10px] text-zinc-700 font-mono">Indodax</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot-pulse" />
          <span className="text-[10px] text-zinc-600 font-mono">10s</span>
        </div>
      </div>

      {/* Single row: 7 crypto cards */}
      <div className="flex-1 grid grid-cols-7 gap-1.5 min-h-0">
        {data.map(item => (
          <CryptoCard key={item.pair} item={item} dir={directions.get(item.pair)} tick={tick} />
        ))}
      </div>
    </div>
  );
}
