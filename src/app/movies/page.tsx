import AnimeGridPage from '@/components/AnimeGridPage';
import { getAnimeMovies } from '@/lib/animeApi';

export default async function MoviesPage() {
  const movies = await getAnimeMovies(48);

  return (
    <AnimeGridPage
      title="Movies"
      description="Anime movies discovered from the catalog."
      data={movies}
      emptyTitle="No movies found"
      emptyMessage="The catalog returned no movie titles right now. Please try again later."
    />
  );
}
