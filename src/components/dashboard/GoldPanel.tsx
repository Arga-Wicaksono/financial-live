'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { PriceCell } from './PriceCell';

// ── Types ──────────────────────────────────────────────────────────────────────

interface GoldResponse {
  xau_usd: number;
  xau_idr: number;
  xau_idr_per_gram: number;
  antam_est_jual: number;
  antam_est_beli: number;
  usd_idr: number;
  data_date: string;
  source: string;
  timestamp: number;
  stale: boolean;
  cached_at: number | null;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function GoldPanel() {
  const [data, setData] = useState<GoldResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/gold');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: GoldResponse = await res.json();
      if (!json || json.xau_usd === 0) throw new Error('Invalid gold data');
      setData(json);
      setLoading(false);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('GoldPanel fetch error:', err);
      if (!hasLoadedRef.current) setError('Gagal memuat data emas');
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 300_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  if (loading && !error) {
    return (
      <div className="h-full flex flex-col p-3 gap-2">
        <div className="skeleton-shimmer h-3 w-24 rounded" />
        <div className="skeleton-shimmer h-14 rounded-md" />
        <div className="skeleton-shimmer h-14 rounded-md" />
        <div className="flex-1 skeleton-shimmer rounded-md" />
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

  if (!data) return null;

  const spread = data.antam_est_jual - data.antam_est_beli;
  const spreadPct = data.antam_est_jual > 0 ? (spread / data.antam_est_jual * 100) : 0;

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-yellow-500" />
          <span className="text-sm font-bold text-yellow-400/90 tracking-widest uppercase">Emas (XAU)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {data.data_date && <span className="text-xs text-zinc-700 font-mono">{data.data_date}</span>}
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 status-breathe" />
        </div>
      </div>

      {/* XAU/USD Hero */}
      <div className="rounded-md px-3 py-2 shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.02) 100%)',
          border: '1px solid rgba(234, 179, 8, 0.12)',
          animation: 'pulse-glow-gold 4s ease-in-out infinite',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">XAU / USD <span className="text-zinc-700 normal-case">per Troy Oz</span></div>
          <div className="flex items-baseline gap-0.5 shrink-0">
            <span className="text-sm text-yellow-500/70">$</span>
            <PriceCell value={data.xau_usd} format="currency" decimals={2} className="text-lg font-bold tabular-nums text-yellow-200" />
          </div>
        </div>
      </div>

      {/* XAU/IDR */}
      <div className="rounded-md px-3 py-2 bg-zinc-900/40 border border-zinc-800/25 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">XAU / IDR</div>
            <PriceCell value={data.xau_idr} format="currency" decimals={0} className="text-lg font-bold tabular-nums !px-0 !py-0" />
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-zinc-600">per gram</div>
            <div className="text-sm text-zinc-400 tabular-nums font-medium">
              Rp {Math.round(data.xau_idr_per_gram).toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Antam Estimates */}
      <div className="flex-1 rounded-md flex flex-col gradient-border-gold min-h-0"
        style={{ background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.05) 0%, rgba(24, 24, 27, 0.4) 40%)' }}
      >
        <div className="px-3 pt-2 pb-1 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{'\u{1FA99}'}</span>
              <span className="text-xs font-bold text-yellow-400/90 tracking-widest uppercase">Estimasi Antam</span>
            </div>
            <span className="text-xs text-zinc-600">/ gram</span>
          </div>

          {/* Jual */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500 shrink-0">Jual (retail)</span>
            <PriceCell value={data.antam_est_jual} format="currency" decimals={0} className="text-lg font-bold text-yellow-300 tabular-nums !px-0 !py-0 shrink-0 pl-2" />
          </div>

          {/* Spread line */}
          <div className="flex items-center justify-between text-xs text-zinc-600 py-0.5">
            <span>Spread ~{spreadPct.toFixed(1)}%</span>
            <span>Rp {Math.round(spread).toLocaleString('id-ID')}</span>
          </div>

          {/* Beli */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500 shrink-0">Beli (buyback)</span>
            <PriceCell value={data.antam_est_beli} format="currency" decimals={0} className="text-lg font-bold text-emerald-400 tabular-nums !px-0 !py-0 shrink-0 pl-2" />
          </div>

          <div className="mt-auto">
            <div className="text-[10px] text-zinc-700">* spot + premium retail ~15% / buyback ~3%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
