import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

interface MetalPriceApiResponse {
  success: boolean;
  base: string;
  rates: Record<string, number>;
  unit: string;
  timestamp: number;
}

interface GoldResponse {
  xau_usd: number;
  xau_idr: number;
  antam_per_gram: number;
  antam_buyback_per_gram: number;
  xau_idr_per_gram: number;
  usd_idr_used: number;
  timestamp: number;
  stale: boolean;
  cached_at: number | null;
  source: string;
}

// ── In-memory cache ──────────────────────────────────────────────────────────

let cachedResponse: GoldResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 300_000; // 300 seconds (5 minutes)

// ── Constants ────────────────────────────────────────────────────────────────

const TROY_OZ_TO_GRAM = 31.1035;
const ANTIM_PREMIUM = 0.15; // 15% premium over spot for Antam retail
const ANTIM_BUYBACK_DISCOUNT = 0.03; // ~3% below spot for buyback
const FALLBACK_XAU_USD = 2650;
const FALLBACK_USD_IDR = 16_350;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchUsdIdr(): Promise<number> {
  try {
    // Hit our own forex endpoint which already has caching
    const res = await fetch("http://localhost:3000/api/market/forex", {
      signal: AbortSignal.timeout(5_000),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.base_usd_idr && json.base_usd_idr > 0) {
        return json.base_usd_idr as number;
      }
    }
  } catch {
    // fall through
  }
  return FALLBACK_USD_IDR;
}

async function tryMetalPriceApi(): Promise<{ xauUsd: number; timestamp: number } | null> {
  try {
    const res = await fetch(
      "https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XAU",
      {
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(6_000),
      },
    );

    if (!res.ok) return null;

    const json = (await res.json()) as MetalPriceApiResponse;

    if (!json.success || !json.rates?.XAU) return null;

    // The API returns XAU as how many XAU per 1 USD (i.e., 1 / price_per_oz)
    const xauPerUsd = json.rates.XAU;
    const xauUsd = 1 / xauPerUsd;

    if (!Number.isFinite(xauUsd) || xauUsd <= 0) return null;

    return { xauUsd, timestamp: json.timestamp * 1000 };
  } catch {
    return null;
  }
}

function buildGoldResponse(
  xauUsd: number,
  usdIdr: number,
  timestamp: number,
  stale: boolean,
  source: string,
): GoldResponse {
  const xauIdr = xauUsd * usdIdr;
  const xauIdrPerGram = xauIdr / TROY_OZ_TO_GRAM;
  const antamPerGram = xauIdrPerGram * (1 + ANTIM_PREMIUM);
  const antamBuyback = xauIdrPerGram * (1 - ANTIM_BUYBACK_DISCOUNT);

  return {
    xau_usd: Math.round(xauUsd * 100) / 100,
    xau_idr: Math.round(xauIdr),
    antam_per_gram: Math.round(antamPerGram),
    antam_buyback_per_gram: Math.round(antamBuyback),
    xau_idr_per_gram: Math.round(xauIdrPerGram),
    usd_idr_used: Math.round(usdIdr * 100) / 100,
    timestamp,
    stale,
    cached_at: Date.now(),
    source,
  };
}

async function fetchGoldData(): Promise<GoldResponse> {
  const now = Date.now();

  // 1) Try the metals API first
  const metalResult = await tryMetalPriceApi();

  let xauUsd: number;
  let timestamp: number;
  let source: string;

  if (metalResult) {
    xauUsd = metalResult.xauUsd;
    timestamp = metalResult.timestamp || now;
    source = "metalpriceapi";
  } else {
    // 2) Fallback: hardcoded XAU/USD + live USD/IDR
    xauUsd = FALLBACK_XAU_USD;
    timestamp = now;
    source = "fallback";
  }

  const usdIdr = await fetchUsdIdr();

  return buildGoldResponse(xauUsd, usdIdr, timestamp, false, source);
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = Date.now();
  const isCacheValid = cachedResponse !== null && now - lastFetchTime < CACHE_TTL_MS;

  if (isCacheValid) {
    return NextResponse.json(cachedResponse);
  }

  try {
    const fresh = await fetchGoldData();
    cachedResponse = fresh;
    lastFetchTime = now;
    return NextResponse.json(fresh);
  } catch (err) {
    console.error("[gold API] Fetch failed:", err instanceof Error ? err.message : err);

    if (cachedResponse !== null) {
      return NextResponse.json({
        ...cachedResponse,
        stale: true,
      });
    }

    // No cache — build from pure fallbacks
    const fallback = buildGoldResponse(
      FALLBACK_XAU_USD,
      FALLBACK_USD_IDR,
      now,
      true,
      "hard-fallback",
    );

    return NextResponse.json(
      { ...fallback, error: "Unable to fetch gold data, using fallback" },
      { status: 502 },
    );
  }
}
