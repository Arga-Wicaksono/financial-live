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

      if (!json.rates || json.rates.length === 0) {
        throw new Error('Empty data from API');
      }

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
      if (!hasLoadedRef.current) {
        setError('Gagal memuat data valas');
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  const rateMap = new Map(data.map(r => [r.currency, r]));

  // All non-USD currencies for the grid
  const gridCurrencies = data.filter(r => r.currency !== 'USD');

  if (loading && !error) {
    return (
      <div className="h-full flex flex-col p-3 gap-2">
        <div className="flex items-center gap-2 px-1">
          <div className="skeleton-shimmer h-3 w-20 rounded" />
          <div className="skeleton-shimmer h-2 w-16 rounded" />
        </div>
        <div className="skeleton-shimmer h-12 rounded-xl" />
        <div className="flex-1 grid grid-cols-3 gap-1">
          {[1,2,3,4,5,6,7,8,9].map(i => (
            <div key={i} className="skeleton-shimmer rounded-lg h-full" />
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

  const isUsdUp = usdChangePct > 0;
  const isUsdDown = usdChangePct < 0;

  return (
    <div className="h-full flex flex-col p-2 gap-1.5">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-bold text-emerald-400/90 tracking-widest uppercase">Valas / IDR</span>
          <span className="text-[9px] text-zinc-700 font-mono">Kurs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot-pulse" />
          <span className="text-[9px] text-zinc-600 font-mono">60s</span>
        </div>
      </div>

      {/* USD/IDR Hero Banner */}
      {usdIdr > 0 && (
        <div className="rounded-xl px-3 py-2 flex items-center justify-between relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.03) 50%, rgba(6, 95, 70, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.5), transparent)' }}
          />
          <div className="flex items-center gap-2">
            <span className="text-base">{'\u{1F1FA}\u{1F1F8}'}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-[11px]">USD / IDR</span>
                <span className={`px-1 py-0 rounded text-[8px] font-bold tabular-nums ${
                  isUsdUp ? 'bg-green-500/15 text-green-400' : isUsdDown ? 'bg-red-500/15 text-red-400' : 'bg-zinc-800/40 text-zinc-500'
                }`}>
                  {isUsdUp ? '\u25B2' : isUsdDown ? '\u25BC' : '\u25CF'} {isUsdUp ? '+' : ''}{usdChangePct.toFixed(2)}%
                </span>
              </div>
              {usdHigh > 0 && usdLow > 0 && (
                <div className="text-[8px] text-zinc-600 mt-0.5">
                  H: {new Intl.NumberFormat('id-ID').format(usdHigh)} &middot; L: {new Intl.NumberFormat('id-ID').format(usdLow)}
                </div>
              )}
            </div>
          </div>
          <span className="font-mono text-lg font-bold text-emerald-300 tabular-nums tracking-wide" key={tick}>
            {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdIdr)}
          </span>
        </div>
      )}

      {/* Currency grid — 3 columns × 3 rows */}
      <div className="flex-1 grid grid-cols-3 gap-1 min-h-0">
        {gridCurrencies.map(({ currency, flag, label }) => {
          const rate = rateMap.get(currency);
          return (
            <div
              key={currency}
              className="rounded-lg border border-zinc-800/20 bg-zinc-900/20 px-2 py-1.5 flex items-center justify-between hover:bg-zinc-800/20 hover:border-zinc-700/30 transition-all duration-200"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{flag}</span>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 tracking-wide">{currency}</span>
                </div>
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
