// server/src/services/providers/CuratedPlaceProvider.ts
// Provider serving intentionally verified, high-confidence curated place records

import { PlaceProvider } from './PlaceProvider.js';
import { BackendPlace } from '../../types/places.js';
import { CURATED_PLACES, CuratedPlaceRecord } from '../../data/curated/curatedPlaces.js';
import { calculateHaversineDistanceKm, checkIsOpenNow } from '../../utils/geoUtils.js';

export class CuratedPlaceProvider implements PlaceProvider {
  readonly name = 'curated';

  async discoverNearbyPlaces(
    lat: number,
    lon: number,
    radiusMeters: number = 35000,
    category?: string
  ): Promise<BackendPlace[]> {
    const radiusKm = radiusMeters / 1000;
    const matched: BackendPlace[] = [];

    for (const place of CURATED_PLACES) {
      const distanceKm = calculateHaversineDistanceKm(lat, lon, place.lat, place.lon);
      if (distanceKm <= radiusKm) {
        if (!category || category === 'all' || place.category === category) {
          const isOpenNow = checkIsOpenNow(place);
          const travelTimeMin = Math.max(5, Math.round(distanceKm * 2.5 + 4));

          matched.push({
            ...place,
            distanceKm,
            travelTimeMin,
            isOpenNow,
            source: 'curated',
            sourceName: 'Verified Curated Heritage Data',
            provenance: 'curated',
            confidence: 'HIGH',
            verified: true,
          });
        }
      }
    }

    matched.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return matched;
  }

  async searchPlaces(query: string, lat?: number, lon?: number): Promise<BackendPlace[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matched: BackendPlace[] = [];
    for (const place of CURATED_PLACES) {
      const matchesName = place.name.toLowerCase().includes(q) ||
        place.officialName.toLowerCase().includes(q) ||
        (place.alternateNames && place.alternateNames.some(a => a.toLowerCase().includes(q))) ||
        place.city.toLowerCase().includes(q) ||
        place.tags.some(t => t.toLowerCase().includes(q));

      if (matchesName) {
        let distanceKm = 0;
        let travelTimeMin = 15;
        if (lat !== undefined && lon !== undefined) {
          distanceKm = calculateHaversineDistanceKm(lat, lon, place.lat, place.lon);
          travelTimeMin = Math.max(5, Math.round(distanceKm * 2.5 + 4));
        }

        matched.push({
          ...place,
          distanceKm,
          travelTimeMin,
          source: 'curated',
          sourceName: 'Verified Curated Heritage Data',
          provenance: 'curated',
          confidence: 'HIGH',
          verified: true,
        });
      }
    }

    return matched;
  }

  async getPlaceDetails(placeId: string): Promise<BackendPlace | null> {
    const record = CURATED_PLACES.find((p) => p.id === placeId);
    if (!record) return null;

    return {
      ...record,
      source: 'curated',
      sourceName: 'Verified Curated Heritage Data',
      provenance: 'curated',
      confidence: 'HIGH',
      verified: true,
    };
  }
}
