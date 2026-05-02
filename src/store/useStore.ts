import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Anime } from '../types/anime';

interface StoreState {
  myList: Anime[];
  addToMyList: (anime: Anime) => void;
  removeFromMyList: (animeId: string) => void;
  isInMyList: (animeId: string) => boolean;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      myList: [],
      addToMyList: (anime) => {
        const { myList } = get();
        if (!myList.some((a) => a.id === anime.id)) {
          set({ myList: [...myList, anime] });
        }
      },
      removeFromMyList: (animeId) => {
        set((state) => ({
          myList: state.myList.filter((a) => a.id !== animeId),
        }));
      },
      isInMyList: (animeId) => {
        return get().myList.some((a) => a.id === animeId);
      },
    }),
    {
      name: 'riko-anime-storage',
    }
  )
);
