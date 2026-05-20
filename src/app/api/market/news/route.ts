import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  category: string;
}

interface NewsResponse {
  items: NewsItem[];
  timestamp: number;
  stale: boolean;
  cached_at: number | null;
}

// ── Config ───────────────────────────────────────────────────────────────────

const RSS_FEEDS = [
  {
    url: "https://www.cnbcindonesia.com/market/rss",
    source: "CNBC Indonesia",
    category: "Market",
  },
  {
    url: "https://www.cnbcindonesia.com/investment/rss",
    source: "CNBC Indonesia",
    category: "Investasi",
  },
  {
    url: "https://rss.tempo.co/ekonomi",
    source: "Tempo",
    category: "Ekonomi",
  },
];

// ── In-memory cache ──────────────────────────────────────────────────────────

let cachedResponse: NewsResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 120_000; // 2 minutes

// ── RSS Parser (lightweight, no deps) ────────────────────────────────────────

function extractItems(xml: string, source: string, category: string): NewsItem[] {
  const items: NewsItem[] = [];

  // Match <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    const title = (titleMatch?.[1] || titleMatch?.[2] || "").trim();
    const link = (linkMatch?.[1] || "").trim();
    const pubDate = (dateMatch?.[1] || "").trim();

    if (title && title.length > 10) {
      items.push({
        title: decodeHTMLEntities(title),
        link: decodeHTMLEntities(link),
        source,
        pubDate,
        category,
      });
    }
  }

  return items;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&#8211;/g, "\u2013")
    .replace(/&#8230;/g, "\u2026");
}

async function fetchRSSFeed(config: { url: string; source: string; category: string }): Promise<NewsItem[]> {
  try {
    const res = await fetch(config.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];
    const xml = await res.text();
    return extractItems(xml, config.source, config.category);
  } catch (err) {
    console.error(`[news API] Failed to fetch ${config.url}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.all(RSS_FEEDS.map(fetchRSSFeed));
  const all = results.flat();

  // Deduplicate by title (normalize whitespace)
  const seen = new Set<string>();
  const unique: NewsItem[] = [];
  for (const item of all) {
    const key = item.title.replace(/\s+/g, " ").toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique.slice(0, 30); // Max 30 headlines
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const now = Date.now();
  if (cachedResponse && now - lastFetchTime < CACHE_TTL_MS) {
    return NextResponse.json(cachedResponse);
  }

  try {
    const items = await fetchAllNews();

    const fresh: NewsResponse = {
      items,
      timestamp: Date.now(),
      stale: false,
      cached_at: Date.now(),
    };

    cachedResponse = fresh;
    lastFetchTime = now;
    return NextResponse.json(fresh);
  } catch (err) {
    console.error("[news API] Fetch failed:", err instanceof Error ? err.message : err);

    if (cachedResponse) {
      return NextResponse.json({ ...cachedResponse, stale: true });
    }

    return NextResponse.json(
      { items: [], timestamp: 0, stale: true, cached_at: null, error: "Gagal mengambil berita" },
      { status: 502 },
    );
  }
}
