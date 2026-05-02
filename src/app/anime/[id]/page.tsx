import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Play, ThumbsUp, ExternalLink } from 'lucide-react';
import MyListButton from '@/components/MyListButton';
import EpisodeList from '@/components/EpisodeList';
import EpisodeRangeSelector from '@/components/EpisodeRangeSelector';
import SeasonList from '@/components/SeasonList';
import ErrorState from '@/components/ErrorState';
import { getAnimeDetailsById, getAnimeEpisodesByAnimeId, getAnimeRelatedShowsById } from '@/lib/animeApi';
import { createEpisodePageFallback, parseEpisodePageParam } from '@/lib/episodePaging';

export default async function AnimeDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episodePage?: string | string[] }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const episodePage = parseEpisodePageParam(resolvedSearchParams.episodePage) || 1;
  const anime = await getAnimeDetailsById(resolvedParams.id);

  if (!anime) {
    notFound();
  }

  const [episodes, relatedShows] = await Promise.all([
    getAnimeEpisodesByAnimeId(resolvedParams.id, episodePage),
    getAnimeRelatedShowsById(resolvedParams.id, 12),
  ]);

  const totalEpisodes = Math.max(anime.episodes || episodes.length || 1, episodes[episodes.length - 1]?.number || 1);
  const safeEpisodes = episodes.length > 0 ? episodes : createEpisodePageFallback(anime.id, episodePage, totalEpisodes);

  return (
    <div className="pb-20">
      <div className="relative min-h-[680px] w-full pt-24 md:h-[60vh] md:min-h-[620px] md:pt-0 lg:h-[70vh]">
        <div className="absolute inset-0">
          <img src={anime.bannerImage} alt={anime.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-riko-dark via-riko-dark/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-riko-dark/90 via-riko-dark/40 to-transparent" />
        </div>

        <div className="relative z-10 flex min-h-[680px] w-full flex-col justify-end px-4 pb-10 pt-28 md:h-full md:min-h-0 md:px-8 md:pb-12 lg:w-[70%] lg:px-12">
          <h1 className="mb-2 text-3xl font-black leading-tight drop-shadow-lg md:text-6xl">{anime.title}</h1>
          {anime.altTitle ? <p className="mb-4 text-sm text-gray-300 md:text-lg">{anime.altTitle}</p> : null}

          <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold md:mb-6 md:text-base">
            <span className="text-green-500">{anime.rating > 0 ? `${Math.round(anime.rating * 10)}% Match` : 'N/A Match'}</span>
            <span>{anime.year}</span>
            <span className="border border-gray-400 px-2 rounded-sm">{anime.type}</span>
            <span className="text-gray-300">{anime.episodes || safeEpisodes.length} Episodes</span>
            <span className="text-gray-300">{anime.status}</span>
            {anime.duration ? <span className="text-gray-300">{anime.duration}</span> : null}
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3 md:mb-8 md:gap-4">
            <Link href={`/watch/${anime.id}/1`}>
              <button className="flex items-center gap-2 rounded bg-white px-6 py-2.5 text-base font-bold text-black transition-colors hover:bg-gray-200 md:px-8 md:py-3 md:text-lg">
                <Play fill="currentColor" className="w-6 h-6" />
                Play
              </button>
            </Link>

            <MyListButton anime={anime} />

            <button className="w-12 h-12 rounded-full border-2 border-gray-500 flex items-center justify-center hover:border-white transition-colors bg-riko-dark/50 backdrop-blur-sm">
              <ThumbsUp className="w-5 h-5 text-white" />
            </button>

            {anime.trailerUrl ? (
              <a href={anime.trailerUrl} target="_blank" rel="noreferrer" className="inline-flex">
                <button className="px-5 py-3 rounded border border-gray-400 hover:border-white transition-colors inline-flex items-center gap-2 font-semibold">
                  Trailer
                  <ExternalLink className="w-4 h-4" />
                </button>
              </a>
            ) : null}
          </div>

          <p className="max-w-3xl text-sm text-gray-200 line-clamp-4 drop-shadow-md md:text-lg md:line-clamp-5">{anime.synopsis || anime.description}</p>

          <div className="mt-5 flex flex-wrap gap-2 text-sm md:mt-6 md:text-base">
            <span className="text-gray-400">Genres:</span>
            {anime.genres.length > 0 ? (
              anime.genres.map((genre) => (
                <span key={genre} className="text-white hover:underline cursor-pointer">
                  {genre}
                </span>
              ))
            ) : (
              <span className="text-white">Unknown</span>
            )}
          </div>

          {anime.studios && anime.studios.length > 0 ? (
            <div className="mt-2 text-sm text-gray-300">
              <span className="text-gray-400">Studios:</span> {anime.studios.join(', ')}
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-4 md:px-8 lg:px-12 mt-10 mb-16">
        <div className="mb-6 flex flex-col gap-3">
          <div>
            <h2 className="text-2xl font-bold">Episodes</h2>
            <p className="mt-1 text-sm text-gray-400">{totalEpisodes} episodes total. Pick a range supaya page tak berat.</p>
          </div>
          <EpisodeRangeSelector basePath={`/anime/${anime.id}`} currentPage={episodePage} totalEpisodes={totalEpisodes} />
        </div>
        <EpisodeList animeId={anime.id} episodes={safeEpisodes} activeEpisode={0} layout="grid" />
      </div>

      {relatedShows.length > 0 ? (
        <SeasonList data={relatedShows} />
      ) : (
        <div className="px-4 md:px-8 lg:px-12">
          <ErrorState title="No season list found" message="No related story data is available for this title yet." />
        </div>
      )}
    </div>
  );
}
