import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

interface IndodaxTicker {
  high: string;
  low: string;
  vol_idr: string;
  last: string;
  buy: string;
  sell: string;
  server_time: number;
}

interface IndodaxResponse {
  tickers: Record<string, IndodaxTicker>;
  server_time: number;
}

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

// ── In-memory cache ──────────────────────────────────────────────────────────

const TARGET_PAIRS = [
  "btc_idr",
  "eth_idr",
  "sol_idr",
  "xrp_idr",
  "bnb_idr",
  "doge_idr",
  "usdt_idr",
] as const;

type TargetPair = (typeof TARGET_PAIRS)[number];

let cachedResponse: CryptoResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10_000; // 10 seconds

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeParseFloat(val: string): number {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

function transformTicker(pair: string, ticker: IndodaxTicker): CryptoPairData {
  const high = safeParseFloat(ticker.high);
  const low = safeParseFloat(ticker.low);
  const last = safeParseFloat(ticker.last);
  const mid = (high + low) / 2;
  const change_pct = mid !== 0 ? ((last - mid) / mid) * 100 : 0;
  const name = pair.replace("_idr", "").toUpperCase();

  return {
    pair,
    name,
    high,
    low,
    vol_idr: safeParseFloat(ticker.vol_idr),
    last,
    buy: safeParseFloat(ticker.buy),
    sell: safeParseFloat(ticker.sell),
    server_time: ticker.server_time,
    change_pct: Math.round(change_pct * 100) / 100,
  };
}

async function fetchFreshData(): Promise<CryptoResponse> {
  const res = await fetch("https://indodax.com/api/ticker_all", {
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    throw new Error(`Indodax returned ${res.status}`);
  }

  const json = (await res.json()) as IndodaxResponse;

  const data: CryptoPairData[] = TARGET_PAIRS.map((pair) => {
    const ticker = json.tickers[pair];
    if (!ticker) {
      // Return a zeroed-out entry so the client still has the slot
      return {
        pair,
        name: pair.replace("_idr", "").toUpperCase(),
        high: 0,
        low: 0,
        vol_idr: 0,
        last: 0,
        buy: 0,
        sell: 0,
        server_time: 0,
        change_pct: 0,
      };
    }
    return transformTicker(pair, ticker);
  });

  return {
    data,
    server_time: json.server_time,
    stale: false,
    cached_at: Date.now(),
  };
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = Date.now();
  const isCacheValid = cachedResponse !== null && now - lastFetchTime < CACHE_TTL_MS;

  // Return fresh cache if still valid
  if (isCacheValid) {
    return NextResponse.json(cachedResponse);
  }

  try {
    const fresh = await fetchFreshData();
    cachedResponse = fresh;
    lastFetchTime = now;
    return NextResponse.json(fresh);
  } catch (err) {
    console.error("[crypto API] Fetch failed:", err instanceof Error ? err.message : err);

    // Return stale cache if available
    if (cachedResponse !== null) {
      return NextResponse.json({
        ...cachedResponse,
        stale: true,
      });
    }

    // No cache at all — return 502
    return NextResponse.json(
      {
        data: [],
        server_time: 0,
        stale: true,
        cached_at: null,
        error: "Unable to fetch crypto data from Indodax",
      },
      { status: 502 },
    );
  }
}
