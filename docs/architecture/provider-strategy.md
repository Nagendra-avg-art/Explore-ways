# Provider Strategy: Open-First & Commercial-Ready

## 1. Executive Summary
Smart Travel Companion is designed from day one to operate with **₹0 budget for paid APIs**. We strictly rely on open data ecosystems, our own verified curated dataset, and open meteorological and routing engines. 

At the same time, the provider abstraction allows commercial providers to be added in the future without changing the frontend or database models.

## 2. Current Free Production Providers (₹0)

| Service Domain | Active Provider | Cost | Auth / Keys | Usage & Policy Controls |
| :--- | :--- | :--- | :--- | :--- |
| **Geocoding & Location Search** | OpenStreetMap Nominatim | ₹0 | None | Descriptive User-Agent, 1-sec throttle, static fallback dictionary of 22 Indian hubs |
| **Place Discovery (Open)** | OpenStreetMap Nominatim | ₹0 | None | Bounded viewboxes, 15-minute in-memory caching, rate limit guard |
| **Place Discovery (Curated)** | Local Verified Dataset | ₹0 | None | Curated Indian heritage dataset, zero latency, 100% verified |
| **Landmark Photography** | Wikimedia Commons / Wikipedia | ₹0 | None | 24-hr cache, CC BY-SA compliance, token verification |
| **Road Routing & Geometry** | OSRM Demo Server | ₹0 | None | Driving profiles, turn-by-turn maneuvers, Haversine fallback with 1.28x road curvature |
| **Weather & Forecast** | Open-Meteo | ₹0 | None | Hourly and daily forecast, 15-minute coordinate cache, WMO weather interpretation |

## 3. Extensibility: Future Commercial Providers

### Architecture:
```typescript
export interface PlaceProvider {
  readonly name: string;
  discoverNearbyPlaces(lat: number, lon: number, radiusMeters: number, category?: string): Promise<BackendPlace[]>;
  searchPlaces(query: string, lat?: number, lon?: number): Promise<BackendPlace[]>;
  getPlaceDetails?(placeId: string): Promise<BackendPlace | null>;
}
```

### Future Google Places Integration (Optional):
- Class: `FutureCommercialProvider` in `server/src/services/providers/FutureCommercialProvider.ts`
- **Current State**: Dormant stub. When `GOOGLE_PLACES_API_KEY` is undefined, returns `[]` without throwing exceptions or demanding billing.
- **Benefits If Activated Later**:
  - Higher density of hyper-local commercial spots (small cafes, salons, modern retail).
  - Real-time opening hours and user reviews.
- **Cost Tradeoff**: Google Places API costs ~$17–$32 per 1,000 requests. For student budgets, our current ₹0 open architecture provides high-quality cultural and dining coverage without any financial burden.
