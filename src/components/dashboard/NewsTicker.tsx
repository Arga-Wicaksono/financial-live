'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Newspaper } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  category: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function NewsTicker() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/market/news');
      if (!res.ok) return;
      const json = await res.json();
      if (json.items && json.items.length > 0) setItems(json.items);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNews();
    intervalRef.current = setInterval(fetchNews, 120_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchNews]);

  if (items.length === 0) return null;

  const content = items.map((item, idx) => (
    <span key={`${item.source}-${idx}`} className="inline-flex items-center gap-2 px-4 whitespace-nowrap">
      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
        item.category === 'Market' ? 'bg-cyan-500/15 text-cyan-400'
          : item.category === 'Investasi' ? 'bg-purple-500/15 text-purple-400'
          : 'bg-blue-500/15 text-blue-400'
      }`}>
        {item.category}
      </span>
      <a href={item.link} target="_blank" rel="noopener noreferrer"
        className="text-sm text-zinc-400 hover:text-white transition-colors duration-200 max-w-[340px] truncate"
        title={item.title}>
        {item.title}
      </a>
      <span className="text-[10px] text-zinc-700">{item.source}</span>
      <span className="text-zinc-800">|</span>
    </span>
  ));

  return (
    <div className="shrink-0 overflow-hidden h-8 flex items-center bg-[#08080a] border-t border-zinc-800/30">
      <div className="flex items-center gap-1.5 px-3 shrink-0 bg-zinc-900/60 h-full border-r border-zinc-800/30">
        <Newspaper className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-[10px] font-bold text-blue-400 tracking-[0.12em] uppercase">Berita</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex animate-news-ticker">
          {content}
          {content}
        </div>
      </div>
    </div>
  );
}
