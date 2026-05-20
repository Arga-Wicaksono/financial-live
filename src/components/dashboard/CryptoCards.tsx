'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { PriceCell } from './PriceCell';
import { Activity } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CryptoPairData {
  pair: string;
  name: string;
  high: number;
  low: number;
  vol_idr: number;
  last: number;
  buy: number;
  sell: number;
  server_time: number;
  change_pct: number;
}

interface CryptoResponse {
  data: CryptoPairData[];
  server_time: number;
  stale: boolean;
}

type Direction = 'up' | 'down';

// ── Helpers ────────────────────────────────────────────────────────────────────

const ICONS: Record<string, string> = {
  BTC: '₿', ETH: 'Ξ', SOL: '◎', XRP: '●', BNB: '◆', DOGE: '●', USDT: '₮',
};

function formatVol(vol: number): string {
  if (vol === 0) return '-';
  if (vol >= 1e12) return `${(vol / 1e12).toFixed(1)}T`;
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}M`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(0)}Jt`;
  return String(vol);
}

function detectDirection(data: CryptoPairData[], ref: React.MutableRefObject<Map<string, number>>): Map<string, Direction> {
  const dirs = new Map<string, Direction>();
  for (const item of data) {
    const prev = ref.get(item.pair);
    if (prev !== undefined && item.last !== prev && prev !== 0) {
      dirs.set(item.pair, item.last > prev ? 'up' : 'down');
    }
    ref.set(item.pair, item.last);
  }
  return dirs;
}

function formatCompact(n: number): string {
  if (n === 0) return '-';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}Jt`;
  return new Intl.NumberFormat('id-ID').format(n);
}

// ── Single Crypto Card ─────────────────────────────────────────────────────────

function CryptoCard({ item, dir, tick }: { item: CryptoPairData; dir?: Direction; tick: number }) {
  const icon = ICONS[item.name] || '●';
  const isUp = item.change_pct > 0;
  const isDown = item.change_pct < 0;
  const changeColor = isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-zinc-500';

  return (
    <div className={`rounded-lg border p-3 flex flex-col justify-between transition-all duration-300 ${
      dir === 'up'
        ? 'border-green-500/30 bg-green-500/5 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
        : dir === 'down'
          ? 'border-red-500/30 bg-red-500/5 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
          : 'border-zinc-800/40 bg-zinc-900/30'
    }`}>
      {/* Header: Name + Change */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none text-amber-500/80">{icon}</span>
          <div>
            <span className="font-bold text-white text-sm">{item.name}</span>
            <span className="text-zinc-600 text-xs font-normal">/IDR</span>
          </div>
        </div>
        <span className={`text-xs font-bold tabular-nums ${changeColor}`}>
          {isUp ? '▲' : isDown ? '▼' : ''}
          {isUp ? '+' : ''}{item.change_pct.toFixed(2)}%
        </span>
      </div>

      {/* Price (big, prominent) */}
      <div className="mb-2">
        <PriceCell
          key={`price-${item.pair}-${tick}`}
          value={item.last}
          format="currency"
          decimals={0}
          className="text-lg font-bold tabular-nums"
          direction={dir}
        />
      </div>

      {/* Bid/Ask row */}
      <div className="flex items-center justify-between text-[11px]">
        <div>
          <span className="text-zinc-600">Beli </span>
          <PriceCell
            key={`buy-${item.pair}-${tick}`}
            value={item.buy}
            format="currency"
            decimals={0}
            className="text-green-400/70 tabular-nums"
            direction={undefined}
          />
        </div>
        <div>
          <span className="text-zinc-600">Jual </span>
          <PriceCell
            key={`sell-${item.pair}-${tick}`}
            value={item.sell}
            format="currency"
            decimals={0}
            className="text-red-400/70 tabular-nums"
            direction={undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ── Crypto Cards Grid ─────────────────────────────────────────────────────────

export function CryptoCards() {
  const [data, setData] = useState<CryptoPairData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [directions, setDirections] = useState<Map<string, Direction>>(new Map());

  const prevRef = useRef<Map<string, number>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/crypto');
      if (!res.ok) throw new Error();
      const json: CryptoResponse = await res.json();

      const dirs = detectDirection(json.data, prevRef);
      if (dirs.size > 0) {
        setDirections(dirs);
        setTick(t => t + 1);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setDirections(new Map()), 650);
      }

      setData(json.data);
      setLoading(false);
    } catch {
      if (data.length === 0) setLoading(true);
    }
  }, [data.length]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-zinc-600">
          <Activity className="w-4 h-4 animate-spin" />
          <span className="text-sm">Memuat data crypto...</span>
        </div>
      </div>
    );
  }

  // Layout: 4 cols on top row (BTC, ETH, SOL, XRP), 3 cols on bottom (BNB, DOGE, USDT)
  const topRow = data.slice(0, 4);
  const bottomRow = data.slice(4, 7);

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      {/* Section title */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-bold text-amber-500/80 tracking-widest uppercase">Crypto / IDR</span>
        <span className="text-[10px] text-zinc-700">Indodax &bull; 10s</span>
      </div>

      {/* Top row: 4 cards */}
      <div className="flex-[1] grid grid-cols-4 gap-2 min-h-0">
        {topRow.map(item => (
          <CryptoCard key={item.pair} item={item} dir={directions.get(item.pair)} tick={tick} />
        ))}
      </div>

      {/* Bottom row: 3 cards (smaller) */}
      <div className="flex-[1] grid grid-cols-4 gap-2 min-h-0">
        {bottomRow.map(item => (
          <CryptoCard key={item.pair} item={item} dir={directions.get(item.pair)} tick={tick} />
        ))}
        {/* Vol info card */}
        <div className="rounded-lg border border-zinc-800/20 bg-zinc-900/10 p-3 flex flex-col justify-center items-center">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Total Vol. 24h</span>
          <div className="space-y-1">
            {data.slice(0, 4).map(item => (
              <div key={item.pair} className="flex items-center gap-2 text-[11px]">
                <span className="text-zinc-500 w-8 text-right">{item.name}</span>
                <span className="text-zinc-400 tabular-nums">{formatVol(item.vol_idr)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
