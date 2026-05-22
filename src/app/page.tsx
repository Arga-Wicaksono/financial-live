'use client';

import { useState, useEffect, useRef } from 'react';
import { CryptoCards } from '@/components/dashboard/CryptoCards';
import { ForexGrid } from '@/components/dashboard/ForexGrid';
import { GoldPanel } from '@/components/dashboard/GoldPanel';
import { StocksPanel } from '@/components/dashboard/StocksPanel';
import { GlobalIndices } from '@/components/dashboard/GlobalIndices';
import { CommoditiesGrid } from '@/components/dashboard/CommoditiesGrid';
import { SentimentBar } from '@/components/dashboard/SentimentBar';
import { NewsTicker } from '@/components/dashboard/NewsTicker';
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
      const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
      setDateStr(`${days[wib.getDay()]}, ${wib.getDate()} ${months[wib.getMonth()]} ${wib.getFullYear()}`);
    }
    update();
    ref.current = setInterval(update, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500 live-dot-pulse" />
      </span>
      <span className="text-xs font-bold text-green-400 tracking-[0.2em] uppercase">Live</span>
      <span className="font-mono text-2xl font-bold text-white tabular-nums tracking-[0.12em]">{time}</span>
      <span className="text-xs font-medium text-zinc-500 tracking-wide">{dateStr}</span>
      <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded font-mono">WIB</span>
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
    <span key={item.name} className="inline-flex items-center gap-2 px-5 whitespace-nowrap">
      <span className="font-bold text-zinc-400 text-sm">{item.name}/IDR</span>
      <span className="font-mono text-white text-sm tabular-nums font-semibold">
        {new Intl.NumberFormat('id-ID').format(item.price)}
      </span>
      <span className={`text-xs font-bold tabular-nums ${item.isUp ? 'text-green-400' : 'text-red-400'}`}>
        {item.isUp ? '\u25B2' : '\u25BC'} {item.isUp ? '+' : ''}{item.change_pct.toFixed(2)}%
      </span>
    </span>
  ));

  return (
    <div className="overflow-hidden h-8 flex items-center bg-[#08080a] border-b border-zinc-800/30 shrink-0">
      <div className="flex animate-ticker">
        {content}
        {content}
      </div>
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
    /* ── Outer: fills viewport, centers the 16:9 canvas with black letterbox ── */
    <div className={`w-screen h-screen flex items-center justify-center overflow-hidden bg-black ${showFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div
        className="flex flex-col overflow-hidden dashboard-grid-bg relative"
        style={{
          width: '177.78vh',
          maxWidth: '100vw',
          height: '56.25vw',
          maxHeight: '100vh',
          backgroundColor: '#09090b',
        }}
      >
        {/* ── Ticker Tape (thin) ──────────────────────────────────────────── */}
        <TickerTape />

        {/* ── Top Bar: Logo + Sentiment + Clock (merged) ──────────────────── */}
        <div className="flex items-center justify-between px-5 py-1.5 shrink-0" style={{ background: 'rgba(12, 12, 14, 0.95)' }}>
          {/* Left: Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-500/20 to-cyan-500/10 border border-amber-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="text-sm font-bold text-zinc-200 tracking-[0.12em] uppercase">Market Dashboard</h1>
            <div className="w-px h-5 bg-zinc-800" />
            {/* Sentiment bar inline */}
            <SentimentBar />
          </div>
          {/* Right: Clock */}
          <LiveClock />
        </div>

        {/* ── Main Content (3 rows, no separators) ────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 px-2 pt-1.5 pb-1.5 gap-1.5">

          {/* ═══ ROW 1: Crypto (26%) ═══ */}
          <div className="flex-[26] min-h-0 rounded-lg overflow-hidden gradient-border-amber"
            style={{ background: 'rgba(10, 10, 12, 0.8)' }}>
            <CryptoCards />
          </div>

          {/* ═══ ROW 2: Stocks + Forex + Gold (44%) ═══ */}
          <div className="flex-[44] min-h-0 flex gap-1">
            <div className="flex-[38] min-h-0 rounded-lg overflow-hidden"
              style={{ background: 'rgba(10, 10, 12, 0.8)', border: '1px solid rgba(6, 182, 212, 0.12)' }}>
              <StocksPanel />
            </div>
            <div className="flex-[35] min-h-0 rounded-lg overflow-hidden gradient-border-emerald"
              style={{ background: 'rgba(10, 10, 12, 0.8)' }}>
              <ForexGrid />
            </div>
            <div className="flex-[27] min-h-0 rounded-lg overflow-hidden"
              style={{ background: 'rgba(10, 10, 12, 0.8)', border: '1px solid rgba(234, 179, 8, 0.12)' }}>
              <GoldPanel />
            </div>
          </div>

          {/* ═══ ROW 3: Global Indices + Commodities (30%) ═══ */}
          <div className="flex-[30] min-h-0 flex gap-1">
            <div className="flex-1 min-h-0 rounded-lg overflow-hidden"
              style={{ background: 'rgba(10, 10, 12, 0.8)', border: '1px solid rgba(59, 130, 246, 0.12)' }}>
              <GlobalIndices />
            </div>
            <div className="flex-1 min-h-0 rounded-lg overflow-hidden"
              style={{ background: 'rgba(10, 10, 12, 0.8)', border: '1px solid rgba(249, 115, 22, 0.12)' }}>
              <CommoditiesGrid />
            </div>
          </div>
        </div>

        {/* ── News Ticker ─────────────────────────────────────────────────── */}
        <NewsTicker />

        {/* ── Bottom Bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-1 shrink-0 bg-[#0c0c0e] border-t border-zinc-800/30 text-[10px] text-zinc-700">
          <span>Indodax &bull; Yahoo Finance &bull; ExchangeRate-API &bull; fawazahmed0 &bull; alternative.me</span>
          <span className="flex items-center gap-2">
            <span>Crypto 10s &bull; Saham/Valas/Global 60s &bull; Emas 5m &bull; News 2m</span>
            <span className="text-zinc-800">|</span>
            <span className="text-zinc-600">Press <kbd className="px-1.5 py-0.5 bg-zinc-800/50 rounded text-[9px] text-zinc-500 font-mono">F</kbd> fullscreen</span>
          </span>
        </div>
      </div>
    </div>
  );
}
