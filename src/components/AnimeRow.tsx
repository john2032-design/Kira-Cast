'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AnimeCard from './AnimeCard';
import { Anime } from '@/types/anime';

interface AnimeRowProps {
  title: string;
  data: Anime[];
}

export default function AnimeRow({ title, data }: AnimeRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const row = rowRef.current;
    if (!row) return;

    const maxScrollLeft = row.scrollWidth - row.clientWidth;
    setCanScrollLeft(row.scrollLeft > 2);
    setCanScrollRight(row.scrollLeft < maxScrollLeft - 2);
  };

  useEffect(() => {
    updateScrollState();
    const row = rowRef.current;
    if (!row) return;

    row.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      row.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [data.length]);

  const handleScroll = (direction: 'left' | 'right') => {
    const row = rowRef.current;
    if (!row) return;

    const scrollTo = direction === 'left'
      ? row.scrollLeft - row.clientWidth * 0.9
      : row.scrollLeft + row.clientWidth * 0.9;

    row.scrollTo({ left: scrollTo, behavior: 'smooth' });
    requestAnimationFrame(updateScrollState);
  };

  return (
    <div className="mb-10 px-4 md:px-8 lg:px-12 relative group">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-[#e5e5e5] hover:text-white transition cursor-pointer">
        {title}
      </h2>

      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            aria-label={`Scroll ${title} left`}
            className="absolute left-0 top-0 bottom-0 z-[80] w-10 md:w-14 bg-black/60 opacity-100 md:opacity-0 group-hover:opacity-100 transition flex items-center justify-center hover:bg-black/80 rounded-r-md"
            onClick={() => handleScroll('left')}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}

        <div
          ref={rowRef}
          className="flex gap-2 md:gap-4 overflow-x-auto hide-scrollbar scroll-smooth py-4 px-1"
        >
          {data.map((anime, index) => (
            <div key={`${anime.id}-${index}`} className="flex-none w-[160px] sm:w-[200px] md:w-[240px]">
              <AnimeCard anime={anime} />
            </div>
          ))}
        </div>

        {canScrollRight && (
          <button
            type="button"
            aria-label={`Scroll ${title} right`}
            className="absolute right-0 top-0 bottom-0 z-[80] w-10 md:w-14 bg-black/60 opacity-100 md:opacity-0 group-hover:opacity-100 transition flex items-center justify-center hover:bg-black/80 rounded-l-md"
            onClick={() => handleScroll('right')}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}
      </div>
    </div>
  );
}
