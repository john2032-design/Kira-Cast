import { AnimeEpisode } from '@/types/anime';

export const EPISODES_PAGE_SIZE = 100;

export function parseEpisodePageParam(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getEpisodePageForNumber(episodeNumber: number, pageSize = EPISODES_PAGE_SIZE): number {
  if (!Number.isFinite(episodeNumber) || episodeNumber < 1) return 1;
  return Math.max(1, Math.ceil(episodeNumber / pageSize));
}

export function getEpisodePageCount(totalEpisodes: number, pageSize = EPISODES_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(1, totalEpisodes) / pageSize));
}

export function clampEpisodePage(page: number, totalEpisodes: number, pageSize = EPISODES_PAGE_SIZE): number {
  return Math.min(Math.max(1, page), getEpisodePageCount(totalEpisodes, pageSize));
}

export function getEpisodeRange(page: number, totalEpisodes: number, pageSize = EPISODES_PAGE_SIZE) {
  const safePage = clampEpisodePage(page, totalEpisodes, pageSize);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, Math.max(1, totalEpisodes));

  return { start, end };
}

export function createEpisodePageFallback(
  animeId: string,
  page: number,
  totalEpisodes: number,
  pageSize = EPISODES_PAGE_SIZE
): AnimeEpisode[] {
  const range = getEpisodeRange(page, totalEpisodes, pageSize);

  return Array.from({ length: range.end - range.start + 1 }, (_, index) => {
    const episodeNumber = range.start + index;

    return {
      malId: `${animeId}-fallback-${episodeNumber}`,
      number: episodeNumber,
      title: `Episode ${episodeNumber}`,
    };
  });
}
