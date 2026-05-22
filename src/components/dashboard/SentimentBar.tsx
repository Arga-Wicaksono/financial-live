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

function getFngGauge(value: number): string {
  if (value <= 25) return 'bg-red-500';
  if (value <= 45) return 'bg-orange-500';
  if (value <= 55) return 'bg-yellow-500';
  if (value <= 75) return 'bg-green-500';
  return 'bg-emerald-500';
}

// ── Component (inline, no wrapper padding) ─────────────────────────────────────

export function SentimentBar() {
  const [data, setData] = useState<SentimentResponse | null>(null);
  const hasLoadedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/sentiment');
      if (!res.ok) return;
      const json: SentimentResponse = await res.json();
      setData(json);
      hasLoadedRef.current = true;
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 300_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  if (!data) return <span className="text-[9px] text-zinc-700">Fear & Greed --</span>;

  const fng = data.fear_greed;
  const bi = data.bi_rate;

  return (
    <div className="flex items-center gap-3">
      {/* Fear & Greed */}
      {fng.value > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] text-zinc-600 uppercase tracking-wider font-semibold">Fear & Greed</span>
          <div className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 bg-zinc-800/40 border border-zinc-800/30">
            <div className="w-14 h-1 rounded-full bg-zinc-800/80 overflow-hidden">
              <div
                className={`h-full rounded-full ${getFngGauge(fng.value)} transition-all duration-500`}
                style={{ width: `${fng.value}%` }}
              />
            </div>
            <span className={`font-mono text-[10px] font-bold tabular-nums ${getFngColor(fng.value)}`}>
              {fng.value}
            </span>
            <span className="text-[7px] text-zinc-500 capitalize max-w-[42px] truncate">{fng.classification}</span>
          </div>
        </div>
      )}

      {/* BI Rate */}
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] text-zinc-600 uppercase tracking-wider font-semibold">BI Rate</span>
        <span className="font-mono text-[10px] font-bold text-purple-400 tabular-nums bg-purple-500/10 border border-purple-500/15 rounded-md px-1.5 py-0.5">
          {bi.rate}%
        </span>
      </div>
    </div>
  );
}
