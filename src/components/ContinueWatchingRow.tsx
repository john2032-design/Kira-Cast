'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PlayCircle } from 'lucide-react';
import { readLocalProfile, WatchProgressItem } from '@/lib/localProfile';

function formatTime(seconds: number) {
  const value = Math.max(0, Math.round(seconds));
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ContinueWatchingRow() {
  const [items, setItems] = useState<WatchProgressItem[]>([]);

  useEffect(() => {
    const load = () => {
      const profile = readLocalProfile();
      setItems(profile.progress.slice(0, 6));
    };

    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);

  const rows = useMemo(() => items.filter((item) => {
    if (item.progressPercent >= 98) return false;
    return item.progressPercent > 2 || item.currentTime === 0;
  }), [items]);

  if (!rows.length) return null;

  return (
    <div className="mb-10 px-4 md:px-8 lg:px-12 relative">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-[#e5e5e5]">Continue Watching</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((item) => (
          <Link key={`${item.animeId}-${item.episodeNumber}`} href={`/watch/${item.animeId}/${item.episodeNumber}`}>
            <div className="rounded border border-white/15 bg-riko-darker hover:border-white/35 transition-colors overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-300 line-clamp-1">{item.animeTitle}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">Episode {item.episodeNumber} • {item.episodeTitle}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatTime(item.currentTime)} / {formatTime(item.duration)}</p>
                </div>
                <PlayCircle className="w-5 h-5 text-riko-red flex-shrink-0" />
              </div>
              <div className="h-1.5 w-full bg-white/10">
                <div className="h-full bg-riko-red" style={{ width: `${item.progressPercent}%` }} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
