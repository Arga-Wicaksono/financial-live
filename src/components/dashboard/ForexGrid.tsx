'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ForexRate {
  currency: string;
  symbol: string;
  flag: string;
  label: string;
  rate_idr: number;
  rate_usd: number;
}

interface ForexResponse {
  base_usd_idr: number;
  usd_change_pct: number;
  usd_high: number;
  usd_low: number;
  rates: ForexRate[];
  timestamp: number;
  stale: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ForexGrid() {
  const [data, setData] = useState<ForexRate[]>([]);
  const [usdIdr, setUsdIdr] = useState(0);
  const [usdChangePct, setUsdChangePct] = useState(0);
  const [usdHigh, setUsdHigh] = useState(0);
  const [usdLow, setUsdLow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tick, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/forex');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ForexResponse = await res.json();
      if (!json.rates || json.rates.length === 0) throw new Error('Empty data');
      setData(json.rates);
      setUsdIdr(json.base_usd_idr);
      setUsdChangePct(json.usd_change_pct);
      setUsdHigh(json.usd_high);
      setUsdLow(json.usd_low);
      setLoading(false);
      setError(null);
      hasLoadedRef.current = true;
      setTick(t => t + 1);
    } catch (err) {
      console.error('ForexGrid fetch error:', err);
      if (!hasLoadedRef.current) setError('Gagal memuat data valas');
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  const rateMap = new Map(data.map(r => [r.currency, r]));
  const gridCurrencies = data.filter(r => r.currency !== 'USD');

  if (loading && !error) {
    return (
      <div className="h-full flex flex-col p-2 gap-1">
        <div className="skeleton-shimmer h-2.5 w-20 rounded" />
        <div className="skeleton-shimmer h-10 rounded-md" />
        <div className="flex-1 grid grid-cols-3 gap-1">{[1,2,3,4,5,6,7,8,9].map(i => <div key={i} className="skeleton-shimmer rounded-md" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs text-red-400">{error}</span>
      </div>
    );
  }

  const isUsdUp = usdChangePct > 0;
  const isUsdDown = usdChangePct < 0;

  return (
    <div className="h-full flex flex-col p-2 gap-1">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-3.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-400/90 tracking-widest uppercase">Valas / IDR</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-green-500 live-dot-pulse" />
          <span className="text-[8px] text-zinc-600 font-mono">60s</span>
        </div>
      </div>

      {/* USD/IDR Hero */}
      {usdIdr > 0 && (
        <div className="rounded-md px-2.5 py-1.5 flex items-center justify-between relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.18)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{'\u{1F1FA}\u{1F1F8}'}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-[10px]">USD / IDR</span>
                <span className={`px-1 rounded text-[8px] font-bold tabular-nums ${
                  isUsdUp ? 'bg-green-500/15 text-green-400' : isUsdDown ? 'bg-red-500/15 text-red-400' : 'bg-zinc-800/40 text-zinc-500'
                }`}>
                  {isUsdUp ? '\u25B2' : isUsdDown ? '\u25BC' : '\u25CF'} {isUsdUp ? '+' : ''}{usdChangePct.toFixed(2)}%
                </span>
              </div>
              {usdHigh > 0 && (
                <div className="text-[7px] text-zinc-600">
                  H:{new Intl.NumberFormat('id-ID').format(usdHigh)} L:{new Intl.NumberFormat('id-ID').format(usdLow)}
                </div>
              )}
            </div>
          </div>
          <span className="font-mono text-[15px] font-bold text-emerald-300 tabular-nums" key={tick}>
            {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdIdr)}
          </span>
        </div>
      )}

      {/* Currency grid */}
      <div className="flex-1 grid grid-cols-3 gap-1 min-h-0">
        {gridCurrencies.map(({ currency, flag }) => {
          const rate = rateMap.get(currency);
          return (
            <div key={currency} className="rounded-md border border-zinc-800/20 bg-zinc-900/20 px-2 py-1 flex items-center justify-between hover:bg-zinc-800/20 transition-all duration-200">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{flag}</span>
                <span className="text-[10px] font-bold text-zinc-400 tracking-wide">{currency}</span>
              </div>
              {rate ? (
                <span className="font-mono text-[11px] font-semibold text-white tabular-nums" key={tick}>
                  {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(rate.rate_idr)}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-700">-</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
