import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

interface FNGResponse {
  value: number;
  value_classification: string;
  timestamp: number;
  time_until_update: number;
}

interface SentimentResponse {
  fear_greed: {
    value: number;
    classification: string;
    timestamp: number;
  };
  bi_rate: {
    rate: number;
    last_updated: string;
  };
  timestamp: number;
  stale: boolean;
  cached_at: number | null;
}

// ── In-memory cache ──────────────────────────────────────────────────────────

let cachedResponse: SentimentResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 300_000; // 5 minutes

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch Crypto Fear & Greed Index from alternative.me
 * Free API, no key required. Updated daily.
 */
async function fetchFearGreed(): Promise<{ value: number; classification: string; timestamp: number } | null> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.data || json.data.length === 0) return null;

    const item = json.data[0];
    return {
      value: parseInt(item.value, 10),
      classification: item.value_classification,
      timestamp: parseInt(item.timestamp, 10) * 1000,
    };
  } catch (err) {
    console.error("[sentiment API] Fear & Greed fetch error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * BI Rate (suku bunga acuan Bank Indonesia).
 * Since BI updates infrequently (6x/year), we use the latest known rate.
 * Last BI Rate decision: May 2025 — 5.75% (holds)
 * This will be updated when BI announces changes.
 *
 * Note: There is no free API for BI Rate. This is manually maintained
 * based on official BI announcements.
 */
const BI_RATE_DATA = {
  rate: 5.75,
  last_updated: "2025-05-21",
  source: "Bank Indonesia (manual update)",
};

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = Date.now();
  const isCacheValid = cachedResponse !== null && now - lastFetchTime < CACHE_TTL_MS;

  if (isCacheValid) return NextResponse.json(cachedResponse);

  try {
    const fng = await fetchFearGreed();

    const fresh: SentimentResponse = {
      fear_greed: fng
        ? { value: fng.value, classification: fng.classification, timestamp: fng.timestamp }
        : { value: 0, classification: "N/A", timestamp: 0 },
      bi_rate: BI_RATE_DATA,
      timestamp: Date.now(),
      stale: false,
      cached_at: Date.now(),
    };

    cachedResponse = fresh;
    lastFetchTime = now;
    return NextResponse.json(fresh);
  } catch (err) {
    console.error("[sentiment API] Fetch failed:", err instanceof Error ? err.message : err);
    if (cachedResponse !== null) return NextResponse.json({ ...cachedResponse, stale: true });
    return NextResponse.json(
      {
        fear_greed: { value: 0, classification: "N/A", timestamp: 0 },
        bi_rate: BI_RATE_DATA,
        timestamp: 0,
        stale: true,
        cached_at: null,
        error: "Gagal mengambil data sentimen.",
      },
      { status: 502 },
    );
  }
}
