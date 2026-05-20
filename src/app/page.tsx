'use client';

import { useState, useEffect, useRef } from 'react';
import { CryptoCards } from '@/components/dashboard/CryptoCards';
import { ForexGrid } from '@/components/dashboard/ForexGrid';
import { GoldPanel } from '@/components/dashboard/GoldPanel';
import { Activity } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TickerItem {
  name: string;
  price: number;
  change_pct: number;
  isUp: boolean;
}

// ── Live Clock ─────────────────────────────────────────────────────────────────

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
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 live-dot-pulse" />
      </span>
      <span className="text-[10px] font-bold text-green-400 tracking-[0.2em] uppercase">Live</span>
      <span className="font-mono text-xl font-bold text-white tabular-nums tracking-[0.15em]">{time}</span>
      <span className="text-[11px] font-medium text-zinc-500 tracking-wide">{dateStr}</span>
      <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded font-mono">WIB</span>
    </div>
  );
}

// ── Ticker Tape ────────────────────────────────────────────────────────────────

function TickerTape() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function fetchTicker() {
      try {
        const res = await fetch('/api/market/crypto');
        if (!res.ok) return;
        const json = await res.json();
        if (!json.data) return;
        const mapped: TickerItem[] = json.data.map((d: { name: string; last: number; change_pct: number }) => ({
          name: d.name,
          price: d.last,
          change_pct: d.change_pct,
          isUp: d.change_pct >= 0,
        }));
        setItems(mapped);
      } catch { /* ignore */ }
    }
    fetchTicker();
    ref.current = setInterval(fetchTicker, 15_000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  if (items.length === 0) return null;

  const content = items.map(item => (
    <span key={item.name} className="inline-flex items-center gap-2 px-4 whitespace-nowrap">
      <span className="font-bold text-zinc-300 text-[11px]">{item.name}/IDR</span>
      <span className="font-mono text-white text-[11px] tabular-nums font-semibold">
        {new Intl.NumberFormat('id-ID').format(item.price)}
      </span>
      <span className={`text-[10px] font-bold tabular-nums ${item.isUp ? 'text-green-400' : 'text-red-400'}`}>
        {item.isUp ? '\u25B2' : '\u25BC'} {item.isUp ? '+' : ''}{item.change_pct.toFixed(2)}%
      </span>
    </span>
  ));

  return (
    <div className="overflow-hidden h-7 flex items-center bg-[#08080a] border-b border-zinc-800/30 shrink-0">
      <div className="flex animate-ticker">
        {content}
        {content} {/* Duplicate for seamless loop */}
      </div>
    </div>
  );
}

// ── Status Indicators ──────────────────────────────────────────────────────────

function StatusPills() {
  return (
    <div className="flex items-center gap-1.5">
      {[
        { label: 'CRYPTO', color: 'bg-amber-500', delay: '0s' },
        { label: 'VALAS', color: 'bg-emerald-500', delay: '0.5s' },
        { label: 'EMAS', color: 'bg-yellow-500', delay: '1s' },
      ].map(({ label, color, delay }) => (
        <div key={label} className={`flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/40 border border-zinc-800/30`}>
          <span className={`w-1.5 h-1.5 rounded-full ${color} status-breathe`} style={{ animationDelay: delay }} />
          <span className="text-[8px] text-zinc-500 font-bold tracking-wider">{label}</span>
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
    <div className={`h-screen w-screen flex flex-col overflow-hidden dashboard-grid-bg ${showFullscreen ? 'fixed inset-0 z-50' : ''}`}
      style={{ backgroundColor: '#09090b' }}>

      {/* ── Ticker Tape (animated scrolling crypto prices) ──────────────────── */}
      <TickerTape />

      {/* ── Top Bar: Logo + Clock + Status ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: 'rgba(12, 12, 14, 0.95)' }}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-zinc-200 tracking-[0.15em] uppercase">Market Dashboard</h1>
            <p className="text-[8px] text-zinc-600 tracking-wider">REAL-TIME INDONESIAN MARKET</p>
          </div>
          <StatusPills />
        </div>
        <LiveClock />
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 p-1.5 gap-1.5">

        {/* Row 1: Crypto (55%) */}
        <div className="flex-[55] min-h-0 rounded-xl overflow-hidden gradient-border-amber"
          style={{ background: 'rgba(10, 10, 12, 0.8)' }}>
          <CryptoCards />
        </div>

        {/* Glow separator */}
        <div className="glow-separator shrink-0" />

        {/* Row 2: Forex + Gold (45%) */}
        <div className="flex-[45] min-h-0 flex gap-1.5">
          {/* Forex (60%) */}
          <div className="flex-[60] min-h-0 rounded-xl overflow-hidden gradient-border-emerald"
            style={{ background: 'rgba(10, 10, 12, 0.8)' }}>
            <ForexGrid />
          </div>
          {/* Gold (40%) */}
          <div className="flex-[40] min-h-0 rounded-xl overflow-hidden"
            style={{ background: 'rgba(10, 10, 12, 0.8)' }}>
            <GoldPanel />
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-1 shrink-0 bg-[#0c0c0e] border-t border-zinc-800/30 text-[9px] text-zinc-700">
        <span>Indodax &bull; ExchangeRate-API &bull; fawazahmed0/currency-api</span>
        <span className="flex items-center gap-3">
          <span>Crypto 10s &bull; Valas 60s &bull; Emas 5m</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-600">Press <kbd className="px-1 py-0.5 bg-zinc-800/50 rounded text-[8px] text-zinc-500 font-mono">F</kbd> fullscreen</span>
        </span>
      </div>
    </div>
  );
}
