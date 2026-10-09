// server/src/services/providers/PlaceProvider.ts
// Abstract interface for place data providers (OpenStreetMap, Curated, Future Commercial)

import { BackendPlace } from '../../types/places.js';

export interface PlaceProvider {
  /**
   * Unique identifier for this provider (e.g., 'osm', 'curated', 'google_places_optional')
   */
  readonly name: string;

  /**
   * Discovers places physically near a coordinate pair within a given radius.
   */
  discoverNearbyPlaces(
    lat: number,
    lon: number,
    radiusMeters: number,
    category?: string
  ): Promise<BackendPlace[]>;

  /**
   * Searches for places by keyword text query and optional reference coordinates.
   */
  searchPlaces(
    query: string,
    lat?: number,
    lon?: number
  ): Promise<BackendPlace[]>;

  /**
   * Fetches full place details by ID if supported by the provider.
   */
  getPlaceDetails?(placeId: string): Promise<BackendPlace | null>;
}
