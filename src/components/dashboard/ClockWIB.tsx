'use client';

import { useEffect, useState, useRef } from 'react';

export function ClockWIB() {
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isLive, setIsLive] = useState(false);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function updateTime() {
      const now = new Date();
      const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

      const h = String(wib.getHours()).padStart(2, '0');
      const m = String(wib.getMinutes()).padStart(2, '0');
      const s = String(wib.getSeconds()).padStart(2, '0');
      setTime(`${h}:${m}:${s}`);

      const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
      const dayName = days[wib.getDay()];
      const day = String(wib.getDate()).padStart(2, '0');
      const month = months[wib.getMonth()];
      const year = wib.getFullYear();
      setDateStr(`${dayName}, ${day} ${month} ${year}`);

      setIsLive(true);
    }

    updateTime();
    animRef.current = setInterval(updateTime, 1000);
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-2">
        {isLive && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
        )}
        <span className="text-[10px] font-bold tracking-[0.2em] text-green-500 uppercase">
          Live
        </span>
      </div>
      <div className="font-mono text-4xl font-bold tracking-wider text-white tabular-nums">
        {time}
      </div>
      <div className="text-xs font-medium tracking-wider text-zinc-500">
        WIB (UTC+7)
      </div>
      <div className="text-[10px] font-medium tracking-[0.15em] text-zinc-600">
        {dateStr}
      </div>
    </div>
  );
}
