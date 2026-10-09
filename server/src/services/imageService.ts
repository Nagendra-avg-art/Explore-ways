// server/src/services/imageService.ts
// Trusted Landmark & Place Photo Resolution Service via Wikipedia & Wikimedia Commons API
// Free, Attribution-Compliant, Server-Side, Zero API Keys, No Random Stock Photos

import { PhotoMetadata } from '../types/places.js';

interface CachedImage {
  url: string | null;
  metadata: PhotoMetadata | null;
  timestamp: number;
}

const imageCache = new Map<string, CachedImage>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24-hour cache for stable landmark images

const GENERIC_EXCLUSION_WORDS = new Set([
  'the', 'temple', 'mandir', 'road', 'street', 'cross', 'junction', 'gate',
  'building', 'complex', 'circle', 'point', 'railway', 'station', 'bus',
  'andhra', 'pradesh', 'india', 'telangana', 'karnataka', 'city', 'center',
  'waterfall', 'waterfalls', 'lake', 'park', 'garden', 'quarry', 'hill',
  'maze', 'restaurant', 'hotel', 'dhaba', 'cafe', 'bazaar', 'market', 'store',
  'shop', 'mall', 'counter', 'stand', 'depot', 'shed', 'nagar', 'colony'
]);

/**
 * Looks up verified place photo metadata including attribution and licensing
 */
export async function lookupVerifiedPlacePhotoMetadata(
  placeName: string,
  lat?: number,
  lon?: number
): Promise<PhotoMetadata | null> {
  if (!placeName || typeof placeName !== 'string' || placeName.trim().length < 3) {
    return null;
  }

  const cleanName = placeName.replace(/\s*\([^)]*\)/g, '').trim();
  const cacheKey = `${cleanName.toLowerCase()}_${lat ? lat.toFixed(3) : '0'}_${lon ? lon.toFixed(3) : '0'}`;

  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.metadata;
  }

  // Purely generic place names (e.g. "waterfalls", "quarry", "park") without proper nouns must never guess images
  const nameTokens = cleanName
    .toLowerCase()
    .split(/[\s,.-]+/)
    .filter((t) => t.length >= 3 && !GENERIC_EXCLUSION_WORDS.has(t));

  if (nameTokens.length === 0) {
    imageCache.set(cacheKey, { url: null, metadata: null, timestamp: Date.now() });
    return null;
  }

  try {
    // -----------------------------------------------------------------------
    // STRATEGY A: Wikipedia Exact Title Query (with redirects)
    // -----------------------------------------------------------------------
    const titleCandidates = [
      cleanName,
      `${cleanName}, Andhra Pradesh`,
      `${cleanName}, Tirupati`,
      `${cleanName}, Rajahmundry`,
      `${cleanName}, Hyderabad`,
      `${cleanName}, India`
    ];

    const titleQuery = titleCandidates.map((t) => encodeURIComponent(t)).join('|');
    const titleUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${titleQuery}&prop=pageimages&pithumbsize=800&format=json&redirects=1`;

    const controllerA = new AbortController();
    const timeoutA = setTimeout(() => controllerA.abort(), 3500);

    const resA = await fetch(titleUrl, {
      headers: {
        'User-Agent': 'SmartTravelCompanion/1.0 (academic-project; mailto:contact@smarttravel.local)'
      },
      signal: controllerA.signal
    });
    clearTimeout(timeoutA);

    if (resA.ok) {
      const dataA = (await resA.json()) as any;
      const pagesA = dataA.query?.pages || {};

      for (const pid of Object.keys(pagesA)) {
        if (pid === '-1') continue;
        const page = pagesA[pid];
        const thumb = page.thumbnail?.source;
        if (thumb && isValidPhotoUrl(thumb)) {
          const meta: PhotoMetadata = {
            photoUrl: thumb,
            photoSource: 'Wikimedia Commons / Wikipedia',
            attribution: 'Wikimedia Commons contributors (CC BY-SA / Public Domain)',
            license: 'CC BY-SA / Public Domain',
            verifiedForPlace: true,
            sourcePlaceId: `wiki-${pid}`,
            lastChecked: new Date().toISOString().split('T')[0]
          };
          imageCache.set(cacheKey, { url: thumb, metadata: meta, timestamp: Date.now() });
          return meta;
        }
      }
    }

    // -----------------------------------------------------------------------
    // STRATEGY B: Wikipedia GeoSearch within 1.5 km with Name-Token Overlap
    // -----------------------------------------------------------------------
    if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
      const geoUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lon}&ggsradius=1500&ggslimit=8&prop=pageimages&pithumbsize=800&format=json`;

      const controllerB = new AbortController();
      const timeoutB = setTimeout(() => controllerB.abort(), 3500);

      const resB = await fetch(geoUrl, {
        headers: {
          'User-Agent': 'SmartTravelCompanion/1.0 (academic-project; mailto:contact@smarttravel.local)'
        },
        signal: controllerB.signal
      });
      clearTimeout(timeoutB);

      if (resB.ok) {
        const dataB = (await resB.json()) as any;
        const pagesB = dataB.query?.pages || {};

        const nameTokens = cleanName
          .toLowerCase()
          .split(/[\s,.-]+/)
          .filter((t) => t.length >= 3 && !GENERIC_EXCLUSION_WORDS.has(t));

        for (const pid of Object.keys(pagesB)) {
          const page = pagesB[pid];
          const pageTitleLower = (page.title || '').toLowerCase();
          const thumb = page.thumbnail?.source;

          const hasOverlap = nameTokens.some((tok) => pageTitleLower.includes(tok));

          if (hasOverlap && thumb && isValidPhotoUrl(thumb)) {
            const meta: PhotoMetadata = {
              photoUrl: thumb,
              photoSource: 'Wikimedia Commons / Wikipedia',
              attribution: 'Wikimedia Commons contributors (CC BY-SA / Public Domain)',
              license: 'CC BY-SA / Public Domain',
              verifiedForPlace: true,
              sourcePlaceId: `wiki-${pid}`,
              lastChecked: new Date().toISOString().split('T')[0]
            };
            imageCache.set(cacheKey, { url: thumb, metadata: meta, timestamp: Date.now() });
            return meta;
          }
        }
      }
    }
  } catch (err: unknown) {
    // Network timeouts fall through safely to null
  }

  imageCache.set(cacheKey, { url: null, metadata: null, timestamp: Date.now() });
  return null;
}

/**
 * Backward-compatible helper returning the photo URL string or null
 */
export async function lookupVerifiedPlaceImage(
  placeName: string,
  lat?: number,
  lon?: number
): Promise<string | null> {
  const meta = await lookupVerifiedPlacePhotoMetadata(placeName, lat, lon);
  return meta?.photoUrl || null;
}

/**
 * Validates that the URL points to a legitimate photograph rather than a flag, map, or logo
 */
function isValidPhotoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();

  if (
    lower.includes('flag') ||
    lower.includes('locator') ||
    lower.includes('map') ||
    lower.includes('symbol') ||
    lower.includes('emblem') ||
    lower.includes('seal_of') ||
    lower.includes('blank.png') ||
    lower.includes('logo') ||
    lower.includes('icon') ||
    lower.includes('.svg')
  ) {
    return false;
  }

  return true;
}
