// server/src/services/providers/OpenStreetMapProvider.ts
// Production OpenStreetMap Nominatim Discovery Provider
// Respects usage policies (User-Agent, rate limit cooldown, bounded viewboxes, caching)

import { PlaceProvider } from './PlaceProvider.js';
import { BackendPlace } from '../../types/places.js';
import { normalizePlaceCategory } from '../categoryService.js';
import { calculateHaversineDistanceKm } from '../../utils/geoUtils.js';

interface ProviderCacheEntry {
  data: BackendPlace[];
  timestamp: number;
}

export class OpenStreetMapProvider implements PlaceProvider {
  readonly name = 'osm';

  private cache = new Map<string, ProviderCacheEntry>();
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15-minute cache
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL_MS = 1000; // 1-second throttle per OSM usage policy

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.MIN_REQUEST_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, this.MIN_REQUEST_INTERVAL_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  async discoverNearbyPlaces(
    lat: number,
    lon: number,
    radiusMeters: number = 6000,
    category?: string
  ): Promise<BackendPlace[]> {
    const searchRadius = Math.min(25000, Math.max(1000, radiusMeters));
    const activeCategory = category || 'all';
    const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}_${searchRadius}_${activeCategory}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const places: BackendPlace[] = [];

    try {
      const delta = Math.min(0.18, (searchRadius / 1000) * 0.012);
      const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;

      let searchTerm = 'attraction';
      if (activeCategory === 'temples') searchTerm = 'temple';
      else if (activeCategory === 'history') searchTerm = 'monument';
      else if (activeCategory === 'nature') searchTerm = 'park';
      else if (activeCategory === 'food') searchTerm = 'restaurant';
      else if (activeCategory === 'cafes') searchTerm = 'cafe';
      else if (activeCategory === 'shopping') searchTerm = 'market';
      else if (activeCategory === 'culture') searchTerm = 'museum';
      else if (activeCategory === 'photography') searchTerm = 'viewpoint';
      else if (activeCategory === 'architecture') searchTerm = 'palace';

      await this.throttle();

      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        searchTerm
      )}&bounded=1&viewbox=${viewbox}&limit=30`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'SmartTravelCompanion/1.0 (academic-project; mailto:contact@smarttravel.local)',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const items = (await response.json()) as any[];
        if (Array.isArray(items)) {
          for (const item of items) {
            const rawName = item.name || item.display_name.split(',')[0];
            if (!rawName || rawName.trim().length < 2) continue;
            let name = rawName.trim();

            const pLat = parseFloat(item.lat);
            const pLon = parseFloat(item.lon);
            if (isNaN(pLat) || isNaN(pLon)) continue;

            const distanceKm = calculateHaversineDistanceKm(lat, lon, pLat, pLon);
            if (distanceKm * 1000 > searchRadius * 1.2) continue;

            const addressParts = (item.display_name || '').split(',');
            const address = addressParts.slice(1, 3).map((s: string) => s.trim()).filter(Boolean).join(', ') || undefined;

            if (name.length <= 8 && addressParts[1]) {
              name = `${name} (${addressParts[1].trim()})`;
            }

            const normCat = normalizePlaceCategory(item.type, item.category, name);
            if (activeCategory !== 'all' && normCat.category !== activeCategory) {
              continue;
            }

            const travelTimeMin = Math.max(3, Math.round(distanceKm * 2.5 + 3));

            places.push({
              id: `osm-${item.place_id || item.osm_id}`,
              internalId: `osm-${item.place_id || item.osm_id}`,
              provider: 'osm',
              providerPlaceId: String(item.place_id || item.osm_id),
              name,
              category: normCat.category,
              categoryLabel: normCat.categoryLabel,
              lat: pLat,
              lon: pLon,
              distanceKm,
              travelTimeMin,
              visitDuration: normCat.category === 'history' ? '1–2 hrs' : '45–60 min',
              imageUrl: '',
              shortDescription: `Authentic ${normCat.categoryLabel.replace(/^[^\w\s]+/, '').trim()}${
                address ? ` in ${address}` : ''
              }, discovered via OpenStreetMap live coordinates.`,
              fullDescription: item.display_name,
              whyRecommended: `Discovered ~${distanceKm.toFixed(1)} km from your current GPS position.`,
              tags: [normCat.categoryLabel.replace(/^[^\w\s]+/, '').trim(), 'Live POI', ...(address ? [address] : [])],
              source: 'live',
              sourceName: 'OpenStreetMap Live POI',
              provenance: 'osm',
              confidence: normCat.confidence,
              verified: false,
              address,
            });
          }
        }
      }
    } catch (err: unknown) {
      console.warn('[OpenStreetMapProvider] Request skipped or timed out:', (err as Error)?.message);
    }

    places.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    this.cache.set(cacheKey, { data: places, timestamp: Date.now() });
    return places;
  }

  async searchPlaces(query: string, lat?: number, lon?: number): Promise<BackendPlace[]> {
    const q = query.trim();
    if (!q) return [];

    const places: BackendPlace[] = [];

    try {
      await this.throttle();

      const searchUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        q
      )}&limit=10&addressdetails=1`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'SmartTravelCompanion/1.0 (academic-project; mailto:contact@smarttravel.local)',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const items = (await response.json()) as any[];
        if (Array.isArray(items)) {
          for (const item of items) {
            const rawName = item.name || item.display_name.split(',')[0];
            if (!rawName) continue;

            const pLat = parseFloat(item.lat);
            const pLon = parseFloat(item.lon);
            if (isNaN(pLat) || isNaN(pLon)) continue;

            const distanceKm =
              lat !== undefined && lon !== undefined
                ? calculateHaversineDistanceKm(lat, lon, pLat, pLon)
                : 0;

            const normCat = normalizePlaceCategory(item.type, item.category, rawName);

            places.push({
              id: `osm-${item.place_id || item.osm_id}`,
              internalId: `osm-${item.place_id || item.osm_id}`,
              provider: 'osm',
              providerPlaceId: String(item.place_id || item.osm_id),
              name: rawName,
              category: normCat.category,
              categoryLabel: normCat.categoryLabel,
              lat: pLat,
              lon: pLon,
              distanceKm,
              travelTimeMin: Math.max(3, Math.round(distanceKm * 2.5 + 3)),
              visitDuration: '45–60 min',
              imageUrl: '',
              shortDescription: item.display_name,
              whyRecommended: 'Discovered via OpenStreetMap search.',
              tags: [normCat.categoryLabel.replace(/^[^\w\s]+/, '').trim()],
              source: 'live',
              sourceName: 'OpenStreetMap Search',
              provenance: 'osm',
              confidence: normCat.confidence,
              verified: false,
            });
          }
        }
      }
    } catch (err: unknown) {
      console.warn('[OpenStreetMapProvider] Search skipped or timed out:', (err as Error)?.message);
    }

    return places;
  }
}
