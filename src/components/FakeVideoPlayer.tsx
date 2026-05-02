'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward, Settings, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function FakeVideoPlayer({ animeTitle, episodeTitle, nextEpisodePath }: { animeTitle: string, episodeTitle: string, nextEpisodePath?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return p + 0.1;
        });
      }, 1000); // Fakes progress
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      if (isPlaying) {
        timeout = setTimeout(() => setShowControls(false), 3000);
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [isPlaying]);

  return (
    <div className="relative w-full aspect-video bg-black group overflow-hidden">
      {/* Fake video source */}
      <img 
        src="https://images.unsplash.com/photo-1541562232579-51fca3bb1bb3?auto=format&fit=crop&w=1920&h=1080&q=80" 
        alt="Video Placeholder"
        className="w-full h-full object-cover opacity-60"
      />
      
      {/* Play/Pause center overlay (optional) */}
      <div 
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {!isPlaying && <Play className="w-20 h-20 text-white/70" fill="currentColor" />}
      </div>

      {/* Controls Overlay */}
      <motion.div 
        initial={{ opacity: 1 }}
        animate={{ opacity: showControls ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 flex flex-col justify-between pointer-events-none"
      >
        {/* Top Controls */}
        <div className="p-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto flex items-center gap-4">
          <Link href={`/anime/1`}> {/* Just a back to detail placeholder */}
            <ArrowLeft className="w-8 h-8 text-white cursor-pointer hover:text-riko-red transition" />
          </Link>
          <div>
            <h2 className="text-white font-bold text-lg">{animeTitle}</h2>
            <p className="text-gray-300 text-sm">{episodeTitle}</p>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="p-6 bg-gradient-to-t from-black/90 to-transparent pointer-events-auto">
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-gray-600 rounded-full mb-4 cursor-pointer relative group/progress">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-riko-red rounded-full"
              style={{ width: `${progress}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-riko-red rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-riko-red transition">
                {isPlaying ? <Pause className="w-8 h-8" fill="currentColor" /> : <Play className="w-8 h-8" fill="currentColor" />}
              </button>
              
              <button onClick={() => setIsMuted(!isMuted)} className="text-white hover:text-riko-red transition">
                {isMuted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
              </button>
              
              <div className="text-white text-sm font-medium">
                {Math.floor((progress / 100) * 24)}:{Math.floor(((progress / 100) * 24 * 60) % 60).toString().padStart(2, '0')} / 24:00
              </div>
            </div>

            <div className="flex items-center gap-6 text-white">
              {nextEpisodePath && (
                <Link href={nextEpisodePath}>
                  <button className="hover:text-riko-red transition flex items-center gap-2">
                    <SkipForward className="w-7 h-7" />
                    <span className="hidden sm:inline font-medium text-sm">Next Episode</span>
                  </button>
                </Link>
              )}
              
              <button className="hover:text-riko-red transition">
                <Settings className="w-7 h-7" />
              </button>
              
              <button className="hover:text-riko-red transition">
                <Maximize className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
