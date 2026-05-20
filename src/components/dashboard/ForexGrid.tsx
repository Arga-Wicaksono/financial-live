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
  { code: 'USD', flag: '🇺🇸', label: 'Dollar AS' },
  { code: 'EUR', flag: '🇪🇺', label: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', label: 'Poundsterling' },
  { code: 'JPY', flag: '🇯🇵', label: 'Yen' },
  { code: 'SGD', flag: '🇸🇬', label: 'Dollar SG' },
  { code: 'CHF', flag: '🇨🇭', label: 'Franc' },
  { code: 'CNY', flag: '🇨🇳', label: 'Yuan' },
  { code: 'AUD', flag: '🇦🇺', label: 'Dollar AU' },
];

// ── Component ──────────────────────────────────────────────────────────────────

export function ForexGrid() {
  const [data, setData] = useState<ForexRate[]>([]);
  const [usdIdr, setUsdIdr] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/forex');
      if (!res.ok) throw new Error();
      const json: ForexResponse = await res.json();
      setData(json.rates);
      setUsdIdr(json.base_usd_idr);
      setLoading(false);
    } catch {
      if (data.length === 0) setLoading(true);
    }
  }, [data.length]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  const rateMap = new Map(data.map(r => [r.currency, r]));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-zinc-600">
          <Activity className="w-4 h-4 animate-spin" />
          <span className="text-sm">Memuat data valas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      {/* Section title */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-bold text-emerald-500/80 tracking-widest uppercase">Valas / IDR</span>
        <span className="text-[10px] text-zinc-700">Kurs &bull; 60s</span>
      </div>

      {/* USD/IDR Hero */}
      {usdIdr > 0 && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🇺🇸</span>
            <div>
              <span className="font-bold text-white text-sm">USD / IDR</span>
              <span className="text-[10px] text-zinc-600 ml-2">Benchmark</span>
            </div>
          </div>
          <span className="font-mono text-2xl font-bold text-white tabular-nums">
            {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdIdr)}
          </span>
        </div>
      )}

      {/* Currency grid: 4 columns x 2 rows */}
      <div className="flex-1 grid grid-cols-4 grid-rows-2 gap-1.5 min-h-0">
        {CURRENCIES.filter(c => c.code !== 'USD').map(({ code, flag, label }) => {
          const rate = rateMap.get(code);
          const isJPY = code === 'JPY';
          return (
            <div
              key={code}
              className="rounded-md border border-zinc-800/30 bg-zinc-900/20 px-2.5 py-1.5 flex flex-col justify-center"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs">{flag}</span>
                <span className="text-[10px] font-bold text-zinc-400">{code}</span>
              </div>
              {rate ? (
                <span className="font-mono text-sm font-semibold text-white tabular-nums">
                  {isJPY
                    ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(rate.rate_idr)
                    : new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(rate.rate_idr)
                  }
                </span>
              ) : (
                <span className="text-xs text-zinc-700">-</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
