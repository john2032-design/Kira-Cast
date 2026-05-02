'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { readLocalProfile } from '@/lib/localProfile';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Check, Info } from 'lucide-react';
import { Anime } from '@/types/anime';
import { useStore } from '@/store/useStore';

export default function AnimeCard({ anime }: { anime: Anime }) {
  const [isHovered, setIsHovered] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const canUseHover = useRef(false);

  const { addToMyList, removeFromMyList, isInMyList } = useStore();
  const inList = isInMyList(anime.id);
  const router = useRouter();
  const matchPercentage = Number((anime.rating * 10).toFixed(1));

  const handleListToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click
    e.preventDefault();
    if (inList) {
      removeFromMyList(anime.id);
    } else {
      addToMyList(anime);
    }
  };

  const handleCardClick = () => {
    router.push(`/anime/${anime.id}`);
  };

  const handleMouseEnter = () => {
    canUseHover.current = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)').matches;
    if (!canUseHover.current) return;

    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (cardRef.current) {
      setRect(cardRef.current.getBoundingClientRect());
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!canUseHover.current) return;

    hoverTimeout.current = setTimeout(() => {
      setIsHovered(false);
    }, 220);
  };

  // Close popup on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isHovered) setIsHovered(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isHovered]);

  const lastWatchedText = useMemo(() => {
    const latest = readLocalProfile().progress.find((entry) => entry.animeId === anime.id);
    if (!latest) return null;

    const episodeNumber = Number.isFinite(latest.episodeNumber)
      ? latest.episodeNumber
      : Number(latest.episodeNumber);

    const progressPercent = Number.isFinite(latest.progressPercent)
      ? latest.progressPercent
      : Number(latest.progressPercent);

    if (!Number.isFinite(episodeNumber) || !Number.isFinite(progressPercent)) {
      return null;
    }

    return `Last watched Ep ${Math.max(1, Math.trunc(episodeNumber))} • ${Math.max(0, Math.min(100, Math.round(progressPercent)))}%`;
  }, [anime.id]);

  const renderPopup = () => {
    if (!isHovered || !rect) return null;
    
    // Responsive popup width
    const popupWidth = window.innerWidth < 640 ? 240 : window.innerWidth < 768 ? 280 : 320;
    const cardCenterX = rect.left + rect.width / 2;
    
    let leftPosition = cardCenterX - (popupWidth / 2);
    // Boundary checks
    if (leftPosition < 20) leftPosition = 20;
    else if (leftPosition + popupWidth > window.innerWidth - 20) {
      leftPosition = window.innerWidth - popupWidth - 20;
    }

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1.1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bg-[#141414] rounded-lg shadow-2xl shadow-black/80 z-[9999] overflow-hidden"
          style={{ 
            left: leftPosition, 
            top: rect.top - 40,
            width: popupWidth,
            originX: 0.5, 
            originY: 0.5 
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="w-full aspect-video relative" onClick={handleCardClick}>
            <img
              src={anime.bannerImage}
              alt={anime.title}
              className="w-full h-full object-cover cursor-pointer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent cursor-pointer" />
          </div>
          
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-bold text-lg leading-tight text-white line-clamp-1 cursor-pointer" onClick={handleCardClick}>
              {anime.title}
            </h3>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); router.push(`/watch/${anime.id}/1`); }}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <Play className="w-5 h-5 ml-1" />
              </button>
              <button 
                onClick={handleListToggle}
                className="w-10 h-10 rounded-full bg-riko-darker border-2 border-gray-500 text-white flex items-center justify-center hover:border-white transition-colors"
              >
                {inList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
              <button 
                onClick={handleCardClick}
                className="ml-auto w-10 h-10 rounded-full bg-riko-darker border-2 border-gray-500 text-white flex items-center justify-center hover:border-white transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-sm font-semibold cursor-pointer" onClick={handleCardClick}>
              <span className="text-green-500">{matchPercentage}% Match</span>
              <span className="border border-gray-500 px-1 text-xs">{anime.type}</span>
              <span>{anime.episodes} Episodes</span>
            </div>
            
            <div className="flex gap-2 text-xs text-gray-400 cursor-pointer" onClick={handleCardClick}>
              {anime.genres.slice(0, 3).map((g, i) => (
                <span key={g}>
                  {g} {i < Math.min(2, anime.genres.length - 1) && "•"}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const mounted = typeof window !== 'undefined';

  return (
    <div
      ref={cardRef}
      className="relative w-full h-full flex flex-col gap-2 rounded-md transition-transform duration-300 cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
    >
      <div className={`w-full aspect-[2/3] relative transition-opacity duration-200 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
        <img
          src={anime.posterImage}
          alt={anime.title}
          className="w-full h-full object-cover rounded-md"
        />
      </div>

      <h3 className={`font-semibold text-sm md:text-base transition-opacity duration-200 line-clamp-1 px-1 ${isHovered ? 'opacity-0' : 'text-gray-300 group-hover:text-white opacity-100'}`}>
        {anime.title}
      </h3>
      {!isHovered && lastWatchedText ? (
        <p className="px-1 text-[11px] text-riko-red line-clamp-1">{lastWatchedText}</p>
      ) : null}

      {mounted && createPortal(renderPopup(), document.body)}
    </div>
  );
}
