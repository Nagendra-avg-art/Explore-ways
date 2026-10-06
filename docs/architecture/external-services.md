# External Services & Provider Documentation

## 1. OpenStreetMap (Nominatim)
- **Service Used:** Nominatim Search & Reverse Geocoding.
- **Endpoint:** `https://nominatim.openstreetmap.org/search`
- **Attribution Requirement:**
  - Mandatory credit: *© OpenStreetMap contributors*.
  - Clearly acknowledged in application footer and map attribution string.
- **Usage & Rate Limits:**
  - Nominatim Public Usage Policy requires a descriptive `User-Agent` header (`SmartTravelCompanion/1.0`).
  - Strict maximum rate of 1 request per second for public servers.
- **Caching Strategy:**
  - All location and POI queries are cached in-memory with a 10-minute TTL based on quantized coordinate keys (`lat.toFixed(3)_lon.toFixed(3)`).
- **Fallback Behavior:**
  - If Nominatim returns HTTP 429, times out (>4000ms), or returns fewer than 3 items, the backend gracefully switches to local curated seed datasets (`data/demo/`).
- **Provider Replacement:**
  - `placesService.ts` and `foodService.ts` isolate all Nominatim queries. To switch to Google Places API or Mapbox, only these service methods need updating; frontend controllers and React components require zero changes.

---

## 2. OSRM (Open Source Routing Machine)
- **Service Used:** OSRM Driving Route Service.
- **Endpoint:** `http://router.project-osrm.org/route/v1/driving/...`
- **Purpose:** Fetches realistic road driving geometry (`overview=full&geometries=geojson`), turn-by-turn distance, and driving duration.
- **Attribution:** *© OSRM and OpenStreetMap contributors*.
- **Caching & Fallback:**
  - 30-minute in-memory cache keyed by waypoints.
  - Fallback: Great-circle Haversine distance with an urban road curvature multiplier (1.28x) when OSRM is unreachable.

---

## 3. Google Gemini API
- **Model:** `gemini-2.5-flash` (or configurable via `GEMINI_MODEL` environment variable).
- **Endpoint:** Google Generative Language REST API (`generateContent`).
- **Grounding Architecture:**
  - Controlled temperature ($T=0.2$) for factual answers.
  - Injected with compact, verified application data.
  - Deterministic offline fallback engine generates structured responses if the API key is not provided or connectivity fails.
