'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CommodityItem {
  symbol: string;
  name: string;
  unit: string;
  price: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
  prev_close: number;
}

interface CommoditiesResponse {
  data: CommodityItem[];
  timestamp: number;
  stale: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const COMMODITY_ICONS: Record<string, string> = {
  'Minyak WTI': '\u{1F6E2}\uFE0F',
  'Minyak Brent': '\u{1F6E2}\uFE0F',
  'Emas (futur)': '\u{1FA99}',
  'Perak': '\u{269C}\uFE0F',
  'Paladium': '\u2696\uFE0F',
  'Tembaga': '\u{1FAA8}',
};

const COMMODITY_COLORS: Record<string, string> = {
  'Minyak WTI': 'text-slate-300',
  'Minyak Brent': 'text-blue-300',
  'Emas (futur)': 'text-yellow-400',
  'Perak': 'text-zinc-300',
  'Paladium': 'text-purple-400',
  'Tembaga': 'text-orange-400',
};

function formatPrice(n: number): string {
  if (n === 0) return '-';
  if (n >= 100) return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CommoditiesGrid() {
  const [data, setData] = useState<CommodityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/commodities');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: CommoditiesResponse = await res.json();
      if (!json.data || json.data.length === 0) throw new Error('Empty data');
      setData(json.data);
      setLoading(false);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('CommoditiesGrid fetch error:', err);
      if (!hasLoadedRef.current) setError('Gagal memuat data komoditas');
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  if (loading && !error) {
    return (
      <div className="h-full flex flex-col p-3 gap-1.5">
        <div className="skeleton-shimmer h-3 w-28 rounded" />
        <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-1.5">{[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-shimmer rounded-md" />)}</div>
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
    <div className="h-full flex flex-col p-3 gap-1.5">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-orange-500" />
          <span className="text-xs font-bold text-orange-400/90 tracking-widest uppercase">Komoditas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 live-dot-pulse" />
          <span className="text-[10px] text-zinc-600 font-mono">60s</span>
        </div>
      </div>

      {/* 3x2 grid */}
      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-1.5 min-h-0">
        {data.map(item => {
          const isUp = item.change_pct > 0;
          const isDown = item.change_pct < 0;
          const icon = COMMODITY_ICONS[item.name] || '\u{1F4CA}';
          const color = COMMODITY_COLORS[item.name] || 'text-zinc-400';

          return (
            <div key={item.symbol} className="rounded-md border border-zinc-800/25 bg-zinc-900/25 px-3 py-2 flex flex-col justify-between hover:bg-zinc-800/25 transition-all duration-200">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{icon}</span>
                <div>
                  <span className="text-[11px] font-bold text-zinc-300 tracking-wide block leading-tight">{item.name}</span>
                  <span className="text-[10px] text-zinc-600">{item.unit}</span>
                </div>
              </div>
              <div className="flex items-end justify-between mt-auto">
                <span className={`font-mono text-sm font-semibold ${color} tabular-nums leading-tight`}>
                  {formatPrice(item.price)}
                </span>
                <span className={`text-[11px] font-bold tabular-nums ${
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
