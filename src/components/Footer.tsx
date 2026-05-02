import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-black px-4 pb-8 pt-12 text-sm text-gray-500 md:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="inline-flex w-fit">
            <img src="/logo.png" alt="RikoAnime" className="h-8 w-auto object-contain opacity-90" />
          </Link>

          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-gray-400">
            <Link href="/" className="transition hover:text-white">Home</Link>
            <Link href="/anime" className="transition hover:text-white">Anime</Link>
            <Link href="/movies" className="transition hover:text-white">Movies</Link>
            <Link href="/trending" className="transition hover:text-white">Trending</Link>
            <Link href="/search" className="transition hover:text-white">Search</Link>
          </nav>
        </div>

        <p className="mt-6 max-w-2xl leading-relaxed text-gray-600">
          RikoAnime is built for fast browsing, clean playback, and easy episode navigation.
        </p>
      </div>
    </footer>
  );
}
