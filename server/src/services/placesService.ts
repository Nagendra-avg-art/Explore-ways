// server/src/services/placesService.ts
// Robust Place Discovery Service with Provider Abstraction, Deduplication & Photo Verification
// ₹0-First Production Architecture: Curated Data + OpenStreetMap + Extensible Provider Layer

import { BackendPlace } from '../types/places.js';
import { CuratedPlaceProvider } from './providers/CuratedPlaceProvider.js';
import { OpenStreetMapProvider } from './providers/OpenStreetMapProvider.js';
import { deduplicatePlaces } from './deduplicationService.js';
import { lookupVerifiedPlacePhotoMetadata } from './imageService.js';
import { calculateHaversineDistanceKm } from '../utils/geoUtils.js';

// Provider singletons
const curatedProvider = new CuratedPlaceProvider();
const osmProvider = new OpenStreetMapProvider();

const nearbyPoiCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Discovers nearby attractions using the multi-provider abstraction:
 * Tier 1: Curated High-Confidence Verified Places (Seed for major destinations)
 * Tier 2: OpenStreetMap Live Nearby POIs
 * Merge, Deduplicate, Validate Quality Gate, and Enrich with Verified Photography.
 *
 * Strict Data Trust Rule: If no places found, returns honest empty state.
 * NEVER silently substitutes unrelated demo places from other cities!
 */
export async function discoverNearbyPlaces(
  userLat: number,
  userLon: number,
  radiusMeters: number = 6000,
  categoryFilter?: string
) {
  const searchRadius = Math.min(25000, Math.max(1000, radiusMeters));
  const category = categoryFilter || 'all';
  const cacheKey = `places_${userLat.toFixed(3)}_${userLon.toFixed(3)}_${searchRadius}_${category}`;

  const cached = nearbyPoiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 1. Query Curated Provider (High-confidence verified regional attractions)
  const curatedResults = await curatedProvider.discoverNearbyPlaces(
    userLat,
    userLon,
    Math.max(searchRadius, 25000), // Curated landmarks within 25km
    category
  );

  // 2. Query OpenStreetMap Provider (Live open discovery around user's active coordinates)
  const osmResults = await osmProvider.discoverNearbyPlaces(
    userLat,
    userLon,
    searchRadius,
    category
  );

  // 3. Combine candidate pools
  const combinedCandidates: BackendPlace[] = [...curatedResults, ...osmResults];

  // 4. Quality Gate Filter (valid coordinates, valid names, distance check)
  const validCandidates = combinedCandidates.filter((p) => {
    if (!p.name || p.name.trim().length < 2) return false;
    if (isNaN(p.lat) || isNaN(p.lon) || p.lat < -90 || p.lat > 90 || p.lon < -180 || p.lon > 180) return false;
    const distanceKm = calculateHaversineDistanceKm(userLat, userLon, p.lat, p.lon);
    // Suppress places excessively far from requested radius (max 35km for major curated hubs)
    if (distanceKm > Math.max(searchRadius / 1000, 35)) return false;
    return true;
  });

  // 5. Deduplicate places conservatively (prevents duplicates like "ISKCON Temple" vs "ISKCON Temple Tirupati")
  const deduplicated = deduplicatePlaces(validCandidates);

  // 6. Sort by distance
  deduplicated.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

  // 7. Enrich candidate places with verified photographs (Wikipedia / Wikimedia Commons)
  await Promise.all(
    deduplicated.slice(0, 15).map(async (p) => {
      // If place does not already have an authenticated photo, look it up
      if (!p.imageUrl || p.imageUrl.trim().length === 0) {
        try {
          const photoMeta = await lookupVerifiedPlacePhotoMetadata(p.name, p.lat, p.lon);
          if (photoMeta && photoMeta.photoUrl) {
            p.photo = photoMeta;
            p.imageUrl = photoMeta.photoUrl;
          } else {
            p.imageUrl = '';
          }
        } catch {
          p.imageUrl = '';
        }
      }
    })
  );

  const resultData = {
    success: true,
    isLive: deduplicated.some((p) => p.provenance === 'osm'),
    source: deduplicated.length > 0 ? (deduplicated.some(p => p.provenance === 'curated') ? 'curated-and-osm' : 'osm-live') : 'none',
    sourceName: deduplicated.length > 0
      ? (deduplicated.some(p => p.provenance === 'curated') ? 'Verified Curated & Live POIs' : 'OpenStreetMap Live POIs')
      : 'No verified places found nearby',
    origin: { lat: userLat, lon: userLon },
    total: deduplicated.length,
    places: deduplicated,
  };

  nearbyPoiCache.set(cacheKey, { timestamp: Date.now(), data: resultData });
  return resultData;
}
