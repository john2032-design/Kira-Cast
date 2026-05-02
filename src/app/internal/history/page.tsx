'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { readLocalProfile, WatchHistoryItem, WatchProgressItem } from '@/lib/localProfile';

type AnimeHistoryItem = {
  animeId: string;
  animeTitle: string;
  lastEpisodeNumber: number;
  lastEpisodeTitle: string;
  watchedAt: number;
  completedCount: number;
};

function summarizeByAnime(historyItems: WatchHistoryItem[], progressItems: WatchProgressItem[]): AnimeHistoryItem[] {
  const byAnime = new Map<string, AnimeHistoryItem>();

  for (const item of historyItems) {
    const existing = byAnime.get(item.animeId);

    if (!existing) {
      byAnime.set(item.animeId, {
        animeId: item.animeId,
        animeTitle: item.animeTitle,
        lastEpisodeNumber: item.episodeNumber,
        lastEpisodeTitle: item.episodeTitle,
        watchedAt: item.watchedAt,
        completedCount: 1,
      });
      continue;
    }

    const isNewer = item.watchedAt > existing.watchedAt;
    byAnime.set(item.animeId, {
      animeId: existing.animeId,
      animeTitle: existing.animeTitle,
      lastEpisodeNumber: isNewer ? item.episodeNumber : existing.lastEpisodeNumber,
      lastEpisodeTitle: isNewer ? item.episodeTitle : existing.lastEpisodeTitle,
      watchedAt: Math.max(existing.watchedAt, item.watchedAt),
      completedCount: existing.completedCount + 1,
    });
  }

  for (const item of progressItems) {
    const existing = byAnime.get(item.animeId);

    if (!existing) {
      byAnime.set(item.animeId, {
        animeId: item.animeId,
        animeTitle: item.animeTitle,
        lastEpisodeNumber: item.episodeNumber,
        lastEpisodeTitle: item.episodeTitle,
        watchedAt: item.updatedAt,
        completedCount: 0,
      });
      continue;
    }

    if (item.updatedAt > existing.watchedAt) {
      byAnime.set(item.animeId, {
        ...existing,
        lastEpisodeNumber: item.episodeNumber,
        lastEpisodeTitle: item.episodeTitle,
        watchedAt: item.updatedAt,
      });
    }
  }

  return Array.from(byAnime.values()).sort((a, b) => b.watchedAt - a.watchedAt);
}

export default function WatchHistoryPage() {
  const items = useMemo(() => {
    const profile = readLocalProfile();
    return summarizeByAnime(profile.history, profile.progress);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 md:px-8 lg:px-12 pb-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Anime History (Local)</h1>
          <Link href="/" className="text-sm text-gray-300 hover:text-white underline">Back Home</Link>
        </div>

        {!items.length ? (
          <div className="rounded border border-white/10 bg-riko-darker p-5 text-sm text-gray-300">
            No anime history yet. Start watching any episode first.
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-white/10 bg-riko-darker">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-gray-300">
                <tr>
                  <th className="text-left px-4 py-3">Anime</th>
                  <th className="text-left px-4 py-3">Last Episode</th>
                  <th className="text-left px-4 py-3">Completed</th>
                  <th className="text-left px-4 py-3">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.animeId} className="border-t border-white/10">
                    <td className="px-4 py-3">
                      <Link href={`/anime/${item.animeId}`} className="hover:underline">
                        {item.animeTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/watch/${item.animeId}/${item.lastEpisodeNumber}`} className="hover:underline">
                        Ep {item.lastEpisodeNumber} • {item.lastEpisodeTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{item.completedCount}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(item.watchedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
