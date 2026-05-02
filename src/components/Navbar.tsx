'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Anime', href: '/anime' },
    { name: 'Movies', href: '/movies' },
    { name: 'Trending', href: '/trending' },
    { name: 'My List', href: '/my-list' },
    { name: 'History', href: '/internal/history' },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? 'bg-riko-dark/95 backdrop-blur-md shadow-md py-4' : 'bg-transparent py-6'
        } px-4 md:px-8 lg:px-12 flex items-center justify-between`}
      >
        <div className="flex items-center gap-8 lg:gap-12">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="RikoAnime" className="h-9 md:h-11 w-auto object-contain" />
          </Link>

          {/* Desktop Nav */}
          <ul className="hidden md:flex items-center gap-6 text-base font-semibold lg:text-lg">
            {navLinks.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className={`transition-colors hover:text-white ${
                    pathname === link.href ? 'text-white font-semibold' : 'text-riko-light/70'
                  }`}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-4 md:gap-6 text-white">
          <Link href="/search" className="hover:text-riko-light transition-colors">
            <Search className="w-5 h-5 md:w-6 md:h-6" />
          </Link>
          <button className="hover:text-riko-light transition-colors hidden md:block">
            <Bell className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <div className="w-8 h-8 rounded bg-gray-600 hidden md:flex items-center justify-center overflow-hidden border border-gray-500 cursor-pointer hover:border-white transition-colors">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64" alt="User" />
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 z-[100] bg-riko-dark flex flex-col px-8 pt-24"
          >
            <button
              className="absolute top-6 right-6 text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="w-8 h-8" />
            </button>
            <ul className="flex flex-col gap-6 text-2xl font-semibold text-riko-light">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={pathname === link.href ? 'text-white' : ''}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
