'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface IndexItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
  prev_close: number;
}

interface IndicesResponse {
  data: IndexItem[];
  timestamp: number;
  stale: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  if (n === 0) return '-';
  if (n >= 10000) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
  if (n >= 100) return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const REGION_FLAGS: Record<string, { flag: string; region: string }> = {
  'S&P 500': { flag: '\u{1F1FA}\u{1F1F8}', region: 'US' },
  'Dow Jones': { flag: '\u{1F1FA}\u{1F1F8}', region: 'US' },
  'Nasdaq': { flag: '\u{1F1FA}\u{1F1F8}', region: 'US' },
  'Nikkei 225': { flag: '\u{1F1EF}\u{1F1F5}', region: 'JP' },
  'Hang Seng': { flag: '\u{1F1ED}\u{1F1F0}', region: 'HK' },
};

// ── Component ──────────────────────────────────────────────────────────────────

export function GlobalIndices() {
  const [data, setData] = useState<IndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/indices');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: IndicesResponse = await res.json();

      if (!json.data || json.data.length === 0) {
        throw new Error('Empty data from API');
      }

      setData(json.data);
      setLoading(false);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('GlobalIndices fetch error:', err);
      if (!hasLoadedRef.current) setError('Gagal memuat indeks global');
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  if (loading && !error) {
    return (
      <div className="h-full flex flex-col p-2.5 gap-1.5">
        <div className="flex items-center gap-2 px-1">
          <div className="skeleton-shimmer h-3 w-24 rounded" />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-shimmer rounded-lg h-8" />)}
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
          <div className="w-1 h-4 rounded-full bg-blue-500" />
          <span className="text-[11px] font-bold text-blue-400/90 tracking-widest uppercase">Indeks Global</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 live-dot-pulse" />
          <span className="text-[9px] text-zinc-600 font-mono">60s</span>
        </div>
      </div>

      {/* Index rows */}
      <div className="flex-1 flex flex-col gap-1 min-h-0">
        {data.map(item => {
          const isUp = item.change_pct > 0;
          const isDown = item.change_pct < 0;
          const info = REGION_FLAGS[item.name] || { flag: '\u{1F310}', region: '' };

          return (
            <div key={item.symbol} className="rounded-lg px-2 py-1.5 flex items-center justify-between border border-zinc-800/20 bg-zinc-900/20 hover:bg-zinc-800/20 transition-all duration-200">
              <div className="flex items-center gap-2">
                <span className="text-xs">{info.flag}</span>
                <div>
                  <span className="text-[10px] font-bold text-zinc-300 tracking-wide">{item.name}</span>
                  {info.region && <span className="text-[8px] text-zinc-700 ml-1.5">{info.region}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[11px] font-semibold text-white tabular-nums">
                  {formatPrice(item.price)}
                </span>
                <span className={`text-[9px] font-bold tabular-nums w-14 text-right ${
                  isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-zinc-500'
                }`}>
                  {isUp ? '\u25B2' : isDown ? '\u25BC' : '\u25CF'} {isUp ? '+' : ''}{item.change_pct.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
