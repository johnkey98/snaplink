import crypto from 'node:crypto';
import store from './db.js';

const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 7;
const RESERVED = ['api', 'qr', 'assets', 'health', 'favicon.ico'];

export function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function randomCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

/**
 * Create a short link.
 * @param {string} url      destination URL (validated)
 * @param {string} [alias]  optional custom code [3-30 chars, alphanumeric + - _]
 * @param {number} [expiresInDays] optional TTL
 */
export function createLink({ url, alias, expiresInDays }) {
  if (!isValidUrl(url)) {
    throw Object.assign(new Error('Invalid URL — must start with http:// or https://'), { status: 422 });
  }

  let code = alias?.trim();
  if (code) {
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(code)) {
      throw Object.assign(new Error('Alias must be 3–30 characters: letters, digits, - or _'), { status: 422 });
    }
    if (RESERVED.includes(code.toLowerCase())) {
      throw Object.assign(new Error(`"${code}" is a reserved alias`), { status: 409 });
    }
    if (store.get(code)) {
      throw Object.assign(new Error(`Alias "${code}" is already taken`), { status: 409 });
    }
  } else {
    do {
      code = randomCode();
    } while (store.get(code));
  }

  const link = {
    code,
    url,
    createdAt: new Date().toISOString(),
    expiresAt: expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 864e5).toISOString() : null,
    clicks: [],
  };
  store.save(link);
  return link;
}

export function resolveLink(code) {
  const link = store.get(code);
  if (!link) return null;
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) return { expired: true, link };
  return { expired: false, link };
}

export function recordClick(link, { referrer, userAgent }) {
  link.clicks.push({ ts: new Date().toISOString(), referrer: referrer || 'direct', ua: userAgent || '' });
  store.save(link);
}

export function statsFor(link) {
  const byDay = {};
  const referrers = {};
  const browsers = {};
  for (const c of link.clicks) {
    const day = c.ts.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;

    const ref = c.referrer === 'direct' ? 'Direct' : new URL(c.referrer).hostname;
    referrers[ref] = (referrers[ref] || 0) + 1;

    const ua = c.ua.toLowerCase();
    const browser = ua.includes('chrome') ? 'Chrome' : ua.includes('firefox') ? 'Firefox' : ua.includes('safari') ? 'Safari' : ua.includes('edg') ? 'Edge' : 'Other';
    browsers[browser] = (browsers[browser] || 0) + 1;
  }

  const topReferrers = Object.entries(referrers).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return {
    code: link.code,
    url: link.url,
    totalClicks: link.clicks.length,
    byDay: Object.entries(byDay).sort().map(([date, count]) => ({ date, count })),
    topReferrers: topReferrers.map(([name, count]) => ({ name, count })),
    browsers,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
  };
}
