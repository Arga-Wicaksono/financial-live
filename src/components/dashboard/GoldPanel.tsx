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

      if (!json || json.xau_usd === 0) {
        throw new Error('Invalid gold data');
      }

      setData(json);
      setLoading(false);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('GoldPanel fetch error:', err);
      if (!hasLoadedRef.current) {
        setError('Gagal memuat data emas');
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 300_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  if (loading && !error) {
    return (
      <div className="h-full flex flex-col p-2 gap-1.5">
        <div className="skeleton-shimmer h-3 w-20 rounded" />
        <div className="skeleton-shimmer h-14 rounded-xl" />
        <div className="skeleton-shimmer h-14 rounded-xl" />
        <div className="flex-1 skeleton-shimmer rounded-xl" />
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

  if (!data) return null;

  const spread = data.antam_est_jual - data.antam_est_beli;
  const spreadPct = data.antam_est_jual > 0 ? (spread / data.antam_est_jual * 100) : 0;

  return (
    <div className="h-full flex flex-col p-2 gap-1.5">
      {/* Section header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-4 rounded-full bg-yellow-500" />
          <span className="text-[10px] font-bold text-yellow-400/90 tracking-widest uppercase">Emas (XAU)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {data.data_date && <span className="text-[8px] text-zinc-700 font-mono">{data.data_date}</span>}
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 status-breathe" />
        </div>
      </div>

      {/* XAU/USD — Hero card */}
      <div className="rounded-lg px-3 py-2 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.02) 100%)',
          border: '1px solid rgba(234, 179, 8, 0.15)',
          animation: 'pulse-glow-gold 4s ease-in-out infinite',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-medium">XAU / USD</div>
            <div className="text-[8px] text-zinc-600">per Troy Oz</div>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs text-yellow-500/70">$</span>
            <PriceCell value={data.xau_usd} format="currency" decimals={2} className="text-base font-bold tabular-nums text-yellow-200" />
          </div>
        </div>
      </div>

      {/* XAU/IDR */}
      <div className="rounded-lg px-3 py-2 bg-zinc-900/40 border border-zinc-800/30">
        <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-medium">XAU / IDR</div>
        <PriceCell value={data.xau_idr} format="currency" decimals={0} className="text-sm font-bold tabular-nums" />
        <div className="flex items-center justify-between mt-0.5 text-[8px] text-zinc-600">
          <span>Rp {Math.round(data.xau_idr_per_gram).toLocaleString('id-ID')}/gram</span>
          {data.usd_idr > 0 && <span>Kurs Rp {data.usd_idr.toLocaleString('id-ID')}</span>}
        </div>
      </div>

      {/* Antam Estimates */}
      <div className="flex-1 rounded-lg relative overflow-hidden flex flex-col gradient-border-gold min-h-0"
        style={{ background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.06) 0%, rgba(24, 24, 27, 0.4) 40%)' }}
      >
        <div className="px-3 pt-2 pb-1.5 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <span className="text-xs">{'\u{1FA99}'}</span>
              <span className="text-[9px] font-bold text-yellow-400/90 tracking-widest uppercase">Estimasi Antam</span>
            </div>
            <span className="text-[8px] text-zinc-600">/ gram</span>
          </div>

          {/* Jual */}
          <div className="mb-1">
            <div className="text-[8px] text-zinc-500 mb-0.5 font-medium">Harga Jual (retail)</div>
            <PriceCell value={data.antam_est_jual} format="currency" decimals={0} className="text-sm font-bold text-yellow-300 tabular-nums" />
          </div>

          {/* Spread */}
          <div className="flex items-center justify-between text-[7px] text-zinc-600 my-1">
            <span>Spread ~{spreadPct.toFixed(1)}%</span>
            <span>Rp {Math.round(spread).toLocaleString('id-ID')}</span>
          </div>

          {/* Beli */}
          <div className="mb-1">
            <div className="text-[8px] text-zinc-500 mb-0.5 font-medium">Harga Beli (buyback)</div>
            <PriceCell value={data.antam_est_beli} format="currency" decimals={0} className="text-sm font-bold text-emerald-400 tabular-nums" />
          </div>

          {/* Footer */}
          <div className="mt-auto">
            <div className="text-[7px] text-zinc-700 leading-snug">
              * Estimasi spot + premium retail ~15% / buyback ~3%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
