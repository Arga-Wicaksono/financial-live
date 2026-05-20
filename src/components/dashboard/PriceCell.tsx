'use client';

import { memo } from 'react';

interface PriceCellProps {
  value: number;
  format?: 'currency' | 'percent';
  decimals?: number;
  className?: string;
  direction?: 'up' | 'down' | null;
}

function formatPrice(value: number, format: string, decimals: number): string {
  if (value === 0) return '-';
  if (format === 'currency') {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(value);
  }
  if (format === 'percent') {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(decimals)}%`;
  }
  return String(value);
}

export const PriceCell = memo(function PriceCell({ value, format = 'currency', decimals = 0, className = '', direction }: PriceCellProps) {
  const baseColor = value > 0
    ? 'text-white'
    : value < 0
      ? 'text-red-400'
      : 'text-zinc-600';

  const animClass = direction === 'up'
    ? 'animate-flash-up'
    : direction === 'down'
      ? 'animate-flash-down'
      : '';

  return (
    <span
      className={`
        inline-block rounded px-1.5 py-0.5 font-mono tabular-nums
        ${animClass}
        ${animClass ? '' : baseColor}
        ${className}
      `}
    >
      {formatPrice(value, format, decimals)}
    </span>
  );
});
