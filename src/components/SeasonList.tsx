import Link from 'next/link';
import { Play } from 'lucide-react';
import { AnimeRelatedShow } from '@/types/anime';

type SeasonListProps = {
  title?: string;
  data: AnimeRelatedShow[];
};

export default function SeasonList({ title = 'Season & Related Story', data }: SeasonListProps) {
  if (data.length === 0) return null;

  return (
    <section className="px-4 md:px-8 lg:px-12 mb-10">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#e5e5e5]">{title}</h2>
          <p className="text-sm text-gray-400 mt-1">Susunan dari related story data, bukan search genre random.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.map(({ relation, anime }) => (
          <Link
            key={`${relation}-${anime.id}`}
            href={`/anime/${anime.id}`}
            className="group flex gap-4 rounded-xl border border-white/10 bg-riko-darker/90 p-3 transition hover:border-white/30 hover:bg-white/5"
          >
            <div className="relative h-28 w-20 flex-none overflow-hidden rounded-lg bg-riko-dark">
              <img src={anime.posterImage} alt={anime.title} className="h-full w-full object-cover transition group-hover:scale-105" />
            </div>

            <div className="min-w-0 flex flex-1 flex-col justify-between">
              <div>
                <span className="inline-flex rounded-full border border-riko-red/40 bg-riko-red/10 px-2 py-0.5 text-xs font-semibold text-riko-red">
                  {relation}
                </span>
                <h3 className="mt-2 line-clamp-2 text-base font-bold text-white group-hover:underline">{anime.title}</h3>
                {anime.altTitle ? <p className="mt-1 line-clamp-1 text-xs text-gray-500">{anime.altTitle}</p> : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span>{anime.year}</span>
                <span>•</span>
                <span>{anime.type}</span>
                <span>•</span>
                <span>{anime.episodes || '?'} eps</span>
                <span className="ml-auto inline-flex items-center gap-1 text-white opacity-80 group-hover:opacity-100">
                  <Play className="h-3.5 w-3.5" fill="currentColor" /> Open
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
