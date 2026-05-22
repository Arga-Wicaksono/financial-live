'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { PriceCell } from './PriceCell';
import { Gem, Activity } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface GoldResponse {
  xau_usd: number;
  xau_idr: number;
  antam_per_gram: number;
  antam_buyback_per_gram: number;
  xau_idr_per_gram: number;
  usd_idr_used: number;
  timestamp: number;
  stale: boolean;
  cached_at: number | null;
  source: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function GoldCard() {
  const [data, setData] = useState<GoldResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/gold');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: GoldResponse = await res.json();
      setData(json);
      setStale(json.stale);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Gold fetch error:', err);
      if (!data) {
        setError('Gagal memuat data emas');
      }
      setStale(true);
    }
  }, [data]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 300_000); // refresh every 5min
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-yellow-500/10">
            <Gem className="w-4 h-4 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">EMAS</h2>
            <p className="text-[10px] text-zinc-600">Harga Logam Mulia</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stale && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
              STALE
            </span>
          )}
          <span className="text-[9px] text-zinc-600 font-mono">
            5m refresh
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-3">
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
        ) : data ? (
          <div className="flex flex-col gap-3">
            {/* XAU/USD */}
            <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/50 p-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-1">
                XAU / USD (per Troy Oz)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">$</span>
                <PriceCell value={data.xau_usd} format="currency" decimals={2} className="text-lg font-bold" />
              </div>
            </div>

            {/* XAU/IDR */}
            <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/50 p-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-1">
                XAU / IDR (per Troy Oz)
              </div>
              <PriceCell value={data.xau_idr} format="currency" decimals={0} className="text-base font-bold" />
              <div className="text-[10px] text-zinc-600 mt-1">
                Kurs: Rp {data.usd_idr_used.toLocaleString('id-ID')}/USD
              </div>
            </div>

            {/* Antam per gram */}
            <div className="rounded-lg bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/10 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm">🪙</span>
                <span className="text-[10px] text-yellow-500/80 uppercase tracking-wider font-bold">
                  Harga Antam / Gram (Estimasi)
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-zinc-500 mb-0.5">Jual (Retail)</div>
                  <PriceCell value={data.antam_per_gram} format="currency" decimals={0} className="text-lg font-bold text-yellow-400" />
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 mb-0.5">Beli (Buyback)</div>
                  <PriceCell value={data.antam_buyback_per_gram} format="currency" decimals={0} className="text-base font-bold text-emerald-400" />
                </div>
              </div>
              <div className="text-[9px] text-zinc-700 mt-2 leading-tight">
                * Estimasi berdasarkan harga spot + premium Antam ~15%. Harga resmi Antam bisa berbeda.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
