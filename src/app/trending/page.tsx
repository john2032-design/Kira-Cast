import AnimeGridPage from '@/components/AnimeGridPage';
import { getPopularAnime, getTrendingAnime } from '@/lib/animeApi';

export default async function TrendingPage() {
  const [trending, popular] = await Promise.all([
    getTrendingAnime(36),
    getPopularAnime(24),
  ]);

  const anime = [...trending, ...popular].filter(
    (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index
  );

  return (
    <AnimeGridPage
      title="Trending"
      description="Trending and popular anime from catalog recommendations."
      data={anime}
      emptyTitle="No trending anime found"
      emptyMessage="The catalog returned no trending titles right now. Please try again later."
    />
  );
}
