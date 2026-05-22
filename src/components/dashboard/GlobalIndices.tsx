'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { SectionHeader } from './SectionHeader';

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

function fmtPrice(n: number): string {
  if (n === 0) return '-';
  if (n >= 10000) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const FLAGS: Record<string, string> = {
  'S&P 500': '\u{1F1FA}\u{1F1F8}',
  'Dow Jones': '\u{1F1FA}\u{1F1F8}',
  'Nasdaq': '\u{1F1FA}\u{1F1F8}',
  'Nikkei 225': '\u{1F1EF}\u{1F1F5}',
  'Hang Seng': '\u{1F1ED}\u{1F1F0}',
};

const REGIONS: Record<string, string> = {
  'S&P 500': 'US',
  'Dow Jones': 'US',
  'Nasdaq': 'US',
  'Nikkei 225': 'JP',
  'Hang Seng': 'HK',
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
      if (!json.data || json.data.length === 0) throw new Error('Empty data');
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
      <div className="h-full flex flex-col p-3 gap-2">
        <div className="skeleton-shimmer h-3 w-28 rounded" />
        <div className="flex-1 flex flex-col gap-1.5">{[1,2,3,4,5].map(i => <div key={i} className="skeleton-shimmer rounded-lg flex-1" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-red-400">{error}</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      <SectionHeader color="bg-blue-500" title="Indeks Global" interval="60s" />

      <div className="flex-1 flex flex-col gap-1.5 min-h-0">
        {data.map(item => {
          const isUp = item.change_pct > 0;
          const isDown = item.change_pct < 0;
          const flag = FLAGS[item.name] || '\u{1F310}';
          const region = REGIONS[item.name] || '';

          return (
            <div key={item.symbol} className="rounded-lg px-3 py-1.5 flex items-center justify-between border border-zinc-800/20 bg-zinc-900/20 hover:bg-zinc-800/25 transition-all flex-1 min-h-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm shrink-0">{flag}</span>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-300 tracking-wide block leading-tight">{item.name}</span>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-600 mt-0.5">
                    {region && <span className="bg-zinc-800/50 px-1 rounded">{region}</span>}
                    <span>H:{fmtPrice(item.high)}</span>
                    <span>L:{fmtPrice(item.low)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className="font-mono text-sm font-semibold text-white tabular-nums block leading-tight">
                  {fmtPrice(item.price)}
                </span>
                <span className={`text-[10px] font-bold tabular-nums block leading-tight ${
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
