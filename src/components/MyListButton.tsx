'use client';

import { Plus, Check } from 'lucide-react';
import { Anime } from '@/types/anime';
import { useStore } from '@/store/useStore';

export default function MyListButton({ anime, text = true }: { anime: Anime, text?: boolean }) {
  const { addToMyList, removeFromMyList, isInMyList } = useStore();
  const inList = isInMyList(anime.id);

  const toggleList = () => {
    if (inList) {
      removeFromMyList(anime.id);
    } else {
      addToMyList(anime);
    }
  };

  return (
    <button 
      onClick={toggleList}
      className={`rounded flex items-center justify-center transition-colors bg-riko-darker border-2 border-gray-500 hover:border-white text-white font-bold
        ${text ? 'px-8 py-3 gap-2' : 'w-12 h-12 rounded-full'}
      `}
    >
      {inList ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      {text && <span>{inList ? 'Added to My List' : 'My List'}</span>}
    </button>
  );
}
