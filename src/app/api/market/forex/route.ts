import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

interface ExchangeRateApiResponse {
  base: string;
  date: string;
  time_last_updated: number;
  rates: Record<string, number>;
}

interface ForexRate {
  currency: string;
  symbol: string;
  flag: string;
  label: string;
  rate_idr: number;
  rate_usd: number;
}

interface ForexResponse {
  base_usd_idr: number;
  usd_change_pct: number;
  usd_high: number;
  usd_low: number;
  rates: ForexRate[];
  timestamp: number;
  stale: boolean;
  cached_at: number | null;
}

// ── Config ───────────────────────────────────────────────────────────────────

const TARGET_CURRENCIES: { code: string; symbol: string; flag: string; label: string }[] = [
  { code: "USD", symbol: "$", flag: "\u{1F1FA}\u{1F1F8}", label: "Dollar AS" },
  { code: "EUR", symbol: "\u20AC", flag: "\u{1F1EA}\u{1F1FA}", label: "Euro" },
  { code: "GBP", symbol: "\u00A3", flag: "\u{1F1EC}\u{1F1E7}", label: "Poundsterling" },
  { code: "JPY", symbol: "\u00A5", flag: "\u{1F1EF}\u{1F1F5}", label: "Yen" },
  { code: "SGD", symbol: "S$", flag: "\u{1F1F8}\u{1F1EC}", label: "Dollar SG" },
  { code: "CHF", symbol: "CHF", flag: "\u{1F1E8}\u{1F1ED}", label: "Franc" },
  { code: "CNY", symbol: "\u00A5", flag: "\u{1F1E8}\u{1F1F3}", label: "Yuan" },
  { code: "AUD", symbol: "A$", flag: "\u{1F1E6}\u{1F1FA}", label: "Dollar AU" },
  { code: "MYR", symbol: "RM", flag: "\u{1F1F2}\u{1F1FE}", label: "Ringgit" },
  { code: "SAR", symbol: "﷼", flag: "\u{1F1F8}\u{1F1E6}", label: "Riyal" },
];

// ── In-memory cache ──────────────────────────────────────────────────────────

let cachedResponse: ForexResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

// ── Helpers ──────────────────────────────────────────────────────────────────

interface YahooMeta {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
}

interface YahooChartResponse {
  chart: {
    result: Array<{ meta: YahooMeta }>;
    error: null | { code: string; description: string };
  };
}

async function fetchUsdIdrYahoo(): Promise<{ price: number; change_pct: number; high: number; low: number } | null> {
  try {
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/USDIDR=X?range=1d&interval=1d&includePrePost=false";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as YahooChartResponse;
    if (json.chart?.error || !json.chart.result?.[0]) return null;

    const m = json.chart.result[0].meta;
    const safeNum = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

    return {
      price: safeNum(m.regularMarketPrice),
      change_pct: Math.round(safeNum(m.regularMarketChangePercent) * 100) / 100,
      high: safeNum(m.regularMarketDayHigh),
      low: safeNum(m.regularMarketDayLow),
    };
  } catch {
    return null;
  }
}

async function fetchForexData(): Promise<ForexResponse> {
  // 1) Get base rates from ExchangeRate-API
  const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) throw new Error(`ExchangeRate API returned ${res.status}`);

  const json = (await res.json()) as ExchangeRateApiResponse;
  const rates = json.rates;

  const usdIdr = rates["IDR"];
  if (!usdIdr || !Number.isFinite(usdIdr)) {
    throw new Error("IDR rate not available from ExchangeRate-API");
  }

  // 2) Get USD/IDR change/high/low from Yahoo Finance
  const yahooData = await fetchUsdIdrYahoo();

  // Build rates array
  const forexRates: ForexRate[] = TARGET_CURRENCIES.map(({ code, symbol, flag, label }) => {
    const rateUsd = code === "USD" ? 1 : rates[code] ?? 0;
    const rateIdr = code === "USD" ? usdIdr : rateUsd * usdIdr;

    return {
      currency: code,
      symbol,
      flag,
      label,
      rate_idr: Math.round(rateIdr * 100) / 100,
      rate_usd: Math.round(rateUsd * 10000) / 10000,
    };
  });

  return {
    base_usd_idr: yahooData?.price > 0 ? yahooData.price : Math.round(usdIdr * 100) / 100,
    usd_change_pct: yahooData?.change_pct ?? 0,
    usd_high: yahooData?.high ?? 0,
    usd_low: yahooData?.low ?? 0,
    rates: forexRates,
    timestamp: json.time_last_updated * 1000,
    stale: false,
    cached_at: Date.now(),
  };
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = Date.now();
  const isCacheValid = cachedResponse !== null && now - lastFetchTime < CACHE_TTL_MS;

  if (isCacheValid) return NextResponse.json(cachedResponse);

  try {
    const fresh = await fetchForexData();
    cachedResponse = fresh;
    lastFetchTime = now;
    return NextResponse.json(fresh);
  } catch (err) {
    console.error("[forex API] Fetch failed:", err instanceof Error ? err.message : err);

    if (cachedResponse !== null) {
      return NextResponse.json({ ...cachedResponse, stale: true });
    }

    return NextResponse.json(
      {
        base_usd_idr: 0,
        usd_change_pct: 0,
        usd_high: 0,
        usd_low: 0,
        rates: [],
        timestamp: 0,
        stale: true,
        cached_at: null,
        error: "Gagal mengambil data valas. Sumber: ExchangeRate-API + Yahoo Finance",
      },
      { status: 502 },
    );
  }
}
