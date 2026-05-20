'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { PriceCell } from './PriceCell';
import { DollarSign, Activity } from 'lucide-react';

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
  cached_at: number | null;
}

// ── Currency flags (emoji) ────────────────────────────────────────────────────

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  SGD: '🇸🇬',
  CHF: '🇨🇭',
  CNY: '🇨🇳',
  AUD: '🇦🇺',
};

// ── Component ──────────────────────────────────────────────────────────────────

export function ForexTable() {
  const [data, setData] = useState<ForexRate[]>([]);
  const [usdIdr, setUsdIdr] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/forex');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ForexResponse = await res.json();
      setData(json.rates);
      setUsdIdr(json.base_usd_idr);
      setStale(json.stale);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Forex fetch error:', err);
      if (data.length === 0) {
        setError('Gagal memuat data valas');
      }
      setStale(true);
    }
  }, [data.length]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60_000); // refresh every 60s
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/10">
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">VALAS / IDR</h2>
            <p className="text-[10px] text-zinc-600">Kurs Uang Asing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stale && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
              STALE
            </span>
          )}
          <span className="text-[9px] text-zinc-600 font-mono">
            60s refresh
          </span>
        </div>
      </div>

      {/* USD/IDR Banner */}
      {usdIdr > 0 && (
        <div className="mx-4 mt-3 mb-2 px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/10">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-1">
            USD / IDR — Benchmark
          </div>
          <PriceCell value={usdIdr} format="currency" decimals={2} className="text-lg font-bold" />
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="flex items-center gap-2 text-zinc-600">
              <Activity className="w-4 h-4 animate-spin" />
              <span className="text-xs">Memuat data...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-24">
            <span className="text-xs text-red-400">{error}</span>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
                <th className="text-left px-4 py-2 font-medium">Mata Uang</th>
                <th className="text-right px-3 py-2 font-medium">Kurs (IDR)</th>
                <th className="text-right px-4 py-2 font-medium hidden sm:table-cell">Rate (USD)</th>
              </tr>
            </thead>
            <tbody>
              {data.filter(r => r.currency !== 'USD').map((item, idx) => (
                <tr
                  key={item.currency}
                  className={`border-t border-zinc-800/40 hover:bg-zinc-800/20 transition-colors ${
                    idx % 2 === 0 ? 'bg-zinc-900/20' : ''
                  }`}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{CURRENCY_FLAGS[item.currency] || '🌍'}</span>
                      <div>
                        <span className="font-bold text-white">{item.currency}</span>
                        <span className="text-zinc-600 font-normal">/IDR</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2">
                    <PriceCell
                      value={item.rate_idr}
                      format="currency"
                      decimals={item.currency === 'JPY' ? 0 : 2}
                      className="font-semibold text-xs"
                    />
                  </td>
                  <td className="text-right px-4 py-2 hidden sm:table-cell">
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {item.rate_usd.toFixed(4)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
