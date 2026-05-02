import Link from 'next/link';
import { AnimeEpisode } from '@/types/anime';

export default function EpisodeList({
  animeId,
  episodes,
  activeEpisode,
  layout = 'grid',
  bannerImage,
}: {
  animeId: string;
  episodes: AnimeEpisode[];
  activeEpisode: number;
  layout?: 'grid' | 'sidebar';
  bannerImage?: string;
}) {
  const getWatchPath = (episodeNumber: number) => `/watch/${animeId}/${episodeNumber}`;

  if (layout === 'sidebar') {
    return (
      <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
        {episodes.map((episode) => {
          const isActive = episode.number === activeEpisode;

          return (
            <Link href={getWatchPath(episode.number)} key={episode.malId || `${episode.number}`}>
              <div
                className={`p-3 rounded mb-2 transition-colors flex gap-3 ${
                  isActive ? 'bg-riko-red/20 border-l-4 border-riko-red' : 'hover:bg-[#2f2f2f]'
                }`}
              >
                <div className="w-24 aspect-video bg-gray-800 flex-shrink-0 relative">
                  {bannerImage ? <img src={bannerImage} alt="episode" className="w-full h-full object-cover opacity-60" /> : null}
                </div>
                <div className="flex flex-col justify-center">
                  <span className={`text-sm font-semibold ${isActive ? 'text-riko-red' : 'text-white'}`}>
                    Episode {episode.number}
                  </span>
                  <span className="text-xs text-gray-400 line-clamp-1">{episode.title}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {episodes.map((episode) => (
        <Link href={getWatchPath(episode.number)} key={episode.malId || `${episode.number}`}>
          <div className="rounded border border-white/10 bg-riko-darker p-4 transition-colors hover:border-white/30 hover:bg-[#2f2f2f]">
            <h3 className="mb-1 font-bold">Episode {episode.number}</h3>
            <p className="text-xs text-gray-400 line-clamp-2">{episode.title}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
