'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { PriceCell } from './PriceCell';
import { Activity } from 'lucide-react';

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
  source: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function GoldPanel() {
  const [data, setData] = useState<GoldResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/gold');
      if (!res.ok) throw new Error();
      const json: GoldResponse = await res.json();
      setData(json);
      setLoading(false);
    } catch {
      if (!data) setLoading(true);
    }
  }, [data]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 300_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-zinc-600">
          <Activity className="w-4 h-4 animate-spin" />
          <span className="text-sm">Memuat emas...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      {/* Section title */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-bold text-yellow-500/80 tracking-widest uppercase">Emas / IDR</span>
        <span className="text-[10px] text-zinc-700">&bull; 5m</span>
      </div>

      {/* XAU/USD */}
      <div className="rounded-lg border border-zinc-800/30 bg-zinc-900/20 px-4 py-2.5">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">XAU / USD <span className="text-zinc-700 normal-case">per Troy Oz</span></div>
        <div className="flex items-baseline gap-1">
          <span className="text-sm text-zinc-500">$</span>
          <PriceCell value={data.xau_usd} format="currency" decimals={2} className="text-xl font-bold tabular-nums" />
        </div>
      </div>

      {/* XAU/IDR */}
      <div className="rounded-lg border border-zinc-800/30 bg-zinc-900/20 px-4 py-2.5">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">XAU / IDR <span className="text-zinc-700 normal-case">per Troy Oz</span></div>
        <PriceCell value={data.xau_idr} format="currency" decimals={0} className="text-lg font-bold tabular-nums" />
        <div className="text-[10px] text-zinc-700 mt-0.5">Kurs Rp {data.usd_idr_used.toLocaleString('id-ID')}/USD</div>
      </div>

      {/* Antam Section — Highlighted */}
      <div className="flex-1 rounded-lg border border-yellow-500/15 bg-gradient-to-b from-yellow-500/8 to-transparent px-4 py-3 flex flex-col justify-between">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm">🪙</span>
          <span className="text-[11px] font-bold text-yellow-500/90 tracking-widest uppercase">Antam / Gram</span>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-2">
          {/* Jual */}
          <div>
            <div className="text-[10px] text-zinc-500 mb-0.5">Harga Jual (Retail)</div>
            <PriceCell value={data.antam_per_gram} format="currency" decimals={0} className="text-xl font-bold text-yellow-400 tabular-nums" />
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800/30" />

          {/* Beli */}
          <div>
            <div className="text-[10px] text-zinc-500 mb-0.5">Harga Beli (Buyback)</div>
            <PriceCell value={data.antam_buyback_per_gram} format="currency" decimals={0} className="text-lg font-bold text-emerald-400 tabular-nums" />
          </div>
        </div>

        <div className="text-[9px] text-zinc-700 mt-2 leading-snug">
          * Estimasi spot + premium ~15%
        </div>
      </div>
    </div>
  );
}
