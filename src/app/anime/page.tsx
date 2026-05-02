import AnimeGridPage from '@/components/AnimeGridPage';
import { getPopularAnime, getRecentAnime, getTopRatedAnime, getTrendingAnime } from '@/lib/animeApi';

export default async function AnimePage() {
  const [trending, popular, topRated, recent] = await Promise.all([
    getTrendingAnime(18),
    getPopularAnime(18),
    getTopRatedAnime(18),
    getRecentAnime(18),
  ]);

  const anime = [...trending, ...popular, ...topRated, ...recent].filter(
    (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index
  );

  return (
    <AnimeGridPage
      title="Anime"
      description="Browse anime from the catalog, including trending, popular, top rated, and recently updated titles."
      data={anime}
    />
  );
}
