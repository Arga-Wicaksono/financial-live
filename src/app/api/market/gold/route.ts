import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

interface GoldResponse {
  xau_usd: number;
  xau_idr: number;
  xau_idr_per_gram: number;
  antam_est_jual: number;
  antam_est_beli: number;
  usd_idr: number;
  data_date: string;
  source: string;
  timestamp: number;
  stale: boolean;
  cached_at: number | null;
}

// ── In-memory cache ──────────────────────────────────────────────────────────

let cachedResponse: GoldResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 300_000; // 5 minutes

// ── Constants ────────────────────────────────────────────────────────────────

const TROY_OZ_TO_GRAM = 31.1035;

// Antam premium/discount — these are standard market approximations:
// Antam retail (jual) typically sells at ~15% above spot
// Antam buyback typically buys at ~3-5% below spot
const ANTM_JUAL_PREMIUM = 0.15;
const ANTM_BELI_DISCOUNT = 0.03;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch real gold spot price from fawazahmed0/currency-api.
 * This is a free, open-source API — no API key required.
 * Data is updated daily (date of latest available data).
 * Source: https://github.com/fawazahmed0/exchange-api
 */
async function fetchGoldSpotFromCurrencyApi(): Promise<{
  xauUsd: number;
  xauIdr: number;
  date: string;
} | null> {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json",
      {
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) return null;

    const json = await res.json();

    const xauUsd = json.xau?.usd;
    const xauIdr = json.xau?.idr;
    const date = json.date;

    if (!xauUsd || !Number.isFinite(xauUsd) || xauUsd <= 0) return null;

    return {
      xauUsd,
      xauIdr: xauIdr && Number.isFinite(xauIdr) ? xauIdr : 0,
      date: date || "unknown",
    };
  } catch {
    return null;
  }
}

/**
 * Fetch real USD/IDR from our own forex endpoint (which uses ExchangeRate-API).
 * Falls back to the XAU/IDR direct rate from currency-api if available.
 */
async function fetchUsdIdr(): Promise<number> {
  try {
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
  return 0; // Will be handled — no hardcoded fallback
}

function buildGoldResponse(
  xauUsd: number,
  xauIdr: number,
  usdIdr: number,
  date: string,
  source: string,
): GoldResponse {
  // Use direct XAU/IDR if available, otherwise calculate from XAU/USD × USD/IDR
  const effectiveXauIdr = xauIdr > 0 ? xauIdr : xauUsd * usdIdr;
  const xauIdrPerGram = effectiveXauIdr / TROY_OZ_TO_GRAM;

  // Antam estimates based on spot + standard premium/discount
  const antamEstJual = xauIdrPerGram * (1 + ANTM_JUAL_PREMIUM);
  const antamEstBeli = xauIdrPerGram * (1 - ANTM_BELI_DISCOUNT);

  return {
    xau_usd: Math.round(xauUsd * 100) / 100,
    xau_idr: Math.round(effectiveXauIdr),
    xau_idr_per_gram: Math.round(xauIdrPerGram),
    antam_est_jual: Math.round(antamEstJual),
    antam_est_beli: Math.round(antamEstBeli),
    usd_idr: usdIdr > 0 ? Math.round(usdIdr * 100) / 100 : 0,
    data_date: date,
    source,
    timestamp: Date.now(),
    stale: false,
    cached_at: Date.now(),
  };
}

async function fetchGoldData(): Promise<GoldResponse> {
  // 1) Fetch real gold spot price from currency-api
  const goldResult = await fetchGoldSpotFromCurrencyApi();

  if (!goldResult) {
    throw new Error("Failed to fetch gold price from currency-api");
  }

  // 2) Fetch USD/IDR for cross-reference
  const usdIdr = await fetchUsdIdr();

  return buildGoldResponse(
    goldResult.xauUsd,
    goldResult.xauIdr,
    usdIdr,
    goldResult.date,
    "fawazahmed0/currency-api",
  );
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
    console.error(
      "[gold API] Fetch failed:",
      err instanceof Error ? err.message : err,
    );

    // Return stale cache if available
    if (cachedResponse !== null) {
      return NextResponse.json({
        ...cachedResponse,
        stale: true,
      });
    }

    // No cache — return error, NO hardcoded fallback data
    return NextResponse.json(
      {
        xau_usd: 0,
        xau_idr: 0,
        xau_idr_per_gram: 0,
        antam_est_jual: 0,
        antam_est_beli: 0,
        usd_idr: 0,
        data_date: "",
        source: "",
        timestamp: 0,
        stale: true,
        cached_at: null,
        error: "Gagal mengambil data emas. Sumber: fawazahmed0/currency-api (gratis)",
      },
      { status: 502 },
    );
  }
}
