import Link from 'next/link';
import { clampEpisodePage, getEpisodePageCount, getEpisodeRange } from '@/lib/episodePaging';

type EpisodeRangeSelectorProps = {
  basePath: string;
  currentPage: number;
  totalEpisodes: number;
  pageSize?: number;
  className?: string;
  getPageHref?: (page: number, range: { start: number; end: number }) => string;
};

export default function EpisodeRangeSelector({
  basePath,
  currentPage,
  totalEpisodes,
  pageSize,
  className = '',
  getPageHref,
}: EpisodeRangeSelectorProps) {
  const pageCount = getEpisodePageCount(totalEpisodes, pageSize);
  const safePage = clampEpisodePage(currentPage, totalEpisodes, pageSize);

  if (pageCount <= 1) return null;

  return (
    <div className={`flex gap-2 overflow-x-auto hide-scrollbar pb-2 ${className}`}>
      {Array.from({ length: pageCount }, (_, index) => {
        const page = index + 1;
        const range = getEpisodeRange(page, totalEpisodes, pageSize);
        const isActive = page === safePage;

        return (
          <Link
            key={page}
            href={getPageHref ? getPageHref(page, range) : `${basePath}?episodePage=${page}`}
            scroll={false}
            className={`flex-none rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              isActive
                ? 'border-riko-red bg-riko-red text-white'
                : 'border-white/10 bg-riko-darker text-gray-300 hover:border-white/40 hover:text-white'
            }`}
          >
            {range.start}-{range.end}
          </Link>
        );
      })}
    </div>
  );
}
