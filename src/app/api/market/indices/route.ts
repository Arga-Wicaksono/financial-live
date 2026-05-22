import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

interface YahooMeta {
  symbol: string;
  regularMarketPrice: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  chartPreviousClose: number;
}

interface YahooChartResponse {
  chart: {
    result: Array<{ meta: YahooMeta }>;
    error: null | { code: string; description: string };
  };
}

interface IndexItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
  prev_close: number;
}

interface IndicesResponse {
  data: IndexItem[];
  timestamp: number;
  stale: boolean;
  cached_at: number | null;
}

// ── Config ───────────────────────────────────────────────────────────────────

const GLOBAL_INDICES = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "^IXIC", name: "Nasdaq" },
  { symbol: "^N225", name: "Nikkei 225" },
  { symbol: "^HSI", name: "Hang Seng" },
];

// ── In-memory cache ──────────────────────────────────────────────────────────

let cachedResponse: IndicesResponse | null = null;
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

async function fetchYahooIndex(symbol: string, name: string): Promise<IndexItem> {
  try {
    const encoded = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=5d&interval=1d&includePrePost=false`;
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as YahooChartResponse;
    if (json.chart?.error || !json.chart.result?.[0]) throw new Error("No data");

    const m = json.chart.result[0].meta;
    const price = safeNum(m.regularMarketPrice);
    const prevClose = safeNum(m.chartPreviousClose);

    let change = 0;
    let changePct = 0;
    if (prevClose > 0 && price > 0) {
      change = Math.round((price - prevClose) * 100) / 100;
      changePct = Math.round(((price - prevClose) / prevClose) * 10000) / 100;
    }

    return {
      symbol, name, price, change,
      change_pct: changePct,
      high: safeNum(m.regularMarketDayHigh),
      low: safeNum(m.regularMarketDayLow),
      prev_close: prevClose,
    };
  } catch {
    return { symbol, name, price: 0, change: 0, change_pct: 0, high: 0, low: 0, prev_close: 0 };
  }
}

async function fetchGlobalIndices(): Promise<IndicesResponse> {
  const data = await Promise.all(GLOBAL_INDICES.map((i) => fetchYahooIndex(i.symbol, i.name)));
  return { data, timestamp: Date.now(), stale: false, cached_at: Date.now() };
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = Date.now();
  if (cachedResponse && now - lastFetchTime < CACHE_TTL_MS) return NextResponse.json(cachedResponse);

  try {
    const fresh = await fetchGlobalIndices();
    cachedResponse = fresh;
    lastFetchTime = now;
    return NextResponse.json(fresh);
  } catch (err) {
    console.error("[indices API] Fetch failed:", err instanceof Error ? err.message : err);
    if (cachedResponse) return NextResponse.json({ ...cachedResponse, stale: true });
    return NextResponse.json(
      { data: [], timestamp: 0, stale: true, cached_at: null, error: "Gagal mengambil indeks global. Sumber: Yahoo Finance" },
      { status: 502 },
    );
  }
}
