'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SentimentResponse {
  fear_greed: {
    value: number;
    classification: string;
    timestamp: number;
  };
  bi_rate: {
    rate: number;
    last_updated: string;
  };
  timestamp: number;
  stale: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getFngColor(value: number): string {
  if (value <= 25) return 'text-red-500';
  if (value <= 45) return 'text-orange-400';
  if (value <= 55) return 'text-yellow-400';
  if (value <= 75) return 'text-green-400';
  return 'text-emerald-400';
}

function getFngBg(value: number): string {
  if (value <= 25) return 'from-red-500/20 to-red-600/5 border-red-500/20';
  if (value <= 45) return 'from-orange-500/20 to-orange-600/5 border-orange-500/20';
  if (value <= 55) return 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/20';
  if (value <= 75) return 'from-green-500/20 to-green-600/5 border-green-500/20';
  return 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20';
}

function getFngGauge(value: number): string {
  if (value <= 25) return 'bg-red-500';
  if (value <= 45) return 'bg-orange-500';
  if (value <= 55) return 'bg-yellow-500';
  if (value <= 75) return 'bg-green-500';
  return 'bg-emerald-500';
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SentimentBar() {
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/sentiment');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: SentimentResponse = await res.json();
      setData(json);
      setLoading(false);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('SentimentBar fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 300_000); // 5 min
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  if (loading || !data) return null;

  const fng = data.fear_greed;
  const bi = data.bi_rate;

  return (
    <div className="flex items-center gap-4 h-full px-2">
      {/* Fear & Greed Gauge */}
      {fng.value > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold whitespace-nowrap">Fear & Greed</span>
          <div className={`rounded-lg px-2 py-1 flex items-center gap-2 border bg-gradient-to-r ${getFngBg(fng.value)}`}>
            {/* Gauge bar */}
            <div className="w-16 h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
              <div
                className={`h-full rounded-full ${getFngGauge(fng.value)} transition-all duration-500`}
                style={{ width: `${fng.value}%` }}
              />
            </div>
            <span className={`font-mono text-xs font-bold tabular-nums ${getFngColor(fng.value)}`}>
              {fng.value}
            </span>
            <span className="text-[8px] text-zinc-500 capitalize max-w-[50px] truncate">{fng.classification}</span>
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="w-px h-4 bg-zinc-800/50" />

      {/* BI Rate */}
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold">BI Rate</span>
        <div className="rounded-lg px-2 py-1 border border-purple-500/20 bg-gradient-to-r from-purple-500/15 to-purple-600/5">
          <span className="font-mono text-xs font-bold text-purple-400 tabular-nums">{bi.rate}%</span>
          <span className="text-[7px] text-zinc-600 ml-1.5">{bi.last_updated}</span>
        </div>
      </div>
    </div>
  );
}
