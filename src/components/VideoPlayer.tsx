'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getAutoNextCountdown,
  getControlsVisibility,
  getSkipTimelineSegments,
  getSurfaceTapAction,
  getTapAction,
  shouldAutoHideControls,
  shouldAutoSkipSegment,
  shouldTriggerAutoNext,
} from '@/lib/playerControls.mjs';
import { shouldUseCssLandscapeFallback } from '@/lib/playerFullscreenMode.mjs';
import {
  appendWatchHistory,
  readLocalProfile,
  removeWatchProgress,
  setAutoNextEnabled,
  setHotkeyHintDismissed,
  setPlaybackRate,
  setQualityPreference,
  upsertSourceHealth,
  upsertWatchProgress,
} from '@/lib/localProfile';
import Link from 'next/link';
import {
  ArrowLeft,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Loader2,
  WifiOff,
  ChevronDown,
  Keyboard,
} from 'lucide-react';

interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
  type?: 'hls' | 'mp4' | 'iframe';
  provider?: string;
}

interface VideoPlayerProps {
  animeTitle: string;
  episodeTitle: string;
  animeId: string;
  malId?: number;
  episodeNumber: number;
  trailerEmbedUrl?: string;
  nextEpisodePath?: string;
  previousEpisodePath?: string;
  animeBackPath: string;
}

type PlayerState = 'loading' | 'streaming' | 'iframe' | 'trailer' | 'unavailable' | 'error';

type SkipTime = {
  type: 'op' | 'ed';
  startTime: number;
  endTime: number;
};

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenCapableDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msFullscreenElement?: Element | null;
  msExitFullscreen?: () => Promise<void> | void;
};

type FullscreenCapableVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

type OrientationCapable = ScreenOrientation & {
  lock?: (orientation: 'landscape' | 'portrait' | 'any') => Promise<void>;
  unlock?: () => void;
};

function getOrientationApi() {
  return screen.orientation as OrientationCapable | undefined;
}

async function lockLandscapeOrientation() {
  const orientation = getOrientationApi();
  if (orientation?.lock) {
    await orientation.lock('landscape').catch(() => undefined);
  }
}

async function unlockOrientation() {
  const orientation = getOrientationApi();
  orientation?.unlock?.();
}

function readBooleanCookie(name: string) {
  if (typeof document === 'undefined') return false;

  const cookieValue = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.split('=')[1];

  return cookieValue === '1';
}

function writeBooleanCookie(name: string, enabled: boolean) {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=${enabled ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`;
}

export default function VideoPlayer({
  animeTitle,
  episodeTitle,
  animeId,
  malId,
  episodeNumber,
  trailerEmbedUrl,
  nextEpisodePath,
  previousEpisodePath,
  animeBackPath,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapAtRef = useRef<number | null>(null);
  const autoSkippedSegmentRef = useRef<string | null>(null);
  const autoNextTriggeredRef = useRef(false);

  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [activeSource, setActiveSource] = useState<StreamSource | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCssLandscapeFullscreen, setIsCssLandscapeFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isTouchDevice] = useState(() => {
    if (typeof window === 'undefined') return false;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    return coarse || navigator.maxTouchPoints > 0;
  });
  const [buffered, setBuffered] = useState(0);
  const [skipTimes, setSkipTimes] = useState<SkipTime[]>([]);
  const [dismissedSkipKey, setDismissedSkipKey] = useState<string | null>(null);
  const [autoSkipIntro, setAutoSkipIntro] = useState(() => readBooleanCookie('riko_auto_skip_intro'));
  const [autoSkipOutro, setAutoSkipOutro] = useState(() => readBooleanCookie('riko_auto_skip_outro'));
  const [playbackRate, setPlaybackRateState] = useState(() => readLocalProfile().prefs.playbackRate || 1);
  const [autoNextEnabled, setAutoNextEnabledState] = useState(() => readLocalProfile().prefs.autoNextEnabled);
  const [showHotkeyHint, setShowHotkeyHint] = useState(() => !readLocalProfile().prefs.showHotkeyHintDismissed);
  const [showAutoSkipOnboarding, setShowAutoSkipOnboarding] = useState(() => (
    typeof document !== 'undefined' ? !document.cookie.includes('riko_auto_skip_seen=') : false
  ));
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const autoNextCountdown = getAutoNextCountdown({
    autoNextEnabled,
    nextEpisodePath,
    duration,
    currentTime,
    isPlaying,
  });

  const shouldAutoNextNow = shouldTriggerAutoNext({
    autoNextEnabled,
    nextEpisodePath,
    duration,
    currentTime,
  });

  // ── Fetch streaming sources ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchStream() {
      setPlayerState('loading');
      setStreamError(null);

      try {
        const res = await fetch(`/api/stream/${animeId}/${episodeNumber}`);
        const data = await res.json();
        if (cancelled) return;

        if (data.sources && data.sources.length > 0) {
          setSources(data.sources);
          setActiveSource(data.sources[0]);
          // If best source is iframe embed — use iframe player
          if (data.sources[0].type === 'iframe') {
            setPlayerState('iframe');
          } else {
            setPlayerState('streaming');
          }
        } else {
          // Fall back to trailer
          if (trailerEmbedUrl) {
            setPlayerState('trailer');
          } else {
            setStreamError(data.error || 'No stream available');
            setPlayerState('unavailable');
          }
        }
      } catch {
        if (!cancelled) {
          if (trailerEmbedUrl) {
            setPlayerState('trailer');
          } else {
            setStreamError('Failed to fetch streaming data');
            setPlayerState('error');
          }
        }
      }
    }

    fetchStream();
    return () => { cancelled = true; };
  }, [animeId, episodeNumber, trailerEmbedUrl]);

  // ── HLS loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (playerState !== 'streaming' || !activeSource || !videoRef.current) return;

    const video = videoRef.current;
    let hlsInstance: import('hls.js').default | null = null;
    let destroyed = false;
    // Track every listener added to video so we can always remove them on cleanup
    const cleanup: (() => void)[] = [];

    async function safePlay() {
      if (destroyed) return;
      try {
        await video.play();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (err instanceof Error && err.name === 'NotAllowedError') {
          video.muted = false;
          setIsMuted(false);
          setIsPlaying(false);
          setShowControls(true);
          return;
        }
        if (err instanceof Error) {
          console.warn('[player] play error:', err.name, err.message);
        }
      }
    }

    /** Wrap external CDN URLs through our server proxy (adds correct Referer/Origin) */
    function proxyUrl(url: string): string {
      if (url.startsWith('/')) return url;
      try {
        const { hostname } = new URL(url);
        if (hostname === window.location.hostname) return url;
      } catch {
        return url;
      }
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }

    /** Auto-advance to next source on fatal failure */
    function tryNextSource() {
      if (destroyed) return;
      const currentIdx = sources.findIndex((s) => s.url === activeSource?.url);
      const next = sources[currentIdx + 1];
      if (next) {
        setActiveSource(next);
        if (next.type === 'iframe') setPlayerState('iframe');
      } else {
        setStreamError('All sources failed — no playable stream found.');
        setPlayerState('error');
      }
    }

    /** Register a video element listener and queue its removal for cleanup */
    function addListener<K extends keyof HTMLVideoElementEventMap>(
      event: K,
      handler: (e: HTMLVideoElementEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions,
    ) {
      video.addEventListener(event, handler, options);
      cleanup.push(() => video.removeEventListener(event, handler));
    }

    async function setupVideo() {
      if (!activeSource || destroyed) return;
      const srcUrl = proxyUrl(activeSource.url);

      if (activeSource.isM3U8) {
        const Hls = (await import('hls.js')).default;
        if (destroyed) return;

        if (Hls.isSupported()) {
          hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
            xhrSetup: (xhr) => { xhr.withCredentials = false; },
          });
          hlsInstance.loadSource(srcUrl);
          hlsInstance.attachMedia(video);

          // Play only after manifest — avoids AbortError from premature play()
          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => safePlay());

          hlsInstance.on(Hls.Events.ERROR, (_e, data) => {
            if (destroyed) return;
            if (data.fatal) {
              console.warn('[hls] fatal:', data.type, data.details);
              hlsInstance?.destroy();
              hlsInstance = null;
              tryNextSource();
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          video.src = srcUrl;
          addListener('canplay', safePlay, { once: true });
        }
      } else {
        // Direct MP4
        video.src = proxyUrl(activeSource.url);
        addListener('canplay', safePlay, { once: true });
        addListener('error', () => {
          console.warn('[mp4] error, trying next source');
          tryNextSource();
        }, { once: true });
      }
    }

    setupVideo();

    return () => {
      destroyed = true;
      // Remove every tracked listener before destroying HLS
      cleanup.forEach((fn) => fn());
      if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
      }
      // NOTE: do NOT call video.pause() here — it would abort any in-progress
      // play() promise and produce an unhandled AbortError.
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState, activeSource]);


  // ── Video event listeners ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || playerState !== 'streaming') return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
      if (video.buffered.length > 0 && video.duration) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };
    const onDurationChange = () => {
      const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
      setDuration(nextDuration);
    };
    const onVolumeChange = () => {
      setIsMuted(video.muted);
      setVolume(video.volume);
    };
    const onEnded = () => {
      if (!nextEpisodePath || !autoNextEnabled || autoNextTriggeredRef.current) return;
      autoNextTriggeredRef.current = true;
      window.location.href = nextEpisodePath;
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('ended', onEnded);

    // Sync UI with current media element state immediately after mount/switch.
    setIsPlaying(!video.paused);
    setIsMuted(video.muted);
    setVolume(video.volume);
    setCurrentTime(video.currentTime || 0);
    onDurationChange();

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('ended', onEnded);
    };
  }, [autoNextEnabled, nextEpisodePath, playerState, activeSource]);

  // ── Fullscreen listener ──────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => {
      const fullscreenDocument = document as FullscreenCapableDocument;
      const active = Boolean(
        document.fullscreenElement ||
        fullscreenDocument.webkitFullscreenElement ||
        fullscreenDocument.msFullscreenElement
      );

      setIsFullscreen(active);
      if (!active) {
        void unlockOrientation();
      }
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // ── Skip intro/outro timestamps ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchSkipTimes() {
      if (!malId || !episodeNumber || !duration || playerState !== 'streaming') {
        setSkipTimes([]);
        return;
      }

      try {
        const query = new URLSearchParams({
          malId: String(malId),
          episode: String(episodeNumber),
          duration: String(Math.round(duration)),
        });
        const response = await fetch(`/api/skip-times?${query.toString()}`);
        const payload = await response.json() as { results?: SkipTime[] };
        if (!cancelled) setSkipTimes(payload.results || []);
      } catch {
        if (!cancelled) setSkipTimes([]);
      }
    }

    fetchSkipTimes();
    return () => { cancelled = true; };
  }, [malId, episodeNumber, duration, playerState]);

  // ── Controls auto-hide ───────────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    if (shouldAutoHideControls({ isPlaying, isTouchDevice })) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying, isTouchDevice]);

  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    if (showControls && shouldAutoHideControls({ isPlaying, isTouchDevice })) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    };
  }, [showControls, isPlaying, isTouchDevice]);

  const controlsVisible = getControlsVisibility({ showControls, isPlaying, isTouchDevice });

  const toggleSurfaceControls = useCallback(() => {
    const action = getSurfaceTapAction({ showControls: controlsVisible });

    if (action === 'hide-controls') {
      setShowControls(false);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
      return;
    }

    resetControlsTimer();
  }, [controlsVisible, resetControlsTimer]);

  // ── Playback actions ─────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handleSurfaceTap = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;

    const nowMs = Date.now();
    const intent = getTapAction({ nowMs, previousTapMs: lastTapAtRef.current });
    lastTapAtRef.current = intent.nextTapMs;

    if (intent.action === 'toggle-playback') {
      togglePlay();
      return;
    }

    toggleSurfaceControls();
  }, [togglePlay, toggleSurfaceControls]);

  const handleVideoTap = useCallback((event: React.MouseEvent<HTMLVideoElement>) => {
    event.stopPropagation();

    const nowMs = Date.now();
    const intent = getTapAction({ nowMs, previousTapMs: lastTapAtRef.current });
    lastTapAtRef.current = intent.nextTapMs;

    if (intent.action === 'toggle-playback') {
      togglePlay();
      return;
    }

    toggleSurfaceControls();
  }, [togglePlay, toggleSurfaceControls]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const setVideoVolume = (v: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    video.muted = v === 0;
  };

  const seekTo = (pct: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = (pct / 100) * video.duration;
  };

  const seekBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), video.duration);
    resetControlsTimer();
  }, [resetControlsTimer]);

  const skipSegments = getSkipTimelineSegments({ duration, skipTimes });
  const activeSkipTime = skipTimes.find((item) => currentTime >= item.startTime && currentTime < item.endTime);
  const activeSegmentMarker = activeSkipTime
    ? `${activeSkipTime.type}-${activeSkipTime.startTime}-${activeSkipTime.endTime}`
    : null;
  const activeSkipKey = activeSkipTime
    ? `${activeSkipTime.type}-${activeSkipTime.startTime}-${activeSkipTime.endTime}`
    : null;
  const showSkipButton = Boolean(activeSkipTime && activeSkipKey !== dismissedSkipKey);

  useEffect(() => {
    if (!activeSkipKey) return;

    const timeout = setTimeout(() => setDismissedSkipKey(activeSkipKey), 5000);
    return () => clearTimeout(timeout);
  }, [activeSkipKey]);

  useEffect(() => {
    if (!activeSkipTime || !activeSkipKey) {
      autoSkippedSegmentRef.current = null;
      return;
    }

    const segmentAlreadySkipped = autoSkippedSegmentRef.current === activeSkipKey;
    if (segmentAlreadySkipped) return;

    const shouldSkip = shouldAutoSkipSegment({
      segmentType: activeSkipTime.type,
      autoSkipIntro,
      autoSkipOutro,
    });

    if (!shouldSkip) return;

    const video = videoRef.current;
    if (!video) return;

    autoSkippedSegmentRef.current = activeSkipKey;
    video.currentTime = activeSkipTime.endTime;
    resetControlsTimer();
  }, [activeSkipKey, activeSkipTime, autoSkipIntro, autoSkipOutro, resetControlsTimer]);

  useEffect(() => {
    autoSkippedSegmentRef.current = null;
  }, [activeSource?.url, episodeNumber]);

  useEffect(() => {
    writeBooleanCookie('riko_auto_skip_intro', autoSkipIntro);
  }, [autoSkipIntro]);

  useEffect(() => {
    writeBooleanCookie('riko_auto_skip_outro', autoSkipOutro);
  }, [autoSkipOutro]);

  useEffect(() => {
    if (showHotkeyHint) return;

    setHotkeyHintDismissed(true);
  }, [showHotkeyHint]);

  useEffect(() => {
    if (!showAutoSkipOnboarding) return;

    writeBooleanCookie('riko_auto_skip_seen', true);
    const timeout = setTimeout(() => setShowAutoSkipOnboarding(false), 6500);
    return () => clearTimeout(timeout);
  }, [showAutoSkipOnboarding]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playerState !== 'streaming') return;

    video.playbackRate = playbackRate;
  }, [playbackRate, playerState]);

  useEffect(() => {
    setPlaybackRate(playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    setAutoNextEnabled(autoNextEnabled);
  }, [autoNextEnabled]);

  useEffect(() => {
    if (!showQualityMenu && !showSpeedMenu) return;

    const closeMenus = () => {
      setShowQualityMenu(false);
      setShowSpeedMenu(false);
    };

    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, [showQualityMenu, showSpeedMenu]);

  useEffect(() => {
    if (!showHotkeyHint) return;

    const timeout = setTimeout(() => setShowHotkeyHint(false), 8000);
    return () => clearTimeout(timeout);
  }, [showHotkeyHint]);

  useEffect(() => {
    if (!nextEpisodePath || !shouldAutoNextNow || autoNextTriggeredRef.current) return;

    autoNextTriggeredRef.current = true;
    window.location.href = nextEpisodePath;
  }, [nextEpisodePath, shouldAutoNextNow]);

  useEffect(() => {
    autoNextTriggeredRef.current = false;
  }, [nextEpisodePath, episodeNumber, activeSource?.url]);

  useEffect(() => {
    if (autoNextEnabled) return;
    autoNextTriggeredRef.current = false;
  }, [autoNextEnabled]);

  useEffect(() => {
    if (!shouldAutoNextNow) return;
    if (playerState === 'streaming') return;

    if (!nextEpisodePath || !autoNextEnabled || autoNextTriggeredRef.current) return;

    autoNextTriggeredRef.current = true;
    window.location.href = nextEpisodePath;
  }, [autoNextEnabled, nextEpisodePath, playerState, shouldAutoNextNow]);

  const preferredSourceUrl = readLocalProfile().prefs.qualityByAnimeId[animeId];

  useEffect(() => {
    if (!preferredSourceUrl || !sources.length || activeSource?.url) return;

    const matched = sources.find((source) => source.url === preferredSourceUrl);
    if (!matched) return;

    queueMicrotask(() => setActiveSource(matched));
  }, [activeSource?.url, preferredSourceUrl, sources]);

  useEffect(() => {
    if (!activeSource) return;

    setQualityPreference(animeId, activeSource.url);
    upsertSourceHealth({
      provider: activeSource.provider || 'Unknown',
      quality: activeSource.quality,
      status: 'success',
    });
  }, [activeSource, animeId]);

  useEffect(() => {
    if (!activeSource || !streamError) return;

    upsertSourceHealth({
      provider: activeSource.provider || 'Unknown',
      quality: activeSource.quality,
      status: 'failure',
    });
  }, [activeSource, streamError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playerState !== 'streaming') return;

    if (currentTime < 5 || duration <= 0) return;

    const progressPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

    if (progressPercent >= 98) {
      removeWatchProgress(animeId, episodeNumber);
      appendWatchHistory({
        animeId,
        animeTitle,
        episodeNumber,
        episodeTitle,
        watchedAt: Date.now(),
      });

      if (nextEpisodePath) {
        const nextEpisodeNumber = Number(nextEpisodePath.split('?')[0]?.split('/').pop());
        if (Number.isFinite(nextEpisodeNumber) && nextEpisodeNumber > 0) {
          upsertWatchProgress({
            animeId,
            animeTitle,
            posterImage: '/logo.png',
            episodeNumber: nextEpisodeNumber,
            episodeTitle: `Episode ${nextEpisodeNumber}`,
            currentTime: 0,
            duration: Math.max(1, Math.round(duration)),
            progressPercent: 0,
            updatedAt: Date.now(),
          });
        }
      }

      return;
    }

    upsertWatchProgress({
      animeId,
      animeTitle,
      posterImage: '/logo.png',
      episodeNumber,
      episodeTitle,
      currentTime,
      duration: Math.round(duration),
      progressPercent,
      updatedAt: Date.now(),
    });
  }, [animeId, animeTitle, currentTime, duration, episodeNumber, episodeTitle, nextEpisodePath, playerState]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playerState !== 'streaming') return;

    const item = readLocalProfile().progress.find(
      (entry) => entry.animeId === animeId && entry.episodeNumber === episodeNumber
    );
    if (!item) return;

    if (item.currentTime > 10 && Math.abs(video.currentTime - item.currentTime) > 10) {
      video.currentTime = Math.min(item.currentTime, video.duration || item.currentTime);
    }
  }, [animeId, episodeNumber, playerState]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'hidden') return;

      const video = videoRef.current;
      if (!video || duration <= 0) return;

      const progressPercent = Math.min(100, Math.max(0, (video.currentTime / duration) * 100));
      if (progressPercent < 2) return;

      upsertWatchProgress({
        animeId,
        animeTitle,
        posterImage: '/logo.png',
        episodeNumber,
        episodeTitle,
        currentTime: video.currentTime,
        duration,
        progressPercent,
        updatedAt: Date.now(),
      });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [animeId, animeTitle, duration, episodeNumber, episodeTitle]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const video = videoRef.current;
      if (!video || duration <= 0) return;

      const progressPercent = Math.min(100, Math.max(0, (video.currentTime / duration) * 100));
      if (progressPercent < 2) return;

      upsertWatchProgress({
        animeId,
        animeTitle,
        posterImage: '/logo.png',
        episodeNumber,
        episodeTitle,
        currentTime: video.currentTime,
        duration,
        progressPercent,
        updatedAt: Date.now(),
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [animeId, animeTitle, duration, episodeNumber, episodeTitle]);


  const skipActiveSegment = () => {
    autoSkippedSegmentRef.current = activeSkipKey;
    const video = videoRef.current;
    if (!video || !activeSkipTime) return;
    video.currentTime = activeSkipTime.endTime;
    resetControlsTimer();
  };

  const toggleFullscreen = useCallback(async () => {
    const fullscreenDocument = document as FullscreenCapableDocument;
    const fullscreenElement = document.fullscreenElement || fullscreenDocument.webkitFullscreenElement || fullscreenDocument.msFullscreenElement;

    if (isCssLandscapeFullscreen) {
      setIsCssLandscapeFullscreen(false);
      setIsFullscreen(false);
      await unlockOrientation();
      resetControlsTimer();
      return;
    }

    if (!fullscreenElement) {
      const container = containerRef.current as FullscreenCapableElement | null;
      const video = videoRef.current as FullscreenCapableVideo | null;
      let enteredFullscreen = false;

      if (container && typeof container.requestFullscreen === 'function') {
        await container.requestFullscreen();
        enteredFullscreen = true;
      } else if (container && typeof container.webkitRequestFullscreen === 'function') {
        await container.webkitRequestFullscreen();
        enteredFullscreen = true;
      } else if (container && typeof container.msRequestFullscreen === 'function') {
        await container.msRequestFullscreen();
        enteredFullscreen = true;
      } else if (video && typeof video.webkitEnterFullscreen === 'function') {
        video.webkitEnterFullscreen();
        enteredFullscreen = true;
      }

      await lockLandscapeOrientation();
      const fullscreenDocumentAfter = document as FullscreenCapableDocument;
      const nativeFullscreenActive = Boolean(
        document.fullscreenElement ||
        fullscreenDocumentAfter.webkitFullscreenElement ||
        fullscreenDocumentAfter.msFullscreenElement
      );
      if (shouldUseCssLandscapeFallback({
        enteredFullscreen,
        nativeFullscreenActive,
        viewportIsPortrait: window.innerHeight > window.innerWidth,
      })) {
        setIsCssLandscapeFullscreen(true);
        setIsFullscreen(true);
      }
    } else {
      await unlockOrientation();
      if (typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen();
      } else if (typeof fullscreenDocument.webkitExitFullscreen === 'function') {
        await fullscreenDocument.webkitExitFullscreen();
      } else if (typeof fullscreenDocument.msExitFullscreen === 'function') {
        await fullscreenDocument.msExitFullscreen();
      }
    }

    resetControlsTimer();
  }, [isCssLandscapeFullscreen, resetControlsTimer]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (playerState !== 'streaming') return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) return;

      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        togglePlay();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        seekBy(10);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekBy(-10);
        return;
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        toggleFullscreen();
        return;
      }

      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        toggleMute();
        resetControlsTimer();
        return;
      }

      if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowHotkeyHint((value) => !value);
        return;
      }

      if (event.key === 'Escape') {
        if (showSpeedMenu || showQualityMenu || showHotkeyHint) {
          setShowSpeedMenu(false);
          setShowQualityMenu(false);
          setShowHotkeyHint(false);
          return;
        }

        const fullscreenDocument = document as FullscreenCapableDocument;
        const fullscreenElement = document.fullscreenElement || fullscreenDocument.webkitFullscreenElement || fullscreenDocument.msFullscreenElement;
        if (!fullscreenElement && !isCssLandscapeFullscreen) return;

        event.preventDefault();
        if (isCssLandscapeFullscreen) {
          setIsCssLandscapeFullscreen(false);
          setIsFullscreen(false);
        } else if (typeof document.exitFullscreen === 'function') {
          document.exitFullscreen();
        } else if (typeof fullscreenDocument.webkitExitFullscreen === 'function') {
          fullscreenDocument.webkitExitFullscreen();
        } else if (typeof fullscreenDocument.msExitFullscreen === 'function') {
          fullscreenDocument.msExitFullscreen();
        }
        resetControlsTimer();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isCssLandscapeFullscreen,
    playerState,
    resetControlsTimer,
    seekBy,
    showHotkeyHint,
    showQualityMenu,
    showSpeedMenu,
    toggleFullscreen,
    toggleMute,
    togglePlay,
  ]);

  const switchSource = (src: StreamSource) => {
    const video = videoRef.current;
    const savedTime = video?.currentTime || 0;
    setActiveSource(src);
    setShowQualityMenu(false);
    setShowSpeedMenu(false);
    setQualityPreference(animeId, src.url);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = savedTime;
        videoRef.current.playbackRate = playbackRate;
        videoRef.current.play().catch(() => {});
      }
    }, 500);
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Render: Loading ──────────────────────────────────────────────────────
  if (playerState === 'loading') {
    return (
      <div className="relative w-full aspect-video bg-black flex flex-col items-center justify-center gap-3 rounded overflow-hidden">
        <Loader2 className="w-12 h-12 text-riko-red animate-spin" />
        <p className="text-gray-300 text-sm animate-pulse">Fetching stream sources…</p>
        <p className="text-gray-600 text-xs">Connecting to streaming provider</p>
      </div>
    );
  }

  // ── Render: Iframe Embed ─────────────────────────────────────────────────
  if (playerState === 'iframe' && activeSource) {
    return (
      <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-3 z-10 pointer-events-none">
          <Link href={animeBackPath} className="text-white hover:text-riko-red transition-colors pointer-events-auto">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h2 className="text-white font-bold text-sm line-clamp-1">{animeTitle}</h2>
            <p className="text-gray-400 text-xs">{episodeTitle} — {activeSource.provider || 'External Source'}</p>
          </div>
        </div>
        <iframe
          src={activeSource.url}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  // ── Render: Trailer fallback ─────────────────────────────────────────────
  if (playerState === 'trailer' && trailerEmbedUrl) {
    return (
      <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-3 z-10">
          <Link href={animeBackPath} className="text-white hover:text-riko-red transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h2 className="text-white font-bold text-sm line-clamp-1">{animeTitle}</h2>
            <p className="text-gray-400 text-xs">{episodeTitle} — Trailer Preview</p>
          </div>
        </div>
        <iframe
          src={trailerEmbedUrl}
          title={`${animeTitle} trailer`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between z-10">
          <span className="text-yellow-400 text-xs font-medium flex items-center gap-1">
            <WifiOff className="w-3 h-3" /> Stream unavailable — showing trailer
          </span>
          <div className="flex gap-2">
            {previousEpisodePath && (
              <Link href={previousEpisodePath} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs transition-colors">
                <SkipBack className="w-3 h-3" /> Prev
              </Link>
            )}
            {nextEpisodePath && (
              <Link href={nextEpisodePath} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white text-black hover:bg-gray-200 text-xs font-semibold transition-colors">
                Next <SkipForward className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Unavailable ──────────────────────────────────────────────────
  if (playerState === 'unavailable' || playerState === 'error') {
    return (
      <div className="relative w-full aspect-video bg-gradient-to-b from-riko-dark to-riko-darker flex flex-col items-center justify-center gap-4 rounded overflow-hidden border border-gray-800">
        <WifiOff className="w-14 h-14 text-riko-red opacity-60" />
        <div className="text-center px-6">
          <h3 className="text-lg font-bold mb-1">Stream Not Available</h3>
          <p className="text-gray-400 text-sm max-w-md">
            {streamError || 'Could not fetch a streaming source for this episode. The source might be rate-limited or temporarily unavailable.'}
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          {previousEpisodePath && (
            <Link href={previousEpisodePath} className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white/10 hover:bg-white/20 transition-colors text-sm">
              <SkipBack className="w-4 h-4" /> Previous
            </Link>
          )}
          {nextEpisodePath && (
            <Link href={nextEpisodePath} className="inline-flex items-center gap-2 px-4 py-2 rounded bg-riko-red hover:bg-red-700 transition-colors text-sm font-semibold">
              Next Episode <SkipForward className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Streaming player ─────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={isCssLandscapeFullscreen
        ? 'fixed left-1/2 top-1/2 z-[9999] h-[100vw] w-[100vh] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 overflow-hidden bg-black'
        : 'relative w-full aspect-video bg-black rounded overflow-hidden group'}
      onClick={handleSurfaceTap}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => shouldAutoHideControls({ isPlaying, isTouchDevice }) && setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={handleVideoTap}
        playsInline
      />

      {/* Source badge */}
      <div className="absolute top-3 right-3 z-20 flex items-center">
        <img src="/logo.png" alt="RikoAnime" className="h-7 w-auto object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
      </div>

      {showSkipButton && activeSkipTime ? (
        <button
          type="button"
          onClick={skipActiveSegment}
          className="absolute right-4 bottom-24 z-30 rounded bg-white px-4 py-2 text-sm font-bold text-black shadow-lg hover:bg-gray-200 transition-colors"
        >
          Skip {activeSkipTime.type === 'op' ? 'Intro' : 'Outro'}
        </button>
      ) : null}

      {showAutoSkipOnboarding ? (
        <div className="absolute left-4 top-14 z-30 max-w-xs rounded bg-black/85 border border-white/20 px-3 py-2 text-xs text-gray-200 shadow-xl">
          Tip: aktifkan Auto-skip intro/outro di bawah timeline untuk skip automatik.
        </div>
      ) : null}

      {showHotkeyHint ? (
        <div className="absolute left-4 bottom-24 z-30 rounded bg-black/80 border border-white/20 px-3 py-2 text-[11px] text-gray-200 leading-5">
          <div>Hotkeys: Space play/pause • ←/→ seek • F fullscreen • M mute • K hint</div>
        </div>
      ) : null}

      {autoNextCountdown !== null ? (
        <div className="absolute right-4 bottom-36 z-30 rounded bg-black/85 border border-white/20 px-3 py-2 text-xs text-gray-100">
          Next episode in {autoNextCountdown}s
          <button
            type="button"
            onClick={() => setAutoNextEnabledState(false)}
            className="ml-3 text-riko-red hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleSurfaceTap}
      >
        {/* Top bar */}
        <div className="p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-3">
          <Link href={animeBackPath} className="text-white hover:text-riko-red transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm md:text-base line-clamp-1">{animeTitle}</h2>
            <p className="text-gray-300 text-xs">{episodeTitle}</p>
          </div>
        </div>

        {/* Center overlay — play button or muted-autoplay cue */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!isPlaying ? (
            <button
              className="pointer-events-auto w-16 h-16 rounded-full bg-riko-red/80 flex items-center justify-center hover:bg-riko-red transition-colors"
              onClick={togglePlay}
            >
              <Play className="w-8 h-8 text-white" fill="white" />
            </button>
          ) : isMuted ? (
            /* Video is playing but muted (autoplay policy) — prompt user to unmute */
            <button
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 text-white text-sm font-medium hover:bg-black/90 transition-all animate-pulse"
              onClick={toggleMute}
            >
              <VolumeX className="w-4 h-4" />
              Tap to unmute
            </button>
          ) : null}
        </div>

        {/* Bottom controls */}
        <div className="p-3 bg-gradient-to-t from-black/90 to-transparent flex flex-col gap-2">
          {/* Progress bar */}
          <div
            className="relative w-full h-1.5 overflow-hidden bg-white/20 rounded-full cursor-pointer group/progress"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekTo(((e.clientX - rect.left) / rect.width) * 100);
            }}
          >
            {/* Buffer */}
            <div className="absolute left-0 top-0 bottom-0 bg-white/30 rounded-full" style={{ width: `${buffered}%` }} />
            {/* Progress */}
            <div className="absolute left-0 top-0 bottom-0 bg-riko-red rounded-full" style={{ width: `${progress}%` }} />
            {skipSegments.map((segment) => (
              <div
                key={`${segment.type}-${segment.startPercent}-${segment.widthPercent}`}
                className={`pointer-events-none absolute top-0 bottom-0 ${segment.type === 'op' ? 'bg-cyan-300/40' : 'bg-violet-300/40'}`}
                style={{ left: `${segment.startPercent}%`, width: `${segment.widthPercent}%` }}
              />
            ))}
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-300">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSkipIntro}
                onChange={(e) => setAutoSkipIntro(e.target.checked)}
                className="h-3.5 w-3.5 accent-riko-red"
              />
              Auto-skip intro
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSkipOutro}
                onChange={(e) => setAutoSkipOutro(e.target.checked)}
                className="h-3.5 w-3.5 accent-riko-red"
              />
              Auto-skip outro
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoNextEnabled}
                onChange={(e) => setAutoNextEnabledState(e.target.checked)}
                className="h-3.5 w-3.5 accent-riko-red"
              />
              Auto-next
            </label>
            <button
              type="button"
              onClick={() => setShowHotkeyHint((value) => !value)}
              className="inline-flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5" /> Hotkeys
            </button>
            {activeSegmentMarker ? (
              <span className="text-gray-400">{activeSkipTime?.type === 'op' ? 'Intro window active' : 'Outro window active'}</span>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            {/* Left controls */}
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-riko-red transition-colors">
                {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6" fill="currentColor" />}
              </button>
              <button onClick={toggleMute} className="text-white hover:text-riko-red transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVideoVolume(Number(e.target.value))}
                className="w-16 md:w-20 accent-riko-red"
              />
              <span className="text-white text-xs font-mono hidden sm:block">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 md:gap-3 relative">
              {/* Episode nav */}
              {previousEpisodePath && (
                <Link href={previousEpisodePath} className="text-white hover:text-riko-red transition-colors">
                  <SkipBack className="w-5 h-5" />
                </Link>
              )}
              {nextEpisodePath && (
                <Link href={nextEpisodePath} className="text-white hover:text-riko-red transition-colors">
                  <SkipForward className="w-5 h-5" />
                </Link>
              )}

              {/* Quality picker */}
              {sources.length > 1 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSpeedMenu(false);
                      setShowQualityMenu((v) => !v);
                    }}
                    className="flex items-center gap-1 text-white hover:text-riko-red transition-colors text-xs font-semibold"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="hidden sm:inline">{activeSource?.quality || 'Quality'}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showQualityMenu && (
                    <div
                      className="absolute bottom-8 right-0 bg-riko-darker border border-gray-700 rounded-lg overflow-hidden z-30 min-w-[120px] shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-700 font-semibold uppercase tracking-wider">
                        Quality
                      </div>
                      {sources.map((src) => (
                        <button
                          key={src.url}
                          onClick={() => switchSource(src)}
                          className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-white/10 transition-colors ${
                            src.url === activeSource?.url ? 'text-riko-red font-semibold' : 'text-white'
                          }`}
                        >
                          {src.quality}
                          {src.url === activeSource?.url && (
                            <span className="w-2 h-2 rounded-full bg-riko-red ml-2 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQualityMenu(false);
                    setShowSpeedMenu((v) => !v);
                  }}
                  className="text-white hover:text-riko-red transition-colors text-xs font-semibold"
                >
                  {playbackRate.toFixed(2).replace('.00', '')}x
                </button>
                {showSpeedMenu ? (
                  <div
                    className="absolute bottom-8 right-0 bg-riko-darker border border-gray-700 rounded-lg overflow-hidden z-30 min-w-[110px] shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRateState(rate);
                          setShowSpeedMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors ${
                          playbackRate === rate ? 'text-riko-red font-semibold' : 'text-white'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <button onClick={toggleFullscreen} className="text-white hover:text-riko-red transition-colors">
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
