'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { PriceCell } from './PriceCell';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StockItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  prev_close: number;
}

interface StockResponse {
  indices: StockItem[];
  bluechips: StockItem[];
  timestamp: number;
  stale: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatVol(vol: number): string {
  if (vol === 0) return '-';
  if (vol >= 1e12) return `${(vol / 1e12).toFixed(1)}T`;
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}M`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(0)}Jt`;
  return String(vol);
}

function formatLargeNum(n: number): string {
  if (n === 0) return '-';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);
}

// ── Index Card (IHSG, LQ45, IDX30) ────────────────────────────────────────────

function IndexCard({ item }: { item: StockItem }) {
  const isUp = item.change_pct > 0;
  const isDown = item.change_pct < 0;

  return (
    <div className="rounded-xl px-3 py-2 flex flex-col justify-between border border-zinc-800/30 bg-zinc-900/30 hover:bg-zinc-800/30 transition-all duration-200">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3 rounded-full bg-cyan-500" />
          <span className="text-[10px] font-bold text-zinc-300 tracking-wider">{item.name}</span>
        </div>
        <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold tabular-nums ${
          isUp ? 'bg-green-500/15 text-green-400' : isDown ? 'bg-red-500/15 text-red-400' : 'bg-zinc-800/40 text-zinc-500'
        }`}>
          {isUp ? '\u25B2' : isDown ? '\u25BC' : '\u25CF'} {isUp ? '+' : ''}{item.change_pct.toFixed(2)}%
        </div>
      </div>
      <span className="font-mono text-lg font-bold text-white tabular-nums">
        {formatLargeNum(item.price)}
      </span>
      <div className="flex items-center justify-between mt-1 text-[8px] text-zinc-600">
        <span>H: {formatLargeNum(item.high)}</span>
        <span>L: {formatLargeNum(item.low)}</span>
        <span>V: {formatVol(item.volume)}</span>
      </div>
    </div>
  );
}

// ── Blue-chip Card ─────────────────────────────────────────────────────────────

function BluechipCard({ item }: { item: StockItem }) {
  const isUp = item.change_pct > 0;
  const isDown = item.change_pct < 0;

  return (
    <div className="rounded-lg px-2 py-1.5 flex items-center justify-between border border-zinc-800/20 bg-zinc-900/20 hover:bg-zinc-800/20 transition-all duration-200">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-cyan-400/90 tabular-nums">{item.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-semibold text-white tabular-nums">
          {formatLargeNum(item.price)}
        </span>
        <span className={`text-[9px] font-bold tabular-nums w-14 text-right ${
          isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-zinc-500'
        }`}>
          {isUp ? '+' : ''}{item.change_pct.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

// ── Stocks Panel ──────────────────────────────────────────────────────────────

export function StocksPanel() {
  const [indices, setIndices] = useState<StockItem[]>([]);
  const [bluechips, setBluechips] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/stocks');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: StockResponse = await res.json();

      if (!json.indices || json.indices.length === 0) {
        throw new Error('Empty data from API');
      }

      setIndices(json.indices);
      setBluechips(json.bluechips);
      setLoading(false);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('StocksPanel fetch error:', err);
      if (!hasLoadedRef.current) setError('Gagal memuat data saham');
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  if (loading && !error) {
    return (
      <div className="h-full flex flex-col p-2.5 gap-2">
        <div className="flex items-center gap-2 px-1">
          <div className="skeleton-shimmer h-3 w-24 rounded" />
          <div className="skeleton-shimmer h-2 w-16 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map(i => <div key={i} className="skeleton-shimmer rounded-xl h-16" />)}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-shimmer rounded-lg h-6" />)}
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
    <div className="h-full flex flex-col p-2.5 gap-1.5">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-cyan-500" />
          <span className="text-[11px] font-bold text-cyan-400/90 tracking-widest uppercase">Saham Indonesia</span>
          <span className="text-[9px] text-zinc-700 font-mono">BEI</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 live-dot-pulse" />
          <span className="text-[9px] text-zinc-600 font-mono">60s</span>
        </div>
      </div>

      {/* Index cards: IHSG, LQ45, IDX30 */}
      <div className="grid grid-cols-3 gap-1.5">
        {indices.map(item => <IndexCard key={item.symbol} item={item} />)}
      </div>

      {/* Blue-chip stocks */}
      <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-hidden">
        <div className="text-[8px] text-zinc-600 uppercase tracking-wider font-semibold px-1">Blue-Chip</div>
        <div className="flex-1 flex flex-col gap-1 min-h-0">
          {bluechips.map(item => <BluechipCard key={item.symbol} item={item} />)}
        </div>
      </div>
    </div>
  );
}
