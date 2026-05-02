import { Anime, AnimeEpisode, AnimeRelatedShow, AnimeStatus, AnimeType } from '@/types/anime';
import { EPISODES_PAGE_SIZE } from '@/lib/episodePaging';

const ALLANIME_API = process.env.NEXT_PUBLIC_ALLANIME_API || 'https://api.allanime.day/api';
const ALLANIME_REFERER = process.env.NEXT_PUBLIC_ALLANIME_REFERER || 'https://allmanga.to';
const AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

const FALLBACK_POSTER = 'https://picsum.photos/seed/riko-fallback-poster/600/900';
const FALLBACK_BANNER = 'https://picsum.photos/seed/riko-fallback-banner/1920/1080';

const LIST_CACHE_TTL_MS = 1000 * 60 * 5;

type AllanimeSeason = {
  quarter?: string;
  year?: number;
};

type AllanimeAvailableEpisodes = {
  sub?: number;
  dub?: number;
  raw?: number;
};

type AllanimeAvailableEpisodesDetail = {
  sub?: Array<string | number>;
  dub?: Array<string | number>;
  raw?: Array<string | number>;
};

type AllanimeRelatedShow = {
  relation?: string | null;
  showId?: string | null;
};

type AllanimeShow = {
  _id?: string;
  malId?: string | number | null;
  name?: string | null;
  englishName?: string | null;
  nativeName?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  banner?: string | null;
  score?: number | null;
  type?: string | null;
  status?: string | null;
  genres?: string[] | null;
  studios?: string[] | null;
  season?: AllanimeSeason | null;
  episodeCount?: number | string | null;
  episodeDuration?: number | string | null;
  availableEpisodes?: AllanimeAvailableEpisodes | null;
  availableEpisodesDetail?: AllanimeAvailableEpisodesDetail | null;
  relatedShows?: AllanimeRelatedShow[] | null;
  prevideos?: string[] | null;
  popularity?: number | string | null;
};

type ShowsQueryData = {
  shows?: {
    edges?: AllanimeShow[] | null;
  } | null;
};

type ShowQueryData = {
  show?: AllanimeShow | null;
};

type ShowsWithIdsData = {
  showsWithIds?: AllanimeShow[] | null;
};

type PopularRecommendation = {
  pageStatus?: {
    showId?: string | null;
    rangeViews?: string | number | null;
  } | null;
  anyCard?: {
    _id?: string | null;
  } | null;
};

type PopularQueryData = {
  queryPopular?: {
    recommendations?: PopularRecommendation[] | null;
  } | null;
};

type GraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

const SEARCH_GQL =
  'query( $search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType ) { shows( search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin ) { edges { _id malId name englishName nativeName description thumbnail banner score type status genres studios season episodeCount episodeDuration availableEpisodes prevideos popularity } }}';

const SHOW_GQL =
  'query($showId: String!) { show(_id: $showId) { _id malId name englishName nativeName description thumbnail banner score type status genres studios season episodeCount episodeDuration availableEpisodes availableEpisodesDetail relatedShows prevideos popularity } }';

const SHOWS_WITH_IDS_GQL =
  'query($ids: [String!]!) { showsWithIds(ids: $ids) { _id malId name englishName nativeName description thumbnail banner score type status genres studios season episodeCount episodeDuration availableEpisodes prevideos popularity } }';

const POPULAR_GQL =
  'query($type: VaildPopularTypeEnumType!, $size: Int!, $allowAdult: Boolean, $allowUnknown: Boolean, $dateRange: Int) { queryPopular(type: $type, size: $size, allowAdult: $allowAdult, allowUnknown: $allowUnknown, dateRange: $dateRange) { recommendations { pageStatus { showId rangeViews } anyCard { _id } } } }';

let discoveryCache: { savedAt: number; data: Anime[] } | null = null;
const popularCache = new Map<string, { savedAt: number; data: Anime[] }>();

function isFresh(savedAt: number) {
  return Date.now() - savedAt < LIST_CACHE_TTL_MS;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeImageUrl(value: string | null | undefined, fallback: string): string {
  if (!value || !value.trim()) return fallback;

  const clean = value.trim();
  if (clean.startsWith('https://') || clean.startsWith('http://')) return clean;
  if (clean.startsWith('//')) return `https:${clean}`;
  if (clean.startsWith('/')) return `https://allanime.day${clean}`;
  return `https://allanime.day/${clean}`;
}

function cleanDescription(value: string | null | undefined): string {
  if (!value) return 'Synopsis is not available for this title.';

  const plain = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x2014;/g, '—')
    .replace(/&#x2019;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return plain || 'Synopsis is not available for this title.';
}

function mapStatus(statusRaw: string | null | undefined): AnimeStatus {
  const value = (statusRaw || '').toLowerCase();
  if (value.includes('finish') || value.includes('complete')) return 'Completed';
  if (value.includes('upcoming') || value.includes('not yet')) return 'Upcoming';
  return 'Airing';
}

function mapType(typeRaw: string | null | undefined): AnimeType {
  const value = (typeRaw || '').toLowerCase();
  if (value.includes('movie')) return 'Movie';
  if (value.includes('ova')) return 'OVA';
  return 'TV';
}

function getEpisodeCount(show: AllanimeShow): number {
  const fromAvailable = parseNumber(show.availableEpisodes?.sub);
  if (fromAvailable && fromAvailable > 0) return Math.round(fromAvailable);

  const fromEpisodeCount = parseNumber(show.episodeCount);
  if (fromEpisodeCount && fromEpisodeCount > 0) return Math.round(fromEpisodeCount);

  return 0;
}

function getDurationLabel(show: AllanimeShow): string | undefined {
  const raw = parseNumber(show.episodeDuration);
  if (!raw || raw <= 0) return undefined;

  const minutes = raw > 1000 ? Math.round(raw / 60000) : Math.round(raw);
  return minutes > 0 ? `${minutes} min` : undefined;
}

function extractTrailerId(prevideos: string[] | null | undefined): string | null {
  const first = (prevideos || []).find((item) => typeof item === 'string' && item.trim());
  if (!first) return null;

  const clean = first.trim();
  if (/^[a-zA-Z0-9_-]{8,15}$/.test(clean)) return clean;

  const match = clean.match(/(?:v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]{8,15})/);
  return match?.[1] || null;
}

function toAnime(show: AllanimeShow, trendingOverride?: number): Anime | null {
  const showId = (show._id || '').trim();
  if (!showId) return null;

  const title =
    (show.englishName || '').trim() ||
    (show.name || '').trim() ||
    (show.nativeName || '').trim() ||
    'Untitled Anime';

  const altTitle = ((show.name || '').trim() && (show.name || '').trim() !== title)
    ? (show.name || '').trim()
    : ((show.nativeName || '').trim() && (show.nativeName || '').trim() !== title)
      ? (show.nativeName || '').trim()
      : undefined;

  const trailerId = extractTrailerId(show.prevideos);
  const rawScore = parseNumber(show.score) || 0;
  const score = Number(rawScore.toFixed(1));
  const seasonYear = parseNumber(show.season?.year);
  const malId = parseNumber(show.malId);

  const trendingScore =
    trendingOverride ??
    parseNumber(show.popularity) ??
    parseNumber(show.availableEpisodes?.sub) ??
    parseNumber(show.score) ??
    0;

  return {
    id: showId,
    sourceShowId: showId,
    malId: malId && malId > 0 ? Math.trunc(malId) : undefined,
    title,
    altTitle,
    description: cleanDescription(show.description),
    synopsis: cleanDescription(show.description),
    posterImage: normalizeImageUrl(show.thumbnail, FALLBACK_POSTER),
    bannerImage: normalizeImageUrl(show.banner || show.thumbnail, FALLBACK_BANNER),
    rating: score,
    year: seasonYear && seasonYear > 1900 ? Math.round(seasonYear) : new Date().getFullYear(),
    status: mapStatus(show.status),
    genres: (show.genres || []).filter(Boolean),
    episodes: getEpisodeCount(show),
    type: mapType(show.type),
    trendingScore,
    duration: getDurationLabel(show),
    studios: (show.studios || []).filter(Boolean),
    trailerUrl: trailerId ? `https://www.youtube.com/watch?v=${trailerId}` : undefined,
    trailerEmbedUrl: trailerId
      ? `https://www.youtube-nocookie.com/embed/${trailerId}?enablejsapi=1&wmode=opaque&autoplay=1`
      : undefined,
  };
}

function dedupeAnime(items: Anime[]): Anime[] {
  const seen = new Set<string>();
  const unique: Anime[] = [];

  for (const anime of items) {
    if (seen.has(anime.id)) continue;
    seen.add(anime.id);
    unique.push(anime);
  }

  return unique;
}

function normalizeRelationLabel(value: string | null | undefined): string {
  const clean = (value || 'related').replace(/_/g, ' ').trim().toLowerCase();
  if (!clean) return 'Related';

  return clean
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function uniqueRelatedShows(show: AllanimeShow): AllanimeRelatedShow[] {
  const seen = new Set<string>();
  const items: AllanimeRelatedShow[] = [];

  for (const related of show.relatedShows || []) {
    const showId = (related.showId || '').trim();
    if (!showId || showId === show._id || seen.has(showId)) continue;
    seen.add(showId);
    items.push({ showId, relation: related.relation || 'related' });
  }

  return items;
}

async function allanimePost<T>(query: string, variables: unknown, revalidate = 180): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (typeof window === 'undefined') {
    headers.Referer = ALLANIME_REFERER;
    headers['User-Agent'] = AGENT;
  }

  const requestInit: RequestInit & { next?: { revalidate: number } } = {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  };

  if (typeof window === 'undefined') {
    requestInit.next = { revalidate };
  }

  const response = await fetch(ALLANIME_API, requestInit);
  if (!response.ok) {
    throw new Error(`Catalog request failed: ${response.status}`);
  }

  const payload = (await response.json()) as GraphQlResponse<T>;
  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || 'Catalog GraphQL failed');
  }

  if (!payload.data) {
    throw new Error('Catalog returned empty payload');
  }

  return payload.data;
}

async function fetchShowsBySearch(
  query: string,
  page = 1,
  limit = 24,
  countryOrigin: 'ALL' | 'JP' = 'ALL',
  revalidate = 180
): Promise<AllanimeShow[]> {
  const data = await allanimePost<ShowsQueryData>(
    SEARCH_GQL,
    {
      search: { allowAdult: false, allowUnknown: false, query },
      limit,
      page,
      translationType: 'sub',
      countryOrigin,
    },
    revalidate
  );

  return data.shows?.edges || [];
}

async function fetchShowById(showId: string, revalidate = 300): Promise<AllanimeShow | null> {
  const clean = showId.trim();
  if (!clean) return null;

  try {
    const data = await allanimePost<ShowQueryData>(SHOW_GQL, { showId: clean }, revalidate);
    return data.show || null;
  } catch {
    return null;
  }
}

async function fetchShowsWithIds(ids: string[], revalidate = 300): Promise<AllanimeShow[]> {
  if (ids.length === 0) return [];

  const data = await allanimePost<ShowsWithIdsData>(SHOWS_WITH_IDS_GQL, { ids }, revalidate);
  return data.showsWithIds || [];
}

async function fetchPopularRecommendations(size: number, dateRange: number): Promise<PopularRecommendation[]> {
  const data = await allanimePost<PopularQueryData>(
    POPULAR_GQL,
    {
      type: 'anime',
      size,
      allowAdult: false,
      allowUnknown: false,
      dateRange,
    },
    180
  );

  return data.queryPopular?.recommendations || [];
}

async function fetchPopularPool(limit: number, dateRange: number): Promise<Anime[]> {
  const cacheKey = `${limit}:${dateRange}`;
  const cached = popularCache.get(cacheKey);
  if (cached && isFresh(cached.savedAt)) {
    return cached.data;
  }

  const recommendations = await fetchPopularRecommendations(Math.max(limit * 4, 40), dateRange);

  const viewsByShowId = new Map<string, number>();
  for (const recommendation of recommendations) {
    const showId = recommendation.pageStatus?.showId || recommendation.anyCard?._id || null;
    if (!showId) continue;
    const views = parseNumber(recommendation.pageStatus?.rangeViews) || 0;
    if (!viewsByShowId.has(showId)) {
      viewsByShowId.set(showId, views);
    }
  }

  const showIds = Array.from(viewsByShowId.keys());
  const shows = await fetchShowsWithIds(showIds);

  const items = dedupeAnime(
    shows
      .map((show) => {
        const id = show._id || '';
        const views = viewsByShowId.get(id) || 0;
        return toAnime(show, views);
      })
      .filter((anime): anime is Anime => Boolean(anime))
  );

  const sorted = items
    .sort((a, b) => b.trendingScore - a.trendingScore || b.rating - a.rating)
    .slice(0, limit);

  popularCache.set(cacheKey, { savedAt: Date.now(), data: sorted });
  return sorted;
}

async function getDiscoveryPool(): Promise<Anime[]> {
  if (discoveryCache && isFresh(discoveryCache.savedAt)) {
    return discoveryCache.data;
  }

  const [page1, page2] = await Promise.all([
    fetchShowsBySearch('', 1, 60, 'JP', 300),
    fetchShowsBySearch('', 2, 60, 'JP', 300),
  ]);

  const mapped = dedupeAnime(
    [...page1, ...page2]
      .map((show) => toAnime(show))
      .filter((anime): anime is Anime => Boolean(anime))
  );

  discoveryCache = {
    savedAt: Date.now(),
    data: mapped,
  };

  return mapped;
}

async function resolveShowByInput(input: string): Promise<AllanimeShow | null> {
  const clean = input.trim();
  if (!clean) return null;

  const direct = await fetchShowById(clean);
  if (direct?._id) return direct;

  if (!/^\d+$/.test(clean)) {
    return null;
  }

  const candidates = await fetchShowsBySearch(clean, 1, 40, 'ALL', 120);
  const exactMal = candidates.find((item) => String(item.malId || '') === clean);
  return exactMal || null;
}

async function fetchEpisodeNumbers(showId: string): Promise<number[]> {
  const show = await fetchShowById(showId, 300);
  if (!show) return [];

  const fromDetail = (show.availableEpisodesDetail?.sub || [])
    .map((value) => parseNumber(value))
    .filter((value): value is number => value !== null && Number.isInteger(value) && value > 0)
    .map((value) => Math.trunc(value));

  if (fromDetail.length > 0) {
    return Array.from(new Set(fromDetail)).sort((a, b) => a - b);
  }

  const total = parseNumber(show.availableEpisodes?.sub);
  if (!total || total < 1) return [];

  const max = Math.min(Math.trunc(total), 5000);
  return Array.from({ length: max }, (_, index) => index + 1);
}

export async function getTrendingAnime(limit = 10): Promise<Anime[]> {
  try {
    return await fetchPopularPool(limit, 7);
  } catch {
    return [];
  }
}

export async function getPopularAnime(limit = 10): Promise<Anime[]> {
  try {
    return await fetchPopularPool(limit, 30);
  } catch {
    return [];
  }
}

export async function getTopRatedAnime(limit = 10): Promise<Anime[]> {
  try {
    const pool = await getDiscoveryPool();
    return [...pool]
      .filter((anime) => anime.rating > 0)
      .sort((a, b) => b.rating - a.rating || b.episodes - a.episodes)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getRecentAnime(limit = 10): Promise<Anime[]> {
  try {
    const pool = await getDiscoveryPool();
    return [...pool]
      .filter((anime) => anime.status === 'Airing')
      .sort((a, b) => b.year - a.year || b.trendingScore - a.trendingScore)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getAnimeMovies(limit = 10): Promise<Anime[]> {
  try {
    const pool = await getDiscoveryPool();
    const movies = pool.filter((anime) => anime.type === 'Movie').slice(0, limit);
    if (movies.length >= limit) return movies;

    const searchResult = await searchAnime('movie', 1, limit * 4);
    const merged = dedupeAnime([...movies, ...searchResult.data.filter((anime) => anime.type === 'Movie')]);
    return merged.slice(0, limit);
  } catch {
    return [];
  }
}

export async function searchAnime(
  query: string,
  page = 1,
  limit = 24
): Promise<{ data: Anime[]; hasNextPage: boolean }> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { data: [], hasNextPage: false };
  }

  try {
    const edges = await fetchShowsBySearch(cleanQuery, page, limit, 'ALL', 120);
    const mapped = dedupeAnime(
      edges
        .map((show) => toAnime(show))
        .filter((anime): anime is Anime => Boolean(anime))
    );

    return {
      data: mapped,
      hasNextPage: edges.length >= limit,
    };
  } catch {
    return { data: [], hasNextPage: false };
  }
}

export async function getAnimeDetailsById(id: string): Promise<Anime | null> {
  try {
    const show = await resolveShowByInput(id);
    if (!show) return null;

    return toAnime(show);
  } catch {
    return null;
  }
}

export async function getAnimeRelatedShowsById(id: string, limit = 24): Promise<AnimeRelatedShow[]> {
  try {
    const show = await resolveShowByInput(id);
    if (!show?._id) return [];

    const related = uniqueRelatedShows(show);
    if (related.length === 0) return [];

    const candidates = related.slice(0, Math.min(related.length, Math.max(limit * 2, limit)));
    const shows = await fetchShowsWithIds(candidates.map((item) => item.showId || ''));
    const animeById = new Map(
      shows
        .map((item) => {
          const anime = toAnime(item);
          return anime ? [item._id || '', anime] as const : null;
        })
        .filter((item): item is readonly [string, Anime] => Boolean(item))
    );

    return candidates
      .map((item) => {
        const showId = item.showId || '';
        const anime = animeById.get(showId);
        return anime ? { relation: normalizeRelationLabel(item.relation), anime } : null;
      })
      .filter((item): item is AnimeRelatedShow => Boolean(item))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getAnimeEpisodesByAnimeId(id: string, page = 1): Promise<AnimeEpisode[]> {
  try {
    const show = await resolveShowByInput(id);
    if (!show?._id) return [];

    const numbers = await fetchEpisodeNumbers(show._id);
    if (numbers.length === 0) return [];

    const safePage = Math.max(1, page);
    const start = (safePage - 1) * EPISODES_PAGE_SIZE;
    const selected = numbers.slice(start, start + EPISODES_PAGE_SIZE);

    return selected.map((episodeNumber) => ({
      malId: `${show._id}-${episodeNumber}`,
      number: episodeNumber,
      title: `Episode ${episodeNumber}`,
    }));
  } catch {
    return [];
  }
}

export async function getAnimeWatchData(animeId: string, episodeNumber: string) {
  const anime = await getAnimeDetailsById(animeId);
  if (!anime) return null;

  const episodes = await getAnimeEpisodesByAnimeId(anime.id, 1);
  const parsedEpisode = Number(episodeNumber);

  if (!Number.isInteger(parsedEpisode) || parsedEpisode < 1) {
    return null;
  }

  const fromList = episodes.find((episode) => episode.number === parsedEpisode);

  const fallbackEpisode: AnimeEpisode = {
    malId: `${anime.id}-${parsedEpisode}`,
    number: parsedEpisode,
    title: `Episode ${parsedEpisode}`,
  };

  const selectedEpisode = fromList || fallbackEpisode;

  return {
    anime: {
      ...anime,
      episodesData: episodes,
    },
    episodes,
    selectedEpisode,
    streamUrl: null as string | null,
    trailerEmbedUrl: anime.trailerEmbedUrl,
  };
}
