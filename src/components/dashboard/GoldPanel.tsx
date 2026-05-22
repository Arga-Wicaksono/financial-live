'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { SectionHeader } from './SectionHeader';

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
        <div className="skeleton-shimmer h-14 rounded-lg" />
        <div className="skeleton-shimmer h-14 rounded-lg" />
        <div className="flex-1 skeleton-shimmer rounded-lg" />
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
    <div className="h-full flex flex-col p-3 gap-1.5">
      <SectionHeader color="bg-yellow-500" title="Emas (XAU)" interval="5m" />

      {/* XAU/USD Hero */}
      <div className="rounded-lg px-3 py-2 shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.02) 100%)',
          border: '1px solid rgba(234, 179, 8, 0.12)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">XAU / USD <span className="text-zinc-700 normal-case">per Troy Oz</span></div>
          </div>
          <div className="flex items-baseline gap-0.5 shrink-0 ml-2">
            <span className="text-xs text-yellow-500/70">$</span>
            <span className="font-mono text-sm font-bold tabular-nums text-yellow-200">
              {data.xau_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* XAU/IDR */}
      <div className="rounded-lg px-3 py-2 bg-zinc-900/40 border border-zinc-800/25 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">XAU / IDR</div>
            <div className="font-mono text-sm font-bold tabular-nums text-white mt-0.5">
              {data.xau_idr.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-zinc-600">per gram</div>
            <div className="text-xs text-zinc-400 tabular-nums font-medium">
              Rp {Math.round(data.xau_idr_per_gram).toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Antam Estimates */}
      <div className="flex-1 rounded-lg flex flex-col gradient-border-gold min-h-0"
        style={{ background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.05) 0%, rgba(24, 24, 27, 0.4) 40%)' }}
      >
        <div className="px-3 py-2 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{'\u{1FA99}'}</span>
              <span className="text-[10px] font-bold text-yellow-400/90 tracking-widest uppercase">Estimasi Antam</span>
            </div>
            <span className="text-[10px] text-zinc-600">/ gram</span>
          </div>

          {/* Jual */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-500 shrink-0">Jual (retail)</span>
            <span className="font-mono text-sm font-bold text-yellow-300 tabular-nums shrink-0">
              {data.antam_est_jual.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Spread */}
          <div className="flex items-center justify-between text-[10px] text-zinc-600 py-0.5">
            <span>Spread ~{spreadPct.toFixed(1)}%</span>
            <span>Rp {Math.round(spread).toLocaleString('id-ID')}</span>
          </div>

          {/* Beli */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-500 shrink-0">Beli (buyback)</span>
            <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums shrink-0">
              {data.antam_est_beli.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="mt-auto">
            <div className="text-[10px] text-zinc-700">* spot + premium retail ~15% / buyback ~3%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
