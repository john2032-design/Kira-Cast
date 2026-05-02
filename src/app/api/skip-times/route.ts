import { NextRequest, NextResponse } from 'next/server';

type AniSkipResult = {
  interval?: {
    startTime?: number;
    endTime?: number;
  };
  skipType?: string;
};

type AniSkipResponse = {
  found?: boolean;
  results?: AniSkipResult[];
};

function getPositiveInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getPositiveNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const malId = getPositiveInteger(params.get('malId'));
  const episode = getPositiveInteger(params.get('episode'));
  const duration = getPositiveNumber(params.get('duration'));

  if (!malId || !episode || !duration) {
    return NextResponse.json({ found: false, results: [] }, { status: 200 });
  }

  const url = new URL(`https://api.aniskip.com/v2/skip-times/${malId}/${episode}`);
  url.searchParams.set('episodeLength', String(Math.round(duration)));
  url.searchParams.append('types', 'op');
  url.searchParams.append('types', 'ed');

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return NextResponse.json({ found: false, results: [] }, { status: 200 });
    }

    const payload = (await response.json()) as AniSkipResponse;
    const results = (payload.results || [])
      .map((item) => {
        const skipType = item.skipType?.toLowerCase();
        let type: 'op' | 'ed' | null = null;

        if (skipType?.includes('op')) type = 'op';
        if (skipType?.includes('ed')) type = 'ed';

        return {
          type,
          startTime: item.interval?.startTime,
          endTime: item.interval?.endTime,
        };
      })
      .filter((item) => (
        item.type !== null &&
        typeof item.startTime === 'number' &&
        typeof item.endTime === 'number' &&
        item.endTime > item.startTime &&
        item.startTime >= 0
      ));

    const normalizedResults = results.map((item) => ({
      type: item.type as 'op' | 'ed',
      startTime: item.startTime,
      endTime: item.endTime,
    }));

    return NextResponse.json({ found: payload.found === true && normalizedResults.length > 0, results: normalizedResults });
  } catch {
    return NextResponse.json({ found: false, results: [] }, { status: 200 });
  }
}
