'use client';

import { useStore } from '@/store/useStore';
import AnimeCard from '@/components/AnimeCard';
import { Bookmark } from 'lucide-react';
import Link from 'next/link';

export default function MyListPage() {
  const { myList } = useStore();

  return (
    <div className="pt-28 pb-20 px-4 md:px-8 lg:px-12 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Bookmark className="w-8 h-8 text-riko-red" />
          My List
        </h1>

        {myList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 gap-y-10 md:gap-x-4">
            {myList.map(anime => (
              <div key={anime.id} className="flex justify-center">
                <AnimeCard anime={anime} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 text-gray-400">
            <Bookmark className="w-20 h-20 mx-auto mb-6 opacity-20" />
            <h2 className="text-2xl font-bold mb-4 text-white">Your list is empty</h2>
            <p className="mb-8">Add shows and movies to your list to easily find them later.</p>
            <Link href="/">
              <button className="bg-white text-black px-8 py-3 rounded font-bold hover:bg-gray-200 transition">
                Find Something to Watch
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
