'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AnimeCard from '@/components/AnimeCard';
import SearchBar from '@/components/SearchBar';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorState from '@/components/ErrorState';
import EmptyState from '@/components/EmptyState';
import { searchAnime } from '@/lib/animeApi';
import { Anime } from '@/types/anime';

const SEARCH_DELAY_MS = 350;

export default function SearchResultsClient() {
  const [query, setQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Anime[]>([]);
  const [lastKeyword, setLastKeyword] = useState('');

  const allGenres = useMemo(() => Array.from(new Set(results.flatMap((anime) => anime.genres))).sort(), [results]);
  const allYears = useMemo(
    () =>
      Array.from(new Set(results.map((anime) => anime.year)))
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => b - a),
    [results]
  );

  const filteredResults = useMemo(() => {
    return results.filter((anime) => {
      const matchesGenre = genre ? anime.genres.includes(genre) : true;
      const matchesYear = year ? anime.year.toString() === year : true;
      return matchesGenre && matchesYear;
    });
  }, [results, genre, year]);

  const performSearch = useCallback(async (keyword: string) => {
    const clean = keyword.trim();
    setQuery(clean);
    setError(null);

    if (!clean) {
      setResults([]);
      setLastKeyword('');
      return;
    }

    setIsLoading(true);

    try {
      const response = await searchAnime(clean, 1, 24);
      setResults(response.data);
      setLastKeyword(clean);
    } catch {
      setError('Search is temporarily unavailable. Please try again.');
      setResults([]);
      setLastKeyword(clean);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void performSearch(inputValue);
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [inputValue, performSearch]);

  const handleRetry = useCallback(() => {
    void performSearch(lastKeyword || inputValue);
  }, [performSearch, lastKeyword, inputValue]);

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 items-center mb-10">
        <SearchBar value={inputValue} onChange={handleInputChange} placeholder="Search for anime..." />


        <select
          className="bg-riko-darker border border-gray-700 text-white px-4 py-3 rounded focus:outline-none focus:border-white transition w-full md:w-auto"
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
        >
          <option value="">All Genres</option>
          {allGenres.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          className="bg-riko-darker border border-gray-700 text-white px-4 py-3 rounded focus:outline-none focus:border-white transition w-full md:w-auto"
          value={year}
          onChange={(event) => setYear(event.target.value)}
        >
          <option value="">All Years</option>
          {allYears.map((value) => (
            <option key={value} value={value.toString()}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? <LoadingSkeleton variant="grid" count={12} /> : null}

      {!isLoading && error ? <ErrorState title="Search failed" message={error} onRetry={handleRetry} /> : null}

      {!isLoading && !error && query.length === 0 ? <EmptyState title="Start searching" message="Type an anime title to see results." /> : null}

      {!isLoading && !error && query.length > 0 && filteredResults.length === 0 ? (
        <EmptyState title="No results found" message="Try another keyword or adjust your filters." />
      ) : null}

      {!isLoading && !error && filteredResults.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 gap-y-10 md:gap-x-4">
          {filteredResults.map((anime) => (
            <div key={anime.id} className="flex justify-center">
              <AnimeCard anime={anime} />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}