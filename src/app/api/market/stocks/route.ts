import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

interface YahooMeta {
  symbol: string;
  regularMarketPrice: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  chartPreviousClose: number;
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: YahooMeta;
      indicators?: { quote?: Array<{ close?: number[] }> };
    }>;
    error: null | { code: string; description: string };
  };
}

interface StockItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
  volume: number;
  prev_close: number;
}

interface StockResponse {
  indices: StockItem[];
  bluechips: StockItem[];
  timestamp: number;
  stale: boolean;
  cached_at: number | null;
}

// ── Config ───────────────────────────────────────────────────────────────────

const INDICES = [
  { symbol: "^JKSE", name: "IHSG" },
  { symbol: "^JKLQ45", name: "LQ45" },
  { symbol: "IDX30.JK", name: "IDX30" },
];

const BLUECHIPS = [
  { symbol: "BBCA.JK", name: "BBCA" },
  { symbol: "BBRI.JK", name: "BBRI" },
  { symbol: "BMRI.JK", name: "BMRI" },
  { symbol: "TLKM.JK", name: "TLKM" },
  { symbol: "ASII.JK", name: "ASII" },
];

// ── In-memory cache ──────────────────────────────────────────────────────────

let cachedResponse: StockResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60_000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeNum(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

const YAHOO_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchYahooQuote(symbol: string): Promise<StockItem | null> {
  try {
    const encoded = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=5d&interval=1d&includePrePost=false`;
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as YahooChartResponse;
    if (json.chart?.error || !json.chart.result?.[0]) return null;

    const r = json.chart.result[0];
    const m = r.meta;
    const price = safeNum(m.regularMarketPrice);
    const prevClose = safeNum(m.chartPreviousClose);

    // Calculate change from chartPreviousClose
    let change = 0;
    let changePct = 0;
    if (prevClose > 0 && price > 0) {
      change = Math.round((price - prevClose) * 100) / 100;
      changePct = Math.round(((price - prevClose) / prevClose) * 10000) / 100;
    }

    return {
      symbol: m.symbol,
      name: symbol,
      price,
      change,
      change_pct: changePct,
      high: safeNum(m.regularMarketDayHigh),
      low: safeNum(m.regularMarketDayLow),
      volume: safeNum(m.regularMarketVolume),
      prev_close: prevClose,
    };
  } catch {
    return null;
  }
}

async function fetchStocksData(): Promise<StockResponse> {
  const all = [...INDICES, ...BLUECHIPS];
  const results = await Promise.all(all.map(async (cfg) => {
    const item = await fetchYahooQuote(cfg.symbol);
    if (item) {
      return { ...item, name: cfg.name };
    }
    return {
      symbol: cfg.symbol,
      name: cfg.name,
      price: 0, change: 0, change_pct: 0,
      open: 0, high: 0, low: 0, volume: 0, prev_close: 0,
    };
  }));

  return {
    indices: results.slice(0, INDICES.length),
    bluechips: results.slice(INDICES.length),
    timestamp: Date.now(),
    stale: false,
    cached_at: Date.now(),
  };
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = Date.now();
  if (cachedResponse && now - lastFetchTime < CACHE_TTL_MS) return NextResponse.json(cachedResponse);

  try {
    const fresh = await fetchStocksData();
    cachedResponse = fresh;
    lastFetchTime = now;
    return NextResponse.json(fresh);
  } catch (err) {
    console.error("[stocks API] Fetch failed:", err instanceof Error ? err.message : err);
    if (cachedResponse) return NextResponse.json({ ...cachedResponse, stale: true });
    return NextResponse.json(
      { indices: [], bluechips: [], timestamp: 0, stale: true, cached_at: null, error: "Gagal mengambil data saham. Sumber: Yahoo Finance" },
      { status: 502 },
    );
  }
}
