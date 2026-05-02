export type WatchProgressItem = {
  animeId: string;
  animeTitle: string;
  posterImage: string;
  episodeNumber: number;
  episodeTitle: string;
  currentTime: number;
  duration: number;
  progressPercent: number;
  updatedAt: number;
};

export type WatchHistoryItem = {
  animeId: string;
  animeTitle: string;
  episodeNumber: number;
  episodeTitle: string;
  watchedAt: number;
};

export type SourceHealthItem = {
  key: string;
  provider: string;
  quality: string;
  successCount: number;
  failureCount: number;
  lastStatus: 'success' | 'failure';
  lastSeenAt: number;
};

export type PlayerPrefs = {
  playbackRate: number;
  qualityByAnimeId: Record<string, string>;
  showHotkeyHintDismissed: boolean;
  autoNextEnabled: boolean;
};

type ProfileData = {
  progress: WatchProgressItem[];
  history: WatchHistoryItem[];
  sourceHealth: SourceHealthItem[];
  prefs: PlayerPrefs;
};

const STORAGE_KEY = 'riko_local_profile_v1';
const MAX_PROGRESS_ITEMS = 40;
const MAX_HISTORY_ITEMS = 120;
const MAX_SOURCE_ITEMS = 200;

const defaultPrefs: PlayerPrefs = {
  playbackRate: 1,
  qualityByAnimeId: {},
  showHotkeyHintDismissed: false,
  autoNextEnabled: true,
};

function isClient() {
  return typeof window !== 'undefined';
}

function sanitizeRate(value: number) {
  if (![0.75, 1, 1.25, 1.5, 2].includes(value)) return 1;
  return value;
}

function getDefaultProfile(): ProfileData {
  return {
    progress: [],
    history: [],
    sourceHealth: [],
    prefs: { ...defaultPrefs },
  };
}

function parseProfile(raw: string | null): ProfileData {
  if (!raw) return getDefaultProfile();

  try {
    const parsed = JSON.parse(raw) as Partial<ProfileData>;

    return {
      progress: Array.isArray(parsed.progress) ? parsed.progress.slice(0, MAX_PROGRESS_ITEMS) : [],
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, MAX_HISTORY_ITEMS) : [],
      sourceHealth: Array.isArray(parsed.sourceHealth) ? parsed.sourceHealth.slice(0, MAX_SOURCE_ITEMS) : [],
      prefs: {
        playbackRate: sanitizeRate(Number(parsed.prefs?.playbackRate || defaultPrefs.playbackRate)),
        qualityByAnimeId: parsed.prefs?.qualityByAnimeId || {},
        showHotkeyHintDismissed: Boolean(parsed.prefs?.showHotkeyHintDismissed),
        autoNextEnabled: parsed.prefs?.autoNextEnabled ?? true,
      },
    };
  } catch {
    return getDefaultProfile();
  }
}

export function readLocalProfile(): ProfileData {
  if (!isClient()) return getDefaultProfile();

  return parseProfile(window.localStorage.getItem(STORAGE_KEY));
}

export function writeLocalProfile(next: ProfileData) {
  if (!isClient()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function updateLocalProfile(mutator: (current: ProfileData) => ProfileData) {
  if (!isClient()) return;

  const current = readLocalProfile();
  const next = mutator(current);
  writeLocalProfile(next);
}

export function upsertWatchProgress(item: WatchProgressItem) {
  updateLocalProfile((current) => {
    const filtered = current.progress.filter((entry) => entry.animeId !== item.animeId);
    const next = [item, ...filtered].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_PROGRESS_ITEMS);

    return {
      ...current,
      progress: next,
    };
  });
}

export function removeWatchProgress(animeId: string, episodeNumber: number) {
  updateLocalProfile((current) => ({
    ...current,
    progress: current.progress.filter((entry) => !(entry.animeId === animeId && entry.episodeNumber === episodeNumber)),
  }));
}

export function appendWatchHistory(item: WatchHistoryItem) {
  updateLocalProfile((current) => {
    const deduped = current.history.filter(
      (entry) => !(entry.animeId === item.animeId && entry.episodeNumber === item.episodeNumber && Math.abs(entry.watchedAt - item.watchedAt) < 60000)
    );

    return {
      ...current,
      history: [item, ...deduped].sort((a, b) => b.watchedAt - a.watchedAt).slice(0, MAX_HISTORY_ITEMS),
    };
  });
}

export function upsertSourceHealth(input: {
  provider: string;
  quality: string;
  status: 'success' | 'failure';
}) {
  const key = `${input.provider}::${input.quality}`;

  updateLocalProfile((current) => {
    const existing = current.sourceHealth.find((entry) => entry.key === key);
    const base: SourceHealthItem = existing || {
      key,
      provider: input.provider,
      quality: input.quality,
      successCount: 0,
      failureCount: 0,
      lastStatus: input.status,
      lastSeenAt: Date.now(),
    };

    const updated: SourceHealthItem = {
      ...base,
      successCount: base.successCount + (input.status === 'success' ? 1 : 0),
      failureCount: base.failureCount + (input.status === 'failure' ? 1 : 0),
      lastStatus: input.status,
      lastSeenAt: Date.now(),
    };

    const others = current.sourceHealth.filter((entry) => entry.key !== key);

    return {
      ...current,
      sourceHealth: [updated, ...others]
        .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
        .slice(0, MAX_SOURCE_ITEMS),
    };
  });
}

export function setPlaybackRate(rate: number) {
  updateLocalProfile((current) => ({
    ...current,
    prefs: {
      ...current.prefs,
      playbackRate: sanitizeRate(rate),
    },
  }));
}

export function setQualityPreference(animeId: string, sourceUrl: string) {
  updateLocalProfile((current) => ({
    ...current,
    prefs: {
      ...current.prefs,
      qualityByAnimeId: {
        ...current.prefs.qualityByAnimeId,
        [animeId]: sourceUrl,
      },
    },
  }));
}

export function setHotkeyHintDismissed(value: boolean) {
  updateLocalProfile((current) => ({
    ...current,
    prefs: {
      ...current.prefs,
      showHotkeyHintDismissed: value,
    },
  }));
}

export function setAutoNextEnabled(value: boolean) {
  updateLocalProfile((current) => ({
    ...current,
    prefs: {
      ...current.prefs,
      autoNextEnabled: value,
    },
  }));
}
