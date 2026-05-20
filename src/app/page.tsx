'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ClockWIB } from '@/components/dashboard/ClockWIB';
import { CryptoTable } from '@/components/dashboard/CryptoTable';
import { ForexTable } from '@/components/dashboard/ForexTable';
import { GoldCard } from '@/components/dashboard/GoldCard';
import { Wifi, WifiOff, RefreshCw, BarChart3, Radio } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TickerData {
  pair: string;
  name: string;
  last: number;
  change_pct: number;
}

// ── Ticker Tape Component ──────────────────────────────────────────────────────

function TickerTape({ data }: { data: TickerData[] }) {
  if (data.length === 0) return null;

  const doubled = [...data, ...data]; // duplicate for seamless loop

  return (
    <div className="w-full overflow-hidden border-y border-zinc-800/60 bg-zinc-900/40">
      <div className="flex animate-ticker whitespace-nowrap">
        {doubled.map((item, idx) => (
          <span key={`${item.pair}-${idx}`} className="inline-flex items-center gap-2 px-4 py-1.5 text-[11px]">
            <span className="font-bold text-zinc-300">{item.name}/IDR</span>
            <span className="text-zinc-500">Rp {item.last > 0 ? item.last.toLocaleString('id-ID') : '-'}</span>
            <span className={item.change_pct >= 0 ? 'text-green-500' : 'text-red-500'}>
              {item.change_pct >= 0 ? '+' : ''}{item.change_pct.toFixed(2)}%
            </span>
            <span className="text-zinc-800 mx-1">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Connection Status Bar ─────────────────────────────────────────────────────

function StatusBar({ cryptoOk, forexOk, goldOk, lastUpdate }: {
  cryptoOk: boolean;
  forexOk: boolean;
  goldOk: boolean;
  lastUpdate: string | null;
}) {
  const allOk = cryptoOk && forexOk && goldOk;

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-950/80 border-b border-zinc-800/40 text-[10px]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-green-500" />
          <span className="text-zinc-500">MARKET FEED</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusDot label="CRYPTO" ok={cryptoOk} />
          <StatusDot label="FOREX" ok={forexOk} />
          <StatusDot label="GOLD" ok={goldOk} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {lastUpdate && (
          <span className="text-zinc-600">
            Update: {lastUpdate}
          </span>
        )}
        <span className={allOk ? 'text-green-600' : 'text-red-500'}>
          {allOk ? 'ALL SYSTEMS NORMAL' : 'SOME FEEDS DEGRADED'}
        </span>
      </div>
    </div>
  );
}

function StatusDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-zinc-500">{label}</span>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function TradingDashboard() {
  const [tickerData, setTickerData] = useState<TickerData[]>([]);
  const [cryptoOk, setCryptoOk] = useState(true);
  const [forexOk, setForexOk] = useState(true);
  const [goldOk, setGoldOk] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Fetch ticker data for the tape
  const fetchTickerData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/crypto');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setCryptoOk(!json.stale);
      setTickerData(
        json.data.map((d: { pair: string; name: string; last: number; change_pct: number }) => ({
          pair: d.pair,
          name: d.name,
          last: d.last,
          change_pct: d.change_pct,
        }))
      );
      setLastUpdate(
        new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch {
      setCryptoOk(false);
    }

    try {
      const res = await fetch('/api/market/forex');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setForexOk(!json.stale);
    } catch {
      setForexOk(false);
    }

    try {
      const res = await fetch('/api/market/gold');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setGoldOk(!json.stale);
    } catch {
      setGoldOk(false);
    }
  }, []);

  useEffect(() => {
    fetchTickerData();
    const interval = setInterval(fetchTickerData, 15_000);
    return () => clearInterval(interval);
  }, [fetchTickerData]);

  // Keyboard shortcut: F to toggle fullscreen-like mode
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'f' || e.key === 'F') {
        setShowFullscreen(prev => !prev);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className={`min-h-screen bg-[#09090b] flex flex-col ${showFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Top Status Bar */}
      <StatusBar cryptoOk={cryptoOk} forexOk={forexOk} goldOk={goldOk} lastUpdate={lastUpdate} />

      {/* Clock Header */}
      <div className="flex items-center justify-center py-4 live-glow border-b border-zinc-800/30 bg-gradient-to-b from-zinc-900/30 to-transparent">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-amber-500/60" />
            <span className="text-[11px] font-bold tracking-[0.25em] text-zinc-400 uppercase">
              Market Dashboard
            </span>
            <BarChart3 className="w-5 h-5 text-emerald-500/60" />
          </div>
          <ClockWIB />
        </div>
      </div>

      {/* Ticker Tape */}
      <TickerTape data={tickerData} />

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left: Crypto Table (takes 7 cols on large screens) */}
        <div className="lg:col-span-7 border-r border-zinc-800/40 min-h-[400px] lg:min-h-0">
          <CryptoTable />
        </div>

        {/* Right: Forex + Gold (takes 5 cols on large screens) */}
        <div className="lg:col-span-5 flex flex-col min-h-[400px] lg:min-h-0">
          <div className="flex-1 border-b border-zinc-800/40">
            <ForexTable />
          </div>
          <div className="flex-1">
            <GoldCard />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/80 border-t border-zinc-800/40 text-[10px] text-zinc-600">
        <div className="flex items-center gap-4">
          <span>Data: Indodax, ExchangeRate-API, MetalPriceAPI</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Auto-refresh: Crypto 10s, Forex 60s, Gold 5m</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline">Press F for fullscreen</span>
          <span className="text-zinc-800">|</span>
          <span>Trading Dashboard v1.0</span>
        </div>
      </div>
    </div>
  );
}
