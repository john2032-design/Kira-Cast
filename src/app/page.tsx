import HeroBanner from '@/components/HeroBanner';
import AnimeRow from '@/components/AnimeRow';
import ContinueWatchingRow from '@/components/ContinueWatchingRow';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorState from '@/components/ErrorState';
import {
  getTrendingAnime,
  getPopularAnime,
  getTopRatedAnime,
  getRecentAnime,
  getAnimeMovies,
} from '@/lib/animeApi';

export default async function Home() {
  let sections: [
    Awaited<ReturnType<typeof getTrendingAnime>>,
    Awaited<ReturnType<typeof getPopularAnime>>,
    Awaited<ReturnType<typeof getTopRatedAnime>>,
    Awaited<ReturnType<typeof getRecentAnime>>,
    Awaited<ReturnType<typeof getAnimeMovies>>,
  ] | null = null;

  try {
    sections = await Promise.all([
      getTrendingAnime(24),
      getPopularAnime(24),
      getTopRatedAnime(24),
      getRecentAnime(24),
      getAnimeMovies(24),
    ]);
  } catch {
    sections = null;
  }

  if (!sections) {
    return (
      <div className="pt-28 pb-20 px-4 md:px-8 lg:px-12 max-w-7xl mx-auto">
        <ErrorState title="Failed to load homepage" message="The catalog source is temporarily unavailable." />
        <div className="mt-10">
          <LoadingSkeleton variant="row" count={6} />
        </div>
      </div>
    );
  }

  const [trending, popular, topRated, recent, movies] = sections;
  const heroAnime = trending[0] || popular[0] || topRated[0] || recent[0] || movies[0];

  if (!heroAnime) {
    return (
      <div className="pt-28 pb-20 px-4 md:px-8 lg:px-12">
        <ErrorState
          title="No anime data available"
          message="The legal API returned no content right now. Please try again later."
        />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <HeroBanner anime={heroAnime} />

      <div className="relative z-20 -mt-14 sm:-mt-16 md:-mt-20 lg:-mt-24">
        <ContinueWatchingRow />
        <AnimeRow title="Trending Now" data={trending} />
        <AnimeRow title="Popular Anime" data={popular} />
        <AnimeRow title="Top Rated" data={topRated} />
        <AnimeRow title="Recently Updated" data={recent} />
        <AnimeRow title="Anime Movies" data={movies} />
      </div>
    </div>
  );
}
