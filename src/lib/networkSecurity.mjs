import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const LOCAL_HOSTNAMES = new Set(['localhost', 'localhost.localdomain']);

function parseIpv4(value) {
  const parts = value.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null;
  }
  return parts;
}

function isPrivateIpv4(value) {
  const parts = parseIpv4(value);
  if (!parts) return false;

  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;

  return false;
}

function normalizeIpv6(value) {
  return value.toLowerCase();
}

function isPrivateIpv6(value) {
  const normalized = normalizeIpv6(value);

  if (normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;

  return false;
}

export function isPrivateIp(value) {
  const version = isIP(value);
  if (version === 4) return isPrivateIpv4(value);
  if (version === 6) return isPrivateIpv6(value);
  return false;
}

async function defaultResolver(hostname) {
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results;
}

export async function isPrivateHostname(hostname, resolver = defaultResolver) {
  const clean = (hostname || '').trim().toLowerCase();
  if (!clean) return true;

  if (LOCAL_HOSTNAMES.has(clean)) return true;

  if (isIP(clean)) {
    return isPrivateIp(clean);
  }

  try {
    const records = await resolver(clean);
    return records.some((record) => isPrivateIp(record.address));
  } catch {
    return true;
  }
}
