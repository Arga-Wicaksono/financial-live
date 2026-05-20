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
  rate_idr: number;
  rate_usd: number;
}

interface ForexResponse {
  base_usd_idr: number;
  rates: ForexRate[];
  timestamp: number;
  stale: boolean;
  cached_at: number | null;
}

// ── In-memory cache ──────────────────────────────────────────────────────────

const TARGET_CURRENCIES: { code: string; symbol: string }[] = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "SGD", symbol: "S$" },
  { code: "CHF", symbol: "CHF" },
  { code: "CNY", symbol: "¥" },
  { code: "AUD", symbol: "A$" },
];

let cachedResponse: ForexResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

// ── Fallback USD/IDR rate ────────────────────────────────────────────────────

const FALLBACK_USD_IDR = 16_350;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchForexData(): Promise<ForexResponse> {
  const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    throw new Error(`ExchangeRate API returned ${res.status}`);
  }

  const json = (await res.json()) as ExchangeRateApiResponse;
  const rates = json.rates;

  // We need IDR to compute all rates into IDR
  let usdIdr = rates["IDR"];
  if (!usdIdr || !Number.isFinite(usdIdr)) {
    usdIdr = FALLBACK_USD_IDR;
  }

  const forexRates: ForexRate[] = TARGET_CURRENCIES.map(({ code, symbol }) => {
    const rateUsd = code === "USD" ? 1 : rates[code] ?? 0;
    const rateIdr = code === "USD" ? usdIdr : rateUsd * usdIdr;

    return {
      currency: code,
      symbol,
      rate_idr: Math.round(rateIdr * 100) / 100,
      rate_usd: Math.round(rateUsd * 10000) / 10000,
    };
  });

  return {
    base_usd_idr: Math.round(usdIdr * 100) / 100,
    rates: forexRates,
    timestamp: json.time_last_updated * 1000, // convert to ms
    stale: false,
    cached_at: Date.now(),
  };
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = Date.now();
  const isCacheValid = cachedResponse !== null && now - lastFetchTime < CACHE_TTL_MS;

  if (isCacheValid) {
    return NextResponse.json(cachedResponse);
  }

  try {
    const fresh = await fetchForexData();
    cachedResponse = fresh;
    lastFetchTime = now;
    return NextResponse.json(fresh);
  } catch (err) {
    console.error("[forex API] Fetch failed:", err instanceof Error ? err.message : err);

    if (cachedResponse !== null) {
      return NextResponse.json({
        ...cachedResponse,
        stale: true,
      });
    }

    // No cache — build a response from fallback rate
    const fallbackRates: ForexRate[] = TARGET_CURRENCIES.map(({ code, symbol }) => ({
      currency: code,
      symbol,
      rate_idr: code === "USD" ? FALLBACK_USD_IDR : 0,
      rate_usd: code === "USD" ? 1 : 0,
    }));

    return NextResponse.json(
      {
        base_usd_idr: FALLBACK_USD_IDR,
        rates: fallbackRates,
        timestamp: 0,
        stale: true,
        cached_at: null,
        error: "Unable to fetch forex data, using fallback",
      },
      { status: 502 },
    );
  }
}
