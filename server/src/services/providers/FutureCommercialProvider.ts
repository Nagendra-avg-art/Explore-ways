// server/src/services/providers/FutureCommercialProvider.ts
// Extensibility Stub for Future Commercial Places API (Google Places, Foursquare, Radar)
// ₹0-FIRST DESIGN: Never requires billing or credit cards; safely remains dormant when unconfigured.

import { PlaceProvider } from './PlaceProvider.js';
import { BackendPlace } from '../../types/places.js';

export class FutureCommercialProvider implements PlaceProvider {
  readonly name = 'commercial-optional';

  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.COMMERCIAL_PLACES_API_KEY;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  async discoverNearbyPlaces(
    _lat: number,
    _lon: number,
    _radiusMeters: number = 6000,
    _category?: string
  ): Promise<BackendPlace[]> {
    if (!this.isConfigured) {
      // Dormant in ₹0 mode: Returns empty array without error
      return [];
    }

    // Future implementation: When apiKey is supplied, query the commercial Places API
    // and normalize results to BackendPlace contract
    return [];
  }

  async searchPlaces(_query: string, _lat?: number, _lon?: number): Promise<BackendPlace[]> {
    if (!this.isConfigured) {
      return [];
    }
    return [];
  }
}
