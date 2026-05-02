import { NextRequest, NextResponse } from 'next/server';
import { isPrivateHostname } from '@/lib/networkSecurity.mjs';

const ALLANIME_REFERER = 'https://allmanga.to';
const AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');

  if (!target) {
    return new NextResponse('Missing url param', { status: 400 });
  }

  // Only allow HTTPS URLs (no internal network access)
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (parsed.protocol !== 'https:') {
    return new NextResponse('Only HTTPS allowed', { status: 403 });
  }

  if (await isPrivateHostname(parsed.hostname)) {
    return new NextResponse('Private or loopback targets are not allowed', { status: 403 });
  }

  // Forward Range header so video seeking works without downloading the full file
  const upstreamHeaders: HeadersInit = {
    Referer: ALLANIME_REFERER,
    Origin: ALLANIME_REFERER,
    'User-Agent': AGENT,
  };
  const rangeHeader = req.headers.get('range');
  if (rangeHeader) {
    (upstreamHeaders as Record<string, string>)['Range'] = rangeHeader;
  }

  console.log(`[proxy] → ${target}${rangeHeader ? ` (${rangeHeader})` : ''}`);

  try {
    const upstream = await fetch(target, {
      headers: upstreamHeaders,
      cache: 'no-store',
    });

    if (!upstream.ok && upstream.status !== 206) {
      console.error(`[proxy] upstream ${upstream.status} for ${target}`);
      return new NextResponse(`Upstream error: ${upstream.status}`, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

    // ── M3U8 playlist: must rewrite internal URLs through proxy ─────────────
    const isM3u8 =
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegurl') ||
      target.split('?')[0].endsWith('.m3u8');

    if (isM3u8) {
      // Buffer only the small text playlist
      const text = await upstream.text();
      const baseOrigin = parsed.origin;
      const basePath = target.substring(0, target.lastIndexOf('/') + 1);

      const rewritten = text
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return line;

          let absoluteUrl: string;
          if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
            absoluteUrl = trimmed;
          } else if (trimmed.startsWith('/')) {
            absoluteUrl = `${baseOrigin}${trimmed}`;
          } else {
            absoluteUrl = `${basePath}${trimmed}`;
          }

          return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        })
        .join('\n');

      return new NextResponse(rewritten, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      });
    }

    // ── TS segments / MP4 / binary: STREAM directly — do NOT buffer ─────────
    // Streaming avoids the multi-second delay of downloading the full file
    // before the browser gets the first byte.
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    };

    // Forward content metadata so the browser can render a seekable player
    const forwardHeaders = ['content-length', 'content-range', 'content-encoding'];
    for (const h of forwardHeaders) {
      const v = upstream.headers.get(h);
      if (v) responseHeaders[h] = v;
    }

    return new NextResponse(upstream.body, {
      status: upstream.status, // preserve 206 Partial Content for range requests
      headers: responseHeaders,
    });
  } catch (err) {
    console.error('[proxy] fetch error:', err);
    return new NextResponse('Proxy fetch failed', { status: 502 });
  }
}
