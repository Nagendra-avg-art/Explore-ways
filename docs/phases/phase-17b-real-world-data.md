# Phase 17B — Real-World Place & Photo Data Foundation

## 1. Goal & Milestone Definition
Phase 17B transitions Smart Travel Companion into a consumer-grade, production-ready travel platform with ₹0 infrastructure costs. 

### Core Priorities:
- Real-world data grounding
- Geographic location consistency
- Conservative deduplication
- Elimination of random stock photography
- Strict isolation of mock/demo datasets
- Pluggable provider abstraction
- Manual curated data workflow for Indian destinations

## 2. Key Architecture Additions
1. **`PlaceProvider` Abstraction**: `CuratedPlaceProvider`, `OpenStreetMapProvider`, and `FutureCommercialProvider` (stub).
2. **Normalized Place Model**: Features `provenance`, `confidence`, `photo` metadata (`attribution`, `license`), and optional fields left undefined when unverified.
3. **Category Normalization (`categoryService.ts`)**: Prevents misclassifications across OSM tags (e.g., dining never misclassified as temple).
4. **Deduplication Engine (`deduplicationService.ts`)**: Merges duplicate records within 50m, or within 250m with normalized token overlap, preferring curated records over raw OSM records.
5. **Photo Resolver (`imageService.ts`)**: Queries Wikipedia/Wikimedia Commons for authentic landmark images; returns attribution and licensing metadata; never returns random stock photos.

## 3. Manual Curated Data Workflow
To manually verify and add high-quality seed attractions for important Indian destinations, add records to `server/src/data/curated/curatedPlaces.ts`:

### Template:
```typescript
{
  id: 'curated-<city_slug>-<place_slug>',
  name: 'Place Name',
  officialName: 'Full Official Title',
  alternateNames: ['Local Name', 'Colloquial Name'],
  category: 'temples' | 'history' | 'nature' | 'culture' | 'food' | 'cafes' | 'shopping' | 'photography',
  categoryLabel: '🛕 Category Label',
  city: 'City Name',
  state: 'State Name',
  country: 'India',
  lat: 13.6288,
  lon: 79.4192,
  visitDuration: '1–2 hrs',
  imageUrl: '', // Left empty; automatically matched with Wikimedia photograph
  shortDescription: '1–2 sentence accurate description.',
  fullDescription: 'Comprehensive background details.',
  whyRecommended: 'Contextual visiting tip or reason for visit.',
  tags: ['Tag 1', 'Tag 2'],
  entryFee: 'Free' | '₹25 (Indians)',
  website: 'https://official-website.gov.in',
  provenance: 'curated',
  confidence: 'HIGH',
  verified: true,
  verificationSource: 'Archaeological Survey of India (ASI) / State Tourism Board',
  verifiedAt: '2026-10-09'
}
```

### Initial Destination Targets for Controlled Population:
- **Tirupati**: Sri Venkateswara Swamy Temple, Chandragiri Fort, Kapila Theertham, Silathoranam
- **Rajahmundry**: Godavari Arch Bridge, ISKCON Rajahmundry, Kotilingeshwara Temple
- **Hyderabad**: Charminar, Golconda Fort, Chowmahalla Palace, Birla Mandir
- **Visakhapatnam**: INS Kursura Submarine Museum, Kailasagiri Hilltop Park
- **Vijayawada**: Kanaka Durga Temple, Undavalli Rock-Cut Caves

## 4. Verification & Testing
- Automated test suite: `tests/phase/phase-17/test-phase17b-real-world-data.mjs` (10/10 tests passing).
- Location regression suite: `tests/phase/phase-15/test-location-regression.mjs` (11/11 tests passing).
- Adversarial test suite: `tests/phase/phase-16/test-phase16-adversarial.mjs` (34/34 tests passing).
- Media and status suite: `tests/phase/phase-16/test-phase16-media-status.mjs` (9/9 tests passing).
- Frontend and backend production builds compile cleanly with zero TypeScript errors.
