import { NextRequest, NextResponse } from 'next/server';
import { createHash, createDecipheriv } from 'crypto';
import { mapStreamErrorStatus } from '@/lib/streamErrorStatus.mjs';

const ALLANIME_API = 'https://api.allanime.day/api';
const ALLANIME_REFERER = 'https://allmanga.to';
const AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

const ALLANIME_KEY = createHash('sha256').update('Xot36i3lK3:v1').digest();

const HEX_TABLE: Record<string, string> = {
  '79': 'A', '7a': 'B', '7b': 'C', '7c': 'D', '7d': 'E', '7e': 'F', '7f': 'G',
  '70': 'H', '71': 'I', '72': 'J', '73': 'K', '74': 'L', '75': 'M', '76': 'N', '77': 'O',
  '68': 'P', '69': 'Q', '6a': 'R', '6b': 'S', '6c': 'T', '6d': 'U', '6e': 'V', '6f': 'W',
  '60': 'X', '61': 'Y', '62': 'Z',
  '59': 'a', '5a': 'b', '5b': 'c', '5c': 'd', '5d': 'e', '5e': 'f', '5f': 'g',
  '50': 'h', '51': 'i', '52': 'j', '53': 'k', '54': 'l', '55': 'm', '56': 'n', '57': 'o',
  '48': 'p', '49': 'q', '4a': 'r', '4b': 's', '4c': 't', '4d': 'u', '4e': 'v', '4f': 'w',
  '40': 'x', '41': 'y', '42': 'z',
  '08': '0', '09': '1', '0a': '2', '0b': '3', '0c': '4', '0d': '5', '0e': '6', '0f': '7',
  '00': '8', '01': '9',
  '15': '-', '16': '.', '67': '_', '46': '~',
  '02': ':', '17': '/', '07': '?', '1b': '#',
  '63': '[', '65': ']', '78': '@', '19': '!',
  '1c': '$', '1e': '&', '10': '(', '11': ')', '12': '*', '13': '+', '14': ',',
  '03': ';', '05': '=', '1d': '%',
};

const SEARCH_GQL =
  'query( $search: SearchInput $limit: Int $page: Int $translationType: VaildTranslationTypeEnumType $countryOrigin: VaildCountryOriginEnumType ) { shows( search: $search limit: $limit page: $page translationType: $translationType countryOrigin: $countryOrigin ) { edges { _id name englishName malId availableEpisodes __typename } }}';

const SHOW_GQL =
  'query ($showId: String!) { show( _id: $showId ) { _id name englishName malId availableEpisodes }}';

const EPISODE_EMBED_GQL =
  'query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) { episode( showId: $showId translationType: $translationType episodeString: $episodeString ) { episodeString sourceUrls }}';

const EPISODE_PERSISTED_QUERY_HASH =
  'd405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec';
const YOUTU_CHAN_ORIGIN = 'https://youtu-chan.com';

interface AllanimeSource {
  sourceUrl: string;
  priority: number;
  sourceName: string;
  type: 'iframe' | 'player' | string;
  streamerId?: string;
}

interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
  provider: string;
  type: 'hls' | 'mp4' | 'iframe';
}

type CandidateEdge = {
  _id: string;
  name: string;
  englishName?: string;
  malId?: string | number;
  availableEpisodes?: { sub?: number; dub?: number; raw?: number };
};

type SearchResp = {
  data: {
    shows: {
      edges: CandidateEdge[];
    };
  };
};

type ShowResp = {
  data: {
    show: CandidateEdge | null;
  };
};

type GraphQlError = {
  message?: string;
  extensions?: {
    code?: string;
  };
};

type EpisodeResp = {
  data?: {
    episode?: {
      episodeString?: string;
      sourceUrls?: AllanimeSource[];
    } | null;
  };
  errors?: GraphQlError[];
};

function decodeHexUrl(encoded: string): string {
  const pairs = encoded.match(/.{2}/g) || [];
  return pairs.map((pair) => HEX_TABLE[pair.toLowerCase()] ?? '').join('');
}

function decryptTobeparsed(blob: string): string {
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(1, 13);
  const ctr = Buffer.concat([iv, Buffer.from('00000002', 'hex')]);
  const fileSize = buf.length;
  const ctLen = fileSize - 13 - 16;
  const ciphertext = buf.subarray(13, 13 + ctLen);

  const decipher = createDecipheriv('aes-256-ctr', ALLANIME_KEY, ctr);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
}

async function allanimePost<T>(query: string, variables: unknown): Promise<T> {
  const response = await fetch(ALLANIME_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: ALLANIME_REFERER,
      'User-Agent': AGENT,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Catalog API ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function inferQuality(...values: Array<string | undefined>): string {
  for (const value of values) {
    const match = (value || '').match(/(?:^|[^0-9])([1-9][0-9]{2,3})p?(?:[^0-9]|$)/i);
    if (!match) continue;

    const height = Number(match[1]);
    if (height >= 240 && height <= 2160) return `${height}p`;
  }

  return 'auto';
}

async function resolveClockUrl(clockPath: string): Promise<StreamSource[]> {
  const fullUrl = `https://allanime.day${clockPath}`;

  try {
    const response = await fetch(fullUrl, {
      headers: {
        Referer: ALLANIME_REFERER,
        'User-Agent': AGENT,
      },
      cache: 'no-store',
    });

    if (!response.ok) return [];

    const text = await response.text();
    const results: StreamSource[] = [];

    const linkRe = /"link":"([^"]+)"[^}]*?"resolutionStr":"([^"]+)"/g;
    let match: RegExpExecArray | null;

    while ((match = linkRe.exec(text)) !== null) {
      const url = match[1].replace(/\\/g, '');
      const quality = inferQuality(match[2], url) || match[2];
      results.push({
        url,
        quality,
        isM3U8: url.includes('.m3u8') || url.includes('m3u8'),
        provider: 'stream-clock',
        type: url.includes('.m3u8') ? 'hls' : 'mp4',
      });
    }

    const hlsRe = /"hls"[^}]*?"url":"([^"]+)"/g;
    while ((match = hlsRe.exec(text)) !== null) {
      const url = match[1].replace(/\\/g, '');
      results.push({
        url,
        quality: inferQuality(url),
        isM3U8: true,
        provider: 'stream-hls',
        type: 'hls',
      });
    }

    return results;
  } catch {
    return [];
  }
}

async function resolveSource(source: AllanimeSource): Promise<StreamSource[]> {
  const raw = source.sourceUrl || '';

  if (raw.startsWith('--')) {
    const hex = raw.slice(2);
    let decoded = decodeHexUrl(hex);

    if (decoded.includes('tools.fast4speed.rsvp')) {
      return [
        {
          url: decoded,
          quality: inferQuality(source.sourceName, decoded),
          isM3U8: decoded.includes('m3u8'),
          provider: source.sourceName,
          type: decoded.includes('m3u8') ? 'hls' : 'mp4',
        },
      ];
    }

    if (decoded.includes('/clock') && !decoded.endsWith('.json')) {
      decoded = decoded.replace(/\/clock$/, '/clock.json');
    }

    if (decoded.startsWith('/')) {
      return resolveClockUrl(decoded);
    }

    if (decoded.startsWith('http')) {
      return [
        {
          url: decoded,
          quality: inferQuality(source.sourceName, decoded),
          isM3U8: decoded.includes('m3u8'),
          provider: source.sourceName,
          type: decoded.includes('m3u8') ? 'hls' : 'mp4',
        },
      ];
    }

    return [];
  }

  if (raw.startsWith('http')) {
    return [
      {
        url: raw,
        quality: inferQuality(source.sourceName, raw),
        isM3U8: false,
        provider: source.sourceName,
        type: 'iframe',
      },
    ];
  }

  return [];
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleScore(queryNormalized: string, candidateName: string): number {
  const candidate = normalizeTitle(candidateName);
  if (candidate === queryNormalized) return 100;
  if (candidate.includes(queryNormalized)) return 80;
  if (queryNormalized.includes(candidate)) return 70;

  const queryTokens = new Set(queryNormalized.split(' ').filter(Boolean));
  const candidateTokens = new Set(candidate.split(' ').filter(Boolean));

  let overlap = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) overlap += 1;
  }

  return queryTokens.size > 0 ? Math.round((overlap / queryTokens.size) * 50) : 0;
}

function getCandidateDisplayName(edge: CandidateEdge): string {
  const english = (edge.englishName || '').trim();
  if (english) return english;
  return edge.name;
}

function rankCandidates(searchQuery: string, episodeNum: number, edges: CandidateEdge[]) {
  const queryNormalized = normalizeTitle(searchQuery);

  const getSubCount = (edge: CandidateEdge) =>
    typeof edge.availableEpisodes?.sub === 'number' ? edge.availableEpisodes.sub : 0;

  const hasSpecialHints = (name: string) => {
    const normalized = normalizeTitle(name);
    const tokens = new Set(normalized.split(' ').filter(Boolean));

    const specialTokens = [
      'movie',
      'film',
      'special',
      'ova',
      'ona',
      'chopper',
      'barto',
      'karte',
      'recap',
      'log',
      'gekisen',
      'tokushuu',
      'digest',
      'preview',
      'summary',
      'compilation',
      'omake',
      'short',
      'hen',
      'koisuru',
    ];

    const specialPhrases = ['fan letter', 'music video', 'stage play'];

    return (
      specialTokens.some((token) => tokens.has(token)) ||
      specialPhrases.some((phrase) => normalized.includes(phrase))
    );
  };

  const subCounts = edges
    .map(getSubCount)
    .filter((count) => count > 0)
    .sort((a, b) => b - a);

  const maxSub = subCounts[0] ?? 0;
  const secondMaxSub = subCounts[1] ?? 0;
  const hasDominantMainSeries = maxSub >= 50 && (secondMaxSub === 0 || maxSub >= secondMaxSub * 3);

  return [...edges]
    .map((edge, index) => {
      const displayName = getCandidateDisplayName(edge);
      const subCount = getSubCount(edge);
      const hasEpisodeCoverage = subCount >= episodeNum;
      const orderBonus = Math.max(0, 20 - index);
      const availabilityBonus = Math.min(subCount, 300) / 5;
      const coverageBonus = hasEpisodeCoverage ? 30 : -20;
      const specialPenalty = hasSpecialHints(displayName) ? -35 : 0;
      const dominantSeriesBonus = hasDominantMainSeries && subCount === maxSub ? 80 : 0;

      const score =
        titleScore(queryNormalized, displayName) +
        orderBonus +
        availabilityBonus +
        coverageBonus +
        specialPenalty +
        dominantSeriesBonus;

      return { edge, score };
    })
    .sort((a, b) => b.score - a.score);
}

type EpisodeFetchResult = {
  sources: AllanimeSource[];
  upstreamError: string | null;
};

function extractUpstreamError(errors: GraphQlError[] | undefined): string | null {
  if (!errors || errors.length === 0) return null;

  const first = errors[0];
  const message = (first.message || '').trim();
  if (!message) return null;

  const code = (first.extensions?.code || '').trim();
  return code ? `${message} [${code}]` : message;
}

function decodeEpisodeSources(payload: EpisodeResp): EpisodeFetchResult {
  let sources: AllanimeSource[] = payload?.data?.episode?.sourceUrls || [];
  const upstreamError = extractUpstreamError(payload.errors);

  const rawJson = JSON.stringify(payload);
  if (rawJson.includes('"tobeparsed"')) {
    const blobMatch = rawJson.match(/"tobeparsed":"([^"]+)"/);
    if (blobMatch) {
      try {
        const plain = decryptTobeparsed(blobMatch[1]);
        const parsed = JSON.parse(plain) as { episode?: { sourceUrls?: AllanimeSource[] } };
        if (parsed?.episode?.sourceUrls?.length) {
          sources = parsed.episode.sourceUrls;
        }
      } catch (error) {
        console.error('[stream] tobeparsed decrypt failed:', error);
      }
    }
  }

  return {
    sources,
    upstreamError,
  };
}

async function fetchEpisodeSources(showId: string, episodeNum: number): Promise<EpisodeFetchResult> {
  const variables = {
    showId,
    translationType: 'sub',
    episodeString: String(episodeNum),
  };

  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: EPISODE_PERSISTED_QUERY_HASH,
    },
  };

  const persistedUrl = new URL(ALLANIME_API);
  persistedUrl.searchParams.set('variables', JSON.stringify(variables));
  persistedUrl.searchParams.set('extensions', JSON.stringify(extensions));

  try {
    const persistedResponse = await fetch(persistedUrl.toString(), {
      headers: {
        Referer: ALLANIME_REFERER,
        Origin: YOUTU_CHAN_ORIGIN,
        'User-Agent': AGENT,
      },
      cache: 'no-store',
    });

    if (persistedResponse.ok) {
      const payload = (await persistedResponse.json()) as EpisodeResp;
      const parsed = decodeEpisodeSources(payload);
      if (parsed.sources.length > 0 || parsed.upstreamError) {
        return parsed;
      }
    }
  } catch {
  }

  const response = await allanimePost<EpisodeResp>(EPISODE_EMBED_GQL, variables);
  return decodeEpisodeSources(response);
}

async function resolvePlayableLinks(sources: AllanimeSource[]): Promise<StreamSource[]> {
  const sortedSources = [...sources].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const resolved = await Promise.all(sortedSources.map(resolveSource));
  const allLinks = resolved.flat().filter((stream) => stream.url);

  const seen = new Set<string>();
  const unique = allLinks.filter((stream) => {
    if (seen.has(stream.url)) return false;
    seen.add(stream.url);
    return true;
  });

  return unique.sort((a, b) => {
    const typeOrder = { hls: 0, mp4: 1, iframe: 2 };
    const ta = typeOrder[a.type as keyof typeof typeOrder] ?? 3;
    const tb = typeOrder[b.type as keyof typeof typeOrder] ?? 3;
    if (ta !== tb) return ta - tb;

    const qa = parseInt(a.quality) || (a.quality === 'auto' ? 500 : 0);
    const qb = parseInt(b.quality) || (b.quality === 'auto' ? 500 : 0);
    return qb - qa;
  });
}

async function resolveCandidateFromAnimeId(animeId: string, episodeNum: number) {
  const direct = await allanimePost<ShowResp>(SHOW_GQL, { showId: animeId }).catch(() => null);
  const directShow = direct?.data?.show || null;

  if (directShow?._id) {
    const directName = getCandidateDisplayName(directShow);
    return {
      selected: directShow,
      ranked: [{ edge: directShow, score: 999 }],
      searchQuery: directName || animeId,
      resolvedBy: 'showId' as const,
    };
  }

  const runSearch = async (query: string) => {
    const searchResp = await allanimePost<SearchResp>(SEARCH_GQL, {
      search: { allowAdult: false, allowUnknown: false, query },
      limit: 40,
      page: 1,
      translationType: 'sub',
      countryOrigin: 'ALL',
    });

    return searchResp?.data?.shows?.edges || [];
  };

  const edges = await runSearch(animeId);

  if (/^\d+$/.test(animeId)) {
    const exactMal = edges.find((edge) => String(edge.malId || '') === animeId);
    if (exactMal) {
      const ranked = rankCandidates(getCandidateDisplayName(exactMal), episodeNum, edges);
      return {
        selected: exactMal,
        ranked,
        searchQuery: getCandidateDisplayName(exactMal),
        resolvedBy: 'malId' as const,
      };
    }

    const malHints = ['one piece', 'naruto', 'bleach', 'jujutsu', 'attack on titan', 'demon slayer'];
    for (const hint of malHints) {
      const hintEdges = await runSearch(hint);
      const malMatch = hintEdges.find((edge) => String(edge.malId || '') === animeId);
      if (malMatch) {
        const ranked = rankCandidates(getCandidateDisplayName(malMatch), episodeNum, hintEdges);
        return {
          selected: malMatch,
          ranked,
          searchQuery: getCandidateDisplayName(malMatch),
          resolvedBy: 'malId' as const,
        };
      }
    }

    const showIdPrefixed = await runSearch(`id:${animeId}`);
    const showIdPrefixedMatch = showIdPrefixed.find((edge) => String(edge.malId || '') === animeId);
    if (showIdPrefixedMatch) {
      const ranked = rankCandidates(getCandidateDisplayName(showIdPrefixedMatch), episodeNum, showIdPrefixed);
      return {
        selected: showIdPrefixedMatch,
        ranked,
        searchQuery: getCandidateDisplayName(showIdPrefixedMatch),
        resolvedBy: 'malId' as const,
      };
    }
  }

  if (edges.length === 0) {
    return {
      selected: null,
      ranked: [],
      searchQuery: animeId,
      resolvedBy: 'query' as const,
    };
  }

  const ranked = rankCandidates(animeId, episodeNum, edges);
  return {
    selected: ranked[0]?.edge || null,
    ranked,
    searchQuery: animeId,
    resolvedBy: 'query' as const,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ animeId: string; episode: string }> }
) {
  const { animeId, episode } = await params;

  const episodeNum = parseInt(episode, 10);
  if (!animeId || !Number.isInteger(episodeNum) || episodeNum < 1) {
    return NextResponse.json({ error: 'Invalid params', sources: [] }, { status: 400 });
  }

  try {
    const resolved = await resolveCandidateFromAnimeId(animeId, episodeNum);
    let selected = resolved.selected;
    let ranked = resolved.ranked;
    let searchQuery = resolved.searchQuery;

    if (!selected) {
      return NextResponse.json({
        error: 'Unable to resolve show from provided anime id.',
        sources: [],
        animeId,
        episodeNum,
      });
    }

    let showId = selected._id;
    let episodeFetch = await fetchEpisodeSources(showId, episodeNum);
    let sources = episodeFetch.sources;
    let upstreamError = episodeFetch.upstreamError;

    if (sources.length === 0) {
      if (ranked.length <= 1) {
        const refreshQuery = getCandidateDisplayName(selected) || searchQuery;
        const refreshResp = await allanimePost<SearchResp>(SEARCH_GQL, {
          search: { allowAdult: false, allowUnknown: false, query: refreshQuery },
          limit: 40,
          page: 1,
          translationType: 'sub',
          countryOrigin: 'ALL',
        }).catch(() => null);

        const refreshEdges = refreshResp?.data?.shows?.edges || [];
        if (refreshEdges.length > 0) {
          ranked = rankCandidates(refreshQuery, episodeNum, refreshEdges);
          searchQuery = refreshQuery;
        }
      }

      const fallback = ranked.find((item) => {
        if (item.edge._id === showId) return false;
        const subCount = item.edge.availableEpisodes?.sub;
        return typeof subCount === 'number' && subCount >= episodeNum;
      });

      if (fallback) {
        showId = fallback.edge._id;
        selected = fallback.edge;
        episodeFetch = await fetchEpisodeSources(showId, episodeNum);
        sources = episodeFetch.sources;
        upstreamError = episodeFetch.upstreamError || upstreamError;
      }
    }

    if (sources.length === 0) {
      const noSourceMessage = upstreamError
        ? `No sources for episode ${episodeNum} on selected show. Upstream reason: ${upstreamError}`
        : `No sources for episode ${episodeNum} on selected show.`;

      return NextResponse.json({
        error: noSourceMessage,
        upstreamError,
        sources: [],
        showId,
        selectedShowName: getCandidateDisplayName(selected),
        searchQuery,
        episodeNum,
        resolvedBy: resolved.resolvedBy,
        availableSub: selected.availableEpisodes?.sub ?? null,
        candidateDebug: ranked.slice(0, 5).map((item) => ({
          id: item.edge._id,
          name: getCandidateDisplayName(item.edge),
          availableSub: item.edge.availableEpisodes?.sub ?? null,
          score: item.score,
        })),
      });
    }

    const final = await resolvePlayableLinks(sources);

    if (final.length === 0) {
      const resolvedEmptyMessage = upstreamError
        ? `Resolved links empty for episode ${episodeNum} on selected show. Upstream reason: ${upstreamError}`
        : `Resolved links empty for episode ${episodeNum} on selected show.`;

      return NextResponse.json({
        error: resolvedEmptyMessage,
        upstreamError,
        sources: [],
        showId,
        selectedShowName: getCandidateDisplayName(selected),
        searchQuery,
        episodeNum,
        resolvedBy: resolved.resolvedBy,
        availableSub: selected.availableEpisodes?.sub ?? null,
      });
    }

    const successUpstreamError = upstreamError;

    return NextResponse.json({
      sources: final,
      streamUrl: final[0]?.url || null,
      isM3U8: final[0]?.isM3U8 ?? false,
      type: final[0]?.type || null,
      provider: final[0]?.provider || null,
      showId,
      selectedShowName: getCandidateDisplayName(selected),
      searchQuery,
      episodeNum,
      resolvedBy: resolved.resolvedBy,
      availableSub: selected.availableEpisodes?.sub ?? null,
      upstreamError: successUpstreamError,
      candidateDebug: ranked.slice(0, 5).map((item) => ({
        id: item.edge._id,
        name: getCandidateDisplayName(item.edge),
        availableSub: item.edge.availableEpisodes?.sub ?? null,
        score: item.score,
      })),
    });
  } catch (error) {
    console.error('[stream] error:', error);
    const message = error instanceof Error ? error.message : 'Unknown';
    return NextResponse.json(
      { error: message, sources: [] },
      { status: mapStreamErrorStatus(message) }
    );
  }
}
