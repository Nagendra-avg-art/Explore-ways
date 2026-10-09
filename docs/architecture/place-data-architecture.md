# Place Data Architecture

## 1. Overview & Core Product Philosophy
Smart Travel Companion has transitioned from an initial prototype to a **₹0-first, consumer-facing production travel architecture**. 
Our primary objective is **real-world data trust**:
- Real places only
- Real geographic coordinates
- Trustworthy distances
- Explicit provenance and confidence
- Zero invented ratings or reviews
- Zero silent fallbacks to unrelated cities

## 2. Pluggable Provider Architecture
Place discovery is completely abstracted away from specific APIs through the `PlaceProvider` interface:

```
                      PlaceProvider (Interface)
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     ▼                           ▼                           ▼
CuratedPlaceProvider    OpenStreetMapProvider     FutureCommercialProvider
(High-Confidence Seed)   (Live Open Discovery)     (Dormant / $0-First Stub)
```

### Provider Responsibilities:
1. **`CuratedPlaceProvider`**:
   - Manages intentionally verified cultural and tourism landmarks (e.g. *Sri Venkateswara Temple*, *Chandragiri Fort*, *Godavari Arch Bridge*, *Charminar*).
   - Provenance: State Tourism Boards, Archaeological Survey of India (ASI).
   - Confidence: `HIGH`.
   - Verified: `true`.

2. **`OpenStreetMapProvider`**:
   - Queries OpenStreetMap Nominatim with bounded viewboxes.
   - Strictly abides by OSM usage policies (User-Agent header, 1-second throttling, viewbox bounds).
   - Normalizes tags through `categoryService`.
   - Confidence: `MEDIUM`.
   - Verified: `false`.

3. **`FutureCommercialProvider`**:
   - An architectural interface ready for Google Places API or other commercial services when budget allows.
   - In current ₹0 mode, remains dormant and never requires credit cards or billing setup.

## 3. Data Pipeline: Quality Gate & Deduplication

```
  [User Coordinates & Radius]
               │
   ┌───────────┴───────────┐
   ▼                       ▼
CuratedProvider        OSMProvider
   │                       │
   └───────────┬───────────┘
               │
        [Quality Gate]
  (Valid coordinates, non-empty names,
   bounding distance <= 35km)
               │
        [Deduplication]
  (Coordinate proximity <= 50m,
   or <= 250m with normalized token overlap.
   Prefers Curated over OSM)
               │
      [Photo Resolution]
  (Wikipedia / Wikimedia Commons
   Landmark Image Lookup with CC Attribution)
               │
    [Normalized BackendPlace[]]
```

## 4. Normalized Data Model
Every place returned to the application adheres to the `BackendPlace` contract:
- `id`: Unique string identifier (`curated-...` or `osm-...`)
- `provider`: `'curated'` | `'osm'` | `'commercial'`
- `provenance`: Origin tracking (`'curated'` | `'osm'`)
- `confidence`: `'HIGH'` | `'MEDIUM'` | `'LOW'` | `'UNKNOWN'`
- `name` & `officialName`: Clean display name and verified official title
- `category` & `categoryLabel`: Normalized canonical category
- `lat` & `lon`: Valid geographic coordinates
- `distanceKm` & `travelTimeMin`: Calculated relative to user's active context
- `rating` & `reviewCount`: Undefined unless legitimately verified
- `photo`: Structured `PhotoMetadata` object with URL, attribution, and license
- `isOpenNow`: Computed from operating hours or left undefined if unknown

## 5. Location Safety & Invalidation Rules
- When the user changes destination (e.g. from Hyderabad to Tirupati):
  1. Stale places and dining records are immediately invalidated in client state.
  2. Cache keys explicitly include coordinate buckets (`lat.toFixed(3)_lon.toFixed(3)`).
  3. Map markers, itinerary schedules, food explorer, weather, and AI context synchronize simultaneously.
  4. If a destination has no POIs, it returns an honest empty state: `"No verified places found nearby"`.
  5. The application **never silently substitutes Hyderabad demo places for other cities**.
