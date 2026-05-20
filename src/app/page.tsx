'use client';

import { useState, useEffect, useRef } from 'react';
import { CryptoCards } from '@/components/dashboard/CryptoCards';
import { ForexGrid } from '@/components/dashboard/ForexGrid';
import { GoldPanel } from '@/components/dashboard/GoldPanel';
import { Zap } from 'lucide-react';

// ── Clock (inline, compact) ───────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function update() {
      const wib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      setTime(
        `${String(wib.getHours()).padStart(2, '0')}:${String(wib.getMinutes()).padStart(2, '0')}:${String(wib.getSeconds()).padStart(2, '0')}`
      );
      const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
      setDateStr(`${days[wib.getDay()]}, ${String(wib.getDate()).padStart(2, '0')} ${months[wib.getMonth()]} ${wib.getFullYear()}`);
    }
    update();
    ref.current = setInterval(update, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      <span className="text-[10px] font-bold text-green-400 tracking-wider">LIVE</span>
      <span className="text-zinc-700">|</span>
      <span className="font-mono text-lg font-bold text-white tabular-nums tracking-widest">{time}</span>
      <span className="text-zinc-700">|</span>
      <span className="text-[11px] font-medium text-zinc-500 tracking-wide">{dateStr}</span>
      <span className="text-zinc-700">|</span>
      <span className="text-[11px] font-medium text-zinc-600">WIB</span>
    </div>
  );
}

// ── Status Dots ───────────────────────────────────────────────────────────────

function StatusDots() {
  return (
    <div className="flex items-center gap-2">
      {[
        { label: 'CRYPTO', color: 'bg-amber-500' },
        { label: 'VALAS', color: 'bg-emerald-500' },
        { label: 'EMAS', color: 'bg-yellow-500' },
      ].map(({ label, color }) => (
        <div key={label} className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
          <span className="text-[9px] text-zinc-600 font-semibold tracking-wider">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function TradingDashboard() {
  const [showFullscreen, setShowFullscreen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'f' || e.key === 'F') setShowFullscreen(prev => !prev);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className={`h-screen w-screen bg-[#09090b] flex flex-col overflow-hidden ${showFullscreen ? 'fixed inset-0 z-50' : ''}`}>

      {/* ── Top Bar: Title + Clock + Status ────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0c0c0e] border-b border-zinc-800/50 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <h1 className="text-xs font-bold text-zinc-300 tracking-widest uppercase">Market Dashboard</h1>
          <StatusDots />
        </div>
        <LiveClock />
      </div>

      {/* ── Main Content: fills remaining space, no scroll ──────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 p-2 gap-2">

        {/* Row 1: Crypto Cards (55% of space) */}
        <div className="flex-[55] min-h-0 rounded-xl border border-zinc-800/30 bg-[#0a0a0c] overflow-hidden">
          <CryptoCards />
        </div>

        {/* Row 2: Forex + Gold side by side (45% of space) */}
        <div className="flex-[45] min-h-0 flex gap-2">
          {/* Forex (60% width) */}
          <div className="flex-[60] min-h-0 rounded-xl border border-zinc-800/30 bg-[#0a0a0c] overflow-hidden">
            <ForexGrid />
          </div>
          {/* Gold (40% width) */}
          <div className="flex-[40] min-h-0 rounded-xl border border-zinc-800/30 bg-[#0a0a0c] overflow-hidden">
            <GoldPanel />
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#0c0c0e] border-t border-zinc-800/50 text-[9px] text-zinc-700 shrink-0">
        <span>Indodax &bull; ExchangeRate-API &bull; MetalPriceAPI</span>
        <span>Crypto 10s &bull; Valas 60s &bull; Emas 5m &bull; Press F fullscreen</span>
      </div>
    </div>
  );
}
