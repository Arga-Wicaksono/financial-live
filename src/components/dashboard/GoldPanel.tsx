'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { PriceCell } from './PriceCell';
import { Activity } from 'lucide-react';

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
      <div className="h-full flex flex-col p-3 gap-2">
        <div className="flex items-center gap-2 px-1">
          <div className="skeleton-shimmer h-3 w-20 rounded" />
          <div className="skeleton-shimmer h-2 w-12 rounded" />
        </div>
        <div className="skeleton-shimmer h-16 rounded-xl" />
        <div className="skeleton-shimmer h-16 rounded-xl" />
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
    <div className="h-full flex flex-col p-2.5 gap-2">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-yellow-500" />
          <span className="text-[11px] font-bold text-yellow-400/90 tracking-widest uppercase">Emas (XAU)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {data.data_date && <span className="text-[9px] text-zinc-700 font-mono">{data.data_date}</span>}
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 status-breathe" />
        </div>
      </div>

      {/* XAU/USD — Hero card */}
      <div className="rounded-xl px-4 py-2.5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.02) 100%)',
          border: '1px solid rgba(234, 179, 8, 0.15)',
          animation: 'pulse-glow-gold 4s ease-in-out infinite',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(234, 179, 8, 0.4), transparent)' }}
        />
        <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 font-medium">
          XAU / USD <span className="text-zinc-700 normal-case">per Troy Oz</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-sm text-yellow-500/70">$</span>
          <PriceCell value={data.xau_usd} format="currency" decimals={2} className="text-xl font-bold tabular-nums text-yellow-200" />
        </div>
      </div>

      {/* XAU/IDR */}
      <div className="rounded-xl px-4 py-2.5 relative overflow-hidden bg-zinc-900/40 border border-zinc-800/30">
        <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1 font-medium">
          XAU / IDR <span className="text-zinc-700 normal-case">per Troy Oz</span>
        </div>
        <PriceCell value={data.xau_idr} format="currency" decimals={0} className="text-lg font-bold tabular-nums" />
        <div className="flex items-center justify-between mt-1 text-[9px] text-zinc-600">
          <span>Rp {Math.round(data.xau_idr_per_gram).toLocaleString('id-ID')}/gram</span>
          {data.usd_idr > 0 && <span>Kurs Rp {data.usd_idr.toLocaleString('id-ID')}</span>}
        </div>
      </div>

      {/* Antam Estimates — Premium card */}
      <div className="flex-1 rounded-xl relative overflow-hidden flex flex-col gradient-border-gold"
        style={{
          background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.06) 0%, rgba(24, 24, 27, 0.4) 40%)',
        }}
      >
        <div className="px-4 pt-3 pb-2 flex-1 flex flex-col">
          {/* Antam header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{'\u{1FA99}'}</span>
              <span className="text-[10px] font-bold text-yellow-400/90 tracking-widest uppercase">Estimasi Antam</span>
            </div>
            <span className="text-[9px] text-zinc-600">/ gram</span>
          </div>

          {/* Jual */}
          <div className="mb-2">
            <div className="text-[9px] text-zinc-500 mb-0.5 font-medium">Harga Jual (retail)</div>
            <PriceCell value={data.antam_est_jual} format="currency" decimals={0} className="text-lg font-bold text-yellow-300 tabular-nums" />
          </div>

          {/* Separator with spread info */}
          <div className="glow-separator my-1.5" />
          <div className="flex items-center justify-between text-[8px] text-zinc-600 mb-1.5 -mt-1">
            <span>Spread ~{spreadPct.toFixed(1)}%</span>
            <span>Rp {Math.round(spread).toLocaleString('id-ID')}</span>
          </div>

          {/* Beli */}
          <div className="mb-2">
            <div className="text-[9px] text-zinc-500 mb-0.5 font-medium">Harga Beli (buyback)</div>
            <PriceCell value={data.antam_est_beli} format="currency" decimals={0} className="text-base font-bold text-emerald-400 tabular-nums" />
          </div>

          {/* Footer note */}
          <div className="mt-auto pt-1">
            <div className="text-[8px] text-zinc-700 leading-snug">
              * Estimasi spot + premium retail ~15% / buyback ~3%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
