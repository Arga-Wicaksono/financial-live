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
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-zinc-600">
          <Activity className="w-4 h-4 animate-spin" />
          <span className="text-xs">Memuat data valas...</span>
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
    <div className="h-full flex flex-col p-2 gap-1.5">
      {/* Section title */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] font-bold text-emerald-500/80 tracking-widest uppercase">Valas / IDR</span>
        <span className="text-[9px] text-zinc-700">Kurs &bull; 60s</span>
      </div>

      {/* USD/IDR Hero */}
      {usdIdr > 0 && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{'\u{1F1FA}\u{1F1F8}'}</span>
            <div>
              <span className="font-bold text-white text-xs">USD / IDR</span>
              <span className="text-[9px] text-zinc-600 ml-1.5">Benchmark</span>
            </div>
          </div>
          <span className="font-mono text-lg font-bold text-white tabular-nums">
            {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdIdr)}
          </span>
        </div>
      )}

      {/* Currency grid: 4 columns x 2 rows */}
      <div className="flex-1 grid grid-cols-4 grid-rows-2 gap-1.5 min-h-0">
        {CURRENCIES.filter(c => c.code !== 'USD').map(({ code, flag, label }) => {
          const rate = rateMap.get(code);
          return (
            <div
              key={code}
              className="rounded-md border border-zinc-800/30 bg-zinc-900/20 px-2 py-1.5 flex flex-col justify-center"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs">{flag}</span>
                <span className="text-[10px] font-bold text-zinc-400">{code}</span>
              </div>
              {rate ? (
                <span className="font-mono text-xs font-semibold text-white tabular-nums">
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
