'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { PriceCell } from './PriceCell';
import { Bitcoin, TrendingUp, TrendingDown, Activity } from 'lucide-react';

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
  cached_at: number | null;
}

type Direction = 'up' | 'down';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatVolume(vol: number): string {
  if (vol === 0) return '-';
  if (vol >= 1_000_000_000_000) return `${(vol / 1_000_000_000_000).toFixed(1)}T`;
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}M`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}Jt`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}Rb`;
  return String(vol);
}

function getIconForPair(name: string): string {
  const lower = name.toLowerCase();
  if (lower === 'btc') return '₿';
  if (lower === 'eth') return 'Ξ';
  if (lower === 'sol') return '◎';
  if (lower === 'bnb') return '◆';
  return '●';
}

function detectDirection(
  newData: CryptoPairData[],
  oldDataRef: React.MutableRefObject<Map<string, number>>
): Map<string, Direction> {
  const dirs = new Map<string, Direction>();
  for (const item of newData) {
    const oldLast = oldDataRef.get(item.pair);
    if (oldLast !== undefined && item.last !== oldLast && oldLast !== 0) {
      dirs.set(item.pair, item.last > oldLast ? 'up' : 'down');
    }
    oldDataRef.set(item.pair, item.last);
  }
  return dirs;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CryptoTable() {
  const [data, setData] = useState<CryptoPairData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [tick, setTick] = useState(0);
  const [directions, setDirections] = useState<Map<string, Direction>>(new Map());

  const prevDataRef = useRef<Map<string, number>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dataLoadedRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market/crypto');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: CryptoResponse = await res.json();

      // Detect direction changes (setState called from event handler, not useEffect)
      const dirs = detectDirection(json.data, prevDataRef);
      if (dirs.size > 0) {
        setDirections(dirs);
        setTick(t => t + 1);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => {
          setDirections(new Map());
        }, 650);
      }

      setData(json.data);
      setStale(json.stale);
      setError(null);
      setLoading(false);
      dataLoadedRef.current = true;
    } catch (err) {
      console.error('Crypto fetch error:', err);
      if (!dataLoadedRef.current) {
        setError('Gagal memuat data crypto');
      }
      setStale(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [fetchData]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/10">
            <Bitcoin className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">CRYPTO / IDR</h2>
            <p className="text-[10px] text-zinc-600">Indodax Exchange</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stale && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
              STALE
            </span>
          )}
          <span className="text-[9px] text-zinc-600 font-mono">10s refresh</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-zinc-600">
              <Activity className="w-4 h-4 animate-spin" />
              <span className="text-xs">Memuat data...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-xs text-red-400">{error}</span>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
                <th className="text-left px-4 py-2 font-medium">Aset</th>
                <th className="text-right px-3 py-2 font-medium">Harga Terakhir</th>
                <th className="text-right px-3 py-2 font-medium hidden md:table-cell">24h</th>
                <th className="text-right px-3 py-2 font-medium hidden lg:table-cell">Beli</th>
                <th className="text-right px-3 py-2 font-medium hidden lg:table-cell">Jual</th>
                <th className="text-right px-4 py-2 font-medium hidden sm:table-cell">Vol (IDR)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => {
                const dir = directions.get(item.pair);
                return (
                  <tr
                    key={item.pair}
                    className={`border-t border-zinc-800/40 hover:bg-zinc-800/20 transition-colors ${
                      idx % 2 === 0 ? 'bg-zinc-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none text-amber-500/80">
                          {getIconForPair(item.name)}
                        </span>
                        <div className="font-bold text-white text-xs">
                          {item.name}
                          <span className="text-zinc-600 font-normal">/IDR</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right px-3 py-2.5">
                      <PriceCell
                        key={`last-${tick}`}
                        value={item.last}
                        format="currency"
                        decimals={0}
                        className="font-bold text-xs"
                        direction={dir}
                      />
                    </td>
                    <td className="text-right px-3 py-2.5 hidden md:table-cell">
                      <div className="flex items-center justify-end gap-1">
                        {item.change_pct > 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        ) : item.change_pct < 0 ? (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        ) : null}
                        <span
                          className={`text-xs font-semibold ${
                            item.change_pct > 0
                              ? 'text-green-400'
                              : item.change_pct < 0
                                ? 'text-red-400'
                                : 'text-zinc-500'
                          }`}
                        >
                          {item.change_pct > 0 ? '+' : ''}
                          {item.change_pct.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-right px-3 py-2.5 hidden lg:table-cell">
                      <PriceCell
                        key={`buy-${tick}`}
                        value={item.buy}
                        format="currency"
                        decimals={0}
                        className="text-[11px] text-green-400/80"
                      />
                    </td>
                    <td className="text-right px-3 py-2.5 hidden lg:table-cell">
                      <PriceCell
                        key={`sell-${tick}`}
                        value={item.sell}
                        format="currency"
                        decimals={0}
                        className="text-[11px] text-red-400/80"
                      />
                    </td>
                    <td className="text-right px-4 py-2.5 hidden sm:table-cell">
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {formatVolume(item.vol_idr)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
