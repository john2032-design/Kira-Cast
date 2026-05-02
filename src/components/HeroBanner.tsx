'use client';

import Link from 'next/link';
import { Play, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Anime } from '@/types/anime';

export default function HeroBanner({ anime }: { anime: Anime }) {
  if (!anime) return null;

  const matchPercentage = Number((anime.rating * 10).toFixed(1));

  return (
    <div className="relative h-[64svh] min-h-[430px] max-h-[660px] w-full md:h-[68svh] md:min-h-[500px] lg:h-[70svh]">
      <div className="absolute inset-0">
        <img
          src={anime.bannerImage}
          alt={anime.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-riko-darker/90 via-riko-darker/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-riko-dark via-riko-dark/20 to-transparent" />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col justify-end px-4 pb-24 pt-28 md:px-8 md:pb-32 lg:w-[60%] lg:px-12 lg:pb-36">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-3xl font-black leading-tight drop-shadow-lg sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
        >
          {anime.title}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold md:text-base"
        >
          <span className="text-green-500">{matchPercentage}% Match</span>
          <span>{anime.year}</span>
          <span className="rounded-sm border border-gray-400 px-2 text-xs md:text-sm">{anime.type}</span>
          <span className="text-gray-300">{anime.episodes} Episodes</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-5 max-w-3xl text-sm text-gray-200 line-clamp-3 drop-shadow-md sm:text-base md:text-lg lg:text-xl"
        >
          {anime.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4"
        >
          <Link href={`/watch/${anime.id}/1`}>
            <button className="flex items-center gap-2 rounded bg-white px-6 py-2 text-lg font-bold text-black transition-colors hover:bg-gray-200 md:px-8 md:py-3">
              <Play fill="currentColor" className="h-6 w-6" />
              Play
            </button>
          </Link>
          <Link href={`/anime/${anime.id}`}>
            <button className="flex items-center gap-2 rounded bg-gray-500/70 px-6 py-2 text-lg font-bold text-white transition-colors hover:bg-gray-500/90 md:px-8 md:py-3">
              <Info className="h-6 w-6" />
              More Info
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
