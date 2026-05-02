import { notFound } from 'next/navigation';
import Link from 'next/link';
import VideoPlayer from '@/components/VideoPlayer';
import EpisodeList from '@/components/EpisodeList';
import EpisodeRangeSelector from '@/components/EpisodeRangeSelector';
import SeasonList from '@/components/SeasonList';
import { getAnimeEpisodesByAnimeId, getAnimeRelatedShowsById, getAnimeWatchData } from '@/lib/animeApi';
import { createEpisodePageFallback, getEpisodePageForNumber, parseEpisodePageParam } from '@/lib/episodePaging';

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; episode: string }>;
  searchParams: Promise<{ episodePage?: string | string[] }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const requestedEpisodePage = parseEpisodePageParam(resolvedSearchParams.episodePage);
  const watchData = await getAnimeWatchData(resolvedParams.id, resolvedParams.episode);

  if (!watchData) {
    notFound();
  }

  const { anime, selectedEpisode, trailerEmbedUrl } = watchData;
  const selectedEpisodePage = getEpisodePageForNumber(selectedEpisode.number);
  const episodePage = requestedEpisodePage || selectedEpisodePage;
  const totalEpisodes = Math.max(anime.episodes || selectedEpisode.number || 1, selectedEpisode.number);
  const pagedEpisodes = await getAnimeEpisodesByAnimeId(anime.id, episodePage);
  const episodes = pagedEpisodes.length > 0 ? pagedEpisodes : createEpisodePageFallback(anime.id, episodePage, totalEpisodes);

  const maxEpisode = totalEpisodes;

  const hasPrevious = selectedEpisode.number > 1;
  const hasNext = selectedEpisode.number < maxEpisode;

  const previousEpisodePath = hasPrevious
    ? `/watch/${anime.id}/${selectedEpisode.number - 1}?episodePage=${getEpisodePageForNumber(selectedEpisode.number - 1)}`
    : undefined;
  const nextEpisodePath = hasNext
    ? `/watch/${anime.id}/${selectedEpisode.number + 1}?episodePage=${getEpisodePageForNumber(selectedEpisode.number + 1)}`
    : undefined;

  const relatedShows = await getAnimeRelatedShowsById(anime.id, 12);

  return (
    <div className="min-h-screen bg-black text-white pt-20">
      <div className="w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6 px-4 pb-12">
        <div className="w-full lg:w-[75%] flex flex-col gap-4">
          {/* VideoPlayer now fetches streaming links client-side via /api/stream */}
          <VideoPlayer
            animeTitle={anime.title}
            episodeTitle={selectedEpisode.title}
            animeId={anime.id}
            malId={anime.malId}
            episodeNumber={selectedEpisode.number}
            trailerEmbedUrl={trailerEmbedUrl}
            nextEpisodePath={nextEpisodePath}
            previousEpisodePath={previousEpisodePath}
            animeBackPath={`/anime/${anime.id}`}
          />

          <div className="p-4 bg-riko-darker rounded-lg border border-gray-800">
            <h1 className="text-2xl font-bold mb-1">{anime.title}</h1>
            <h2 className="text-lg text-gray-400 mb-3">
              Episode {selectedEpisode.number}
              {selectedEpisode.title !== `Episode ${selectedEpisode.number}` && (
                <span className="text-gray-500"> — {selectedEpisode.title}</span>
              )}
            </h2>

            {/* Stream info badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-blue-900/40 border border-blue-700/50 text-blue-300 px-3 py-1 rounded-full text-xs font-medium">
                Adaptive source selection
              </span>
              <span className="bg-riko-dark px-3 py-1 rounded-full text-xs text-gray-400">
                Server-side stream resolver
              </span>
              {selectedEpisode.filler && (
                <span className="bg-yellow-900/40 border border-yellow-700/50 text-yellow-400 px-3 py-1 rounded-full text-xs font-medium">
                  Filler Episode
                </span>
              )}
              {selectedEpisode.recap && (
                <span className="bg-blue-900/40 border border-blue-700/50 text-blue-400 px-3 py-1 rounded-full text-xs font-medium">
                  Recap Episode
                </span>
              )}
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">{anime.synopsis || anime.description}</p>

            {anime.trailerUrl ? (
              <a href={anime.trailerUrl} target="_blank" rel="noreferrer" className="inline-flex mt-4">
                <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-white/20">
                  🎬 Open Trailer
                </button>
              </a>
            ) : null}
          </div>
        </div>

        <div className="w-full lg:w-[25%] bg-riko-darker rounded-lg border border-gray-800 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 bg-riko-dark border-b border-gray-800">
            <h3 className="font-bold text-lg">Episodes</h3>
            <p className="text-xs text-gray-500 mt-0.5">{totalEpisodes} episodes total</p>
            <EpisodeRangeSelector
              basePath={`/watch/${anime.id}/${selectedEpisode.number}`}
              currentPage={episodePage}
              totalEpisodes={totalEpisodes}
              className="mt-3"
              getPageHref={(_page, range) => `/watch/${anime.id}/${range.start}`}
            />
          </div>
          <EpisodeList
            animeId={anime.id}
            episodes={episodes}
            activeEpisode={selectedEpisode.number}
            layout="sidebar"
            bannerImage={anime.bannerImage}
          />
        </div>
      </div>

      {relatedShows.length > 0 ? (
        <div className="max-w-[1600px] mx-auto mt-8">
          <SeasonList title="Season & Related Story" data={relatedShows} />
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto mt-8 px-4 pb-10 text-gray-400 text-sm">
          <p>
            No season list is available for this title yet.{' '}
            <Link href="/search" className="text-white underline">
              Search the catalog
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
