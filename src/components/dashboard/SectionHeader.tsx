'use client';

import { memo } from 'react';

// ── Section Header — shared across all dashboard panels ────────────────────────

interface SectionHeaderProps {
  color: string;       // tailwind bg color, e.g. 'bg-amber-500'
  title: string;
  source?: string;
  interval?: string;
}

export const SectionHeader = memo(function SectionHeader({ color, title, source, interval }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <div className={`w-1 h-4 rounded-full ${color}`} />
        <span className="text-xs font-bold text-zinc-300 tracking-[0.15em] uppercase">{title}</span>
        {source && <span className="text-[10px] text-zinc-600 font-mono">{source}</span>}
      </div>
      {interval && (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot-pulse" />
          <span className="text-[10px] text-zinc-600 font-mono">{interval}</span>
        </div>
      )}
    </div>
  );
});
