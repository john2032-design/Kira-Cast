import AnimeCard from '@/components/AnimeCard';
import ErrorState from '@/components/ErrorState';
import { Anime } from '@/types/anime';

type AnimeGridPageProps = {
  title: string;
  description: string;
  data: Anime[];
  emptyTitle?: string;
  emptyMessage?: string;
};

export default function AnimeGridPage({
  title,
  description,
  data,
  emptyTitle = 'No anime found',
  emptyMessage = 'The catalog source returned no content for this page right now.',
}: AnimeGridPageProps) {
  return (
    <div className="min-h-screen px-4 pb-20 pt-32 md:px-8 md:pt-36 lg:px-12">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 md:px-6">
          <h1 className="text-3xl font-black text-white md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400 md:text-base">{description}</p>
        </div>

        {data.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
            {data.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : (
          <ErrorState title={emptyTitle} message={emptyMessage} />
        )}
      </div>
    </div>
  );
}
