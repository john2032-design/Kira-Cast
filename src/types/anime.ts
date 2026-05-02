export type AnimeEpisode = {
  malId: string;
  number: number;
  title: string;
  aired?: string;
  filler?: boolean;
  recap?: boolean;
};

export type AnimeStatus = 'Airing' | 'Completed' | 'Upcoming';
export type AnimeType = 'TV' | 'Movie' | 'OVA';

export type Anime = {
  id: string;
  title: string;
  description: string;
  posterImage: string;
  bannerImage: string;
  rating: number;
  year: number;
  status: AnimeStatus;
  genres: string[];
  episodes: number;
  type: AnimeType;
  trendingScore: number;
  synopsis?: string;
  altTitle?: string;
  duration?: string;
  studios?: string[];
  trailerUrl?: string;
  trailerEmbedUrl?: string;
  episodesData?: AnimeEpisode[];
  sourceShowId?: string;
  malId?: number;
};

export type AnimeRelatedShow = {
  relation: string;
  anime: Anime;
};
