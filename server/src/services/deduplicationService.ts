// server/src/services/deduplicationService.ts
// Conservative Geographic and Semantic Place Deduplication Service

import { BackendPlace } from '../types/places.js';
import { calculateHaversineDistanceKm } from '../utils/geoUtils.js';

/**
 * Normalizes a place name for fuzzy matching (strips cities, noise tokens, punctuation)
 */
export function normalizeNameForIdentity(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '') // remove parentheticals
    .replace(/\b(tirupati|rajahmundry|hyderabad|visakhapatnam|vijayawada|andhra|pradesh|india)\b/g, '') // strip common city tags
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deduplicates a list of places conservatively.
 * If two places refer to the same physical location:
 * - Keeps the one with higher confidence (Curated > OSM)
 * - Retains verified photography if available
 */
export function deduplicatePlaces(places: BackendPlace[]): BackendPlace[] {
  const result: BackendPlace[] = [];

  for (const candidate of places) {
    const candNormName = normalizeNameForIdentity(candidate.name);

    // Look for existing matching place
    const existingIndex = result.findIndex((existing) => {
      // 1. Same provider place ID
      if (
        candidate.providerPlaceId &&
        existing.providerPlaceId &&
        candidate.providerPlaceId === existing.providerPlaceId
      ) {
        return true;
      }

      const distKm = calculateHaversineDistanceKm(
        candidate.lat,
        candidate.lon,
        existing.lat,
        existing.lon
      );

      // Same spot within 50 meters
      if (distKm <= 0.05) {
        return true;
      }

      // Proximity check (within 250 meters) with high name token similarity
      if (distKm <= 0.25) {
        const existNormName = normalizeNameForIdentity(existing.name);
        if (
          candNormName === existNormName ||
          candNormName.includes(existNormName) ||
          existNormName.includes(candNormName)
        ) {
          return true;
        }
      }

      return false;
    });

    if (existingIndex === -1) {
      result.push(candidate);
    } else {
      // Conflict resolution: prefer curated over OSM; prefer verified photo
      const existing = result[existingIndex];
      const candidateIsCurated = candidate.provenance === 'curated' || candidate.source === 'curated';
      const existingIsCurated = existing.provenance === 'curated' || existing.source === 'curated';

      if (candidateIsCurated && !existingIsCurated) {
        // Replace with the curated record
        result[existingIndex] = {
          ...candidate,
          imageUrl: candidate.imageUrl || existing.imageUrl,
          photo: candidate.photo || existing.photo,
        };
      } else if (!existing.imageUrl && candidate.imageUrl) {
        // Enriched existing with candidate's photo
        existing.imageUrl = candidate.imageUrl;
        existing.photo = candidate.photo;
      }
    }
  }

  return result;
}
