'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Activity } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ForexRate {
  currency: string;
  symbol: string;
  rate_idr: number;
  rate_usd: number;
}

interface ForexResponse {
  base_usd_idr: number;
  rates: ForexRate[];
  timestamp: number;
  stale: boolean;
}

// ── Currency config ───────────────────────────────────────────────────────────

const CURRENCIES: { code: string; flag: string; label: string }[] = [
  { code: 'USD', flag: '\u{1F1FA}\u{1F1F8}', label: 'Dollar AS' },
  { code: 'EUR', flag: '\u{1F1EA}\u{1F1FA}', label: 'Euro' },
  { code: 'GBP', flag: '\u{1F1EC}\u{1F1E7}', label: 'Poundsterling' },
  { code: 'JPY', flag: '\u{1F1EF}\u{1F1F5}', label: 'Yen' },
  { code: 'SGD', flag: '\u{1F1F8}\u{1F1EC}', label: 'Dollar SG' },
  { code: 'CHF', flag: '\u{1F1E8}\u{1F1ED}', label: 'Franc' },
  { code: 'CNY', flag: '\u{1F1E8}\u{1F1F3}', label: 'Yuan' },
  { code: 'AUD', flag: '\u{1F1E6}\u{1F1FA}', label: 'Dollar AU' },
];

// ── Component ──────────────────────────────────────────────────────────────────

export function ForexGrid() {
  const [data, setData] = useState<ForexRate[]>([]);
  const [usdIdr, setUsdIdr] = useState(0);
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

  if (loading && !error) {
    return (
      <div className="h-full flex flex-col p-3 gap-2">
        <div className="flex items-center gap-2 px-1">
          <div className="skeleton-shimmer h-3 w-20 rounded" />
          <div className="skeleton-shimmer h-2 w-16 rounded" />
        </div>
        <div className="skeleton-shimmer h-12 rounded-xl" />
        <div className="flex-1 grid grid-cols-4 grid-rows-2 gap-1.5">
          {[1,2,3,4,5,6,7].map(i => (
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

  return (
    <div className="h-full flex flex-col p-2.5 gap-2">
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
        <div className="rounded-xl px-4 py-2.5 flex items-center justify-between relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.03) 50%, rgba(6, 95, 70, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          {/* Animated glow line at top */}
          <div className="absolute top-0 left-0 right-0 h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.5), transparent)',
            }}
          />
          <div className="flex items-center gap-3">
            <span className="text-xl">{'\u{1F1FA}\u{1F1F8}'}</span>
            <div>
              <span className="font-bold text-white text-sm">USD / IDR</span>
              <span className="text-[9px] text-emerald-400/60 ml-2 font-medium">BENCHMARK</span>
            </div>
          </div>
          <span className="font-mono text-xl font-bold text-emerald-300 tabular-nums tracking-wide" key={tick}>
            {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdIdr)}
          </span>
        </div>
      )}

      {/* Currency grid */}
      <div className="flex-1 grid grid-cols-4 grid-rows-2 gap-1.5 min-h-0">
        {CURRENCIES.filter(c => c.code !== 'USD').map(({ code, flag, label }) => {
          const rate = rateMap.get(code);
          return (
            <div
              key={code}
              className="rounded-lg border border-zinc-800/30 bg-zinc-900/30 px-2.5 py-2 flex flex-col justify-center hover:bg-zinc-800/30 hover:border-zinc-700/40 transition-all duration-200 group"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm group-hover:scale-110 transition-transform duration-200">{flag}</span>
                <span className="text-[10px] font-bold text-zinc-400 tracking-wide">{code}</span>
                <span className="text-[8px] text-zinc-700 ml-auto">/IDR</span>
              </div>
              {rate ? (
                <span className="font-mono text-[13px] font-semibold text-white tabular-nums" key={tick}>
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
