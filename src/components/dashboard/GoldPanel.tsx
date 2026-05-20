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
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-zinc-600">
          <Activity className="w-4 h-4 animate-spin" />
          <span className="text-xs">Memuat emas...</span>
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

  if (!data) return null;

  return (
    <div className="h-full flex flex-col p-2 gap-1.5">
      {/* Section title */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] font-bold text-yellow-500/80 tracking-widest uppercase">Emas (XAU)</span>
        <span className="text-[9px] text-zinc-700">&bull; 5m</span>
        {data.data_date && (
          <span className="text-[9px] text-zinc-700">data {data.data_date}</span>
        )}
      </div>

      {/* XAU/USD */}
      <div className="rounded-lg border border-zinc-800/30 bg-zinc-900/20 px-3 py-2">
        <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">XAU / USD <span className="text-zinc-700 normal-case">per Troy Oz</span></div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs text-zinc-500">$</span>
          <PriceCell value={data.xau_usd} format="currency" decimals={2} className="text-base font-bold tabular-nums" />
        </div>
      </div>

      {/* XAU/IDR */}
      <div className="rounded-lg border border-zinc-800/30 bg-zinc-900/20 px-3 py-2">
        <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">XAU / IDR <span className="text-zinc-700 normal-case">per Troy Oz</span></div>
        <PriceCell value={data.xau_idr} format="currency" decimals={0} className="text-sm font-bold tabular-nums" />
        <div className="text-[9px] text-zinc-700 mt-0.5">
          Rp {Math.round(data.xau_idr_per_gram).toLocaleString('id-ID')}/gram
          {data.usd_idr > 0 && <> &bull; Kurs Rp {data.usd_idr.toLocaleString('id-ID')}/USD</>}
        </div>
      </div>

      {/* Antam Estimates — clearly labeled */}
      <div className="flex-1 rounded-lg border border-yellow-500/15 bg-gradient-to-b from-yellow-500/8 to-transparent px-3 py-2 flex flex-col justify-between">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-xs">{'\u{1FA99}'}</span>
          <span className="text-[10px] font-bold text-yellow-500/90 tracking-widest uppercase">Estimasi Antam / Gram</span>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-1.5">
          {/* Jual */}
          <div>
            <div className="text-[9px] text-zinc-500 mb-0.5">Est. Harga Jual (retail)</div>
            <PriceCell value={data.antam_est_jual} format="currency" decimals={0} className="text-sm font-bold text-yellow-400 tabular-nums" />
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800/30" />

          {/* Beli */}
          <div>
            <div className="text-[9px] text-zinc-500 mb-0.5">Est. Harga Beli (buyback)</div>
            <PriceCell value={data.antam_est_beli} format="currency" decimals={0} className="text-sm font-bold text-emerald-400 tabular-nums" />
          </div>
        </div>

        <div className="text-[8px] text-zinc-700 mt-1.5 leading-snug">
          * Estimasi dari spot + premium retail ~15% / buyback ~3%
        </div>
      </div>
    </div>
  );
}
