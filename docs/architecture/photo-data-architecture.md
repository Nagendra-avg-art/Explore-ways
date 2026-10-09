# Photo Data Architecture

## 1. ₹0-First Photo Policy: Trust Above All
A travel companion cannot be trusted if it displays a generic temple photo and labels it as the exact shrine the user wants to visit, or assigns an unrelated cafe photo to a local restaurant.

### Core Photo Rules:
1. **Never use random stock images**: Stock photo libraries (e.g. Unsplash category defaults) have been completely eliminated from live POIs.
2. **Exact landmark match only**: Images must be reasonably and verifiably associated with the actual place.
3. **Honest fallback**: If no trustworthy photograph is available, render a clean, high-contrast category placeholder (e.g., *"Cultural Place • Verified Location"* or *"Dining • Verified Dining"*).
4. **No broken image frames**: HTML `<img>` elements feature `loading="lazy"` and `onError={() => setImageError(true)}` to seamlessly fall back to placeholders without layout jitter.

## 2. Photo Resolver Pipeline
Photographs are resolved exclusively on the server side via Wikimedia Commons / Wikipedia APIs:

```
                  Place Name & Coordinates
                             │
            Step 1: In-Memory Cache Check
            (24-Hour TTL by place name + coordinates)
                             │
            Step 2: Wikipedia Title Search
            (Redirects enabled, min thumbnail size 800px)
                             │
            Step 3: Geosearch Radius Search (<= 1.5 km)
            (Extracts name tokens and requires semantic overlap
             to prevent snapping to unrelated neighboring articles)
                             │
            Step 4: Image File Sanitization
            (Filters out flags, maps, logos, coats of arms, SVGs)
                             │
            Step 5: Attribution & Licensing
            (Attaches CC BY-SA / Public Domain attribution metadata)
```

## 3. Photo Metadata Contract
When a photo is successfully resolved, the server returns a structured `PhotoMetadata` object:
```typescript
interface PhotoMetadata {
  photoUrl: string | null;
  photoSource: string;        // 'Wikimedia Commons / Wikipedia'
  attribution: string;        // 'Wikimedia Commons contributors (CC BY-SA / Public Domain)'
  license: string;            // 'CC BY-SA / Public Domain'
  verifiedForPlace: boolean;  // true
  sourcePlaceId?: string;     // 'wiki-39819936'
  lastChecked: string;        // '2026-10-09'
}
```

## 4. UI Rendering Specifications
- **Aspect Ratio**: 16:9 (`aspect-video`) or 4:3 with `object-cover`.
- **Loading State**: Subtle background pulse (`bg-slate-100`).
- **Error Handling**: Silent transition to the clean category placeholder without error icons or broken image boxes.
- **Attribution Display**: Rendered in `PlaceDetailsModal` so users can see the exact open license and image source.
