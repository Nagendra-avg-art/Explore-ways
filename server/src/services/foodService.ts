// server/src/services/foodService.ts
// Service handling food POI discovery, Nominatim dining integration, and caching

import { BackendFoodPlace, FoodCategory } from '../types/places.js';
import { DEMO_FOOD_PLACES } from '../data/demo/demoFoodPlaces.js';
import { calculateHaversineDistanceKm, checkIsOpenNow } from '../utils/geoUtils.js';

const nearbyFoodCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Discovers nearby dining options using OpenStreetMap Nominatim with curated fallback
 */
export async function discoverNearbyFoodPlaces(
  userLat: number,
  userLon: number,
  radiusMeters: number = 5000,
  categoryFilter: string = 'all',
  isOpenNowFilter: boolean = false
) {
  const searchRadius = Math.min(15000, Math.max(1000, radiusMeters));
  const cacheKey = `food_${userLat.toFixed(3)}_${userLon.toFixed(3)}_${searchRadius}_${categoryFilter}_${isOpenNowFilter}`;
  
  const cached = nearbyFoodCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const liveFoodPlaces: BackendFoodPlace[] = [];
  const seenKeys = new Set<string>();

  // TIER 1: Nominatim live dining search bounded by viewbox
  try {
    const delta = Math.min(0.12, (searchRadius / 1000) * 0.012);
    const viewbox = `${userLon - delta},${userLat + delta},${userLon + delta},${userLat - delta}`;

    let queryTerm = 'restaurant';
    if (categoryFilter === 'cafe') queryTerm = 'cafe';
    else if (categoryFilter === 'fast_food') queryTerm = 'fast_food';
    else if (categoryFilter === 'vegetarian') queryTerm = 'vegetarian';

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(queryTerm)}&bounded=1&viewbox=${viewbox}&limit=35`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const nomRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'SmartTravelCompanion/1.0 (academic-project)',
        'Accept-Language': 'en'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (nomRes.ok) {
      const items = (await nomRes.json()) as any[];
      if (Array.isArray(items)) {
        for (const item of items) {
          const rawName = item.name || item.display_name.split(',')[0];
          if (!rawName || rawName.trim().length < 2) continue;
          const name = rawName.trim();
          const pLat = parseFloat(item.lat);
          const pLon = parseFloat(item.lon);
          if (isNaN(pLat) || isNaN(pLon)) continue;

          const distanceKm = calculateHaversineDistanceKm(userLat, userLon, pLat, pLon);
          if (distanceKm * 1000 > searchRadius) continue;

          const normKey = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${pLat.toFixed(3)}_${pLon.toFixed(3)}`;
          if (seenKeys.has(normKey)) continue;
          seenKeys.add(normKey);

          const addressParts = item.display_name.split(',');
          const address = addressParts.slice(1, 3).map((s: string) => s.trim()).filter(Boolean).join(', ') || undefined;

          // Categorize food place
          const lowerName = name.toLowerCase();
          const itemType = (item.type || '').toLowerCase();
          let fCat: FoodCategory = 'restaurant';
          let fCatLabel = 'Restaurant';

          if (itemType === 'cafe' || lowerName.includes('cafe') || lowerName.includes('chai') || lowerName.includes('tea') || lowerName.includes('coffee') || lowerName.includes('bakery')) {
            fCat = 'cafe';
            fCatLabel = 'Cafe';
          } else if (itemType === 'fast_food' || lowerName.includes('fast food') || lowerName.includes('burger') || lowerName.includes('pizza') || lowerName.includes('tiffin')) {
            fCat = 'fast_food';
            fCatLabel = 'Fast Food';
          } else if (lowerName.includes('veg') || lowerName.includes('bhojanalay') || lowerName.includes('jain') || lowerName.includes('udupi')) {
            fCat = 'vegetarian';
            fCatLabel = 'Vegetarian';
          } else if (lowerName.includes('biryani') || lowerName.includes('hyderabadi') || lowerName.includes('bawarchi') || lowerName.includes('shadab') || lowerName.includes('dhaba')) {
            fCat = 'local';
            fCatLabel = 'Local / Regional';
          } else {
            fCat = 'restaurant';
            fCatLabel = 'Restaurant';
          }

          if (categoryFilter !== 'all' && fCat !== categoryFilter) {
            continue;
          }

          const travelTimeMin = Math.max(3, Math.round(distanceKm * 2.5 + 3));

          liveFoodPlaces.push({
            id: `osm-food-${item.place_id || item.osm_id}`,
            name,
            category: 'food',
            categoryLabel: '🍴 Dining',
            foodCategory: fCat,
            foodCategoryLabel: fCatLabel,
            lat: pLat,
            lon: pLon,
            distanceKm,
            travelTimeMin,
            visitDuration: fCat === 'cafe' ? '30–45 min' : '45–60 min',
            imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
            shortDescription: `Authentic ${fCatLabel} dining discovered near your active coordinates.`,
            fullDescription: item.display_name,
            whyRecommended: `Discovered ~${distanceKm.toFixed(1)} km from your current location.`,
            recommendationReason: `Good match: Located within ${distanceKm.toFixed(1)} km.`,
            tags: [fCatLabel, 'Nearby Dining'],
            source: 'live',
            sourceName: 'Live OpenStreetMap data',
            address,
            priceLevel: 'unavailable',
            priceLevelDisplay: 'Price not available',
            openingHoursDisplay: 'Hours unavailable',
            rating: undefined,
            reviewCount: undefined,
            openingHours: undefined,
            isOpenNow: undefined,
            vegetarian: fCat === 'vegetarian' ? true : undefined
          });
        }
      }
    }
  } catch (nomErr: any) {
    console.warn('[Food API] Nominatim food query failed or timed out:', nomErr?.message);
  }

  // TIER 2: If live places found >= 3, return them sorted by distance
  if (liveFoodPlaces.length >= 3) {
    liveFoodPlaces.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

    let filtered = liveFoodPlaces;
    if (isOpenNowFilter) {
      filtered = filtered.filter(p => p.isOpenNow === true);
    }

    const resultData = {
      success: true,
      isLive: true,
      source: 'osm-live',
      sourceName: 'Live OpenStreetMap data',
      origin: { lat: userLat, lon: userLon },
      radiusMeters: searchRadius,
      total: filtered.length,
      places: filtered
    };

    nearbyFoodCache.set(cacheKey, { timestamp: Date.now(), data: resultData });
    return resultData;
  }

  // TIER 3: Curated Demo Fallback with distance recalculation
  let demoFallback = DEMO_FOOD_PLACES.map((p) => {
    const dist = calculateHaversineDistanceKm(userLat, userLon, p.lat, p.lon);
    const isOpen = checkIsOpenNow(p);
    return {
      ...p,
      distanceKm: dist,
      travelTimeMin: Math.max(3, Math.round(dist * 2.5 + 3)),
      isOpenNow: isOpen,
      recommendationReason: `Good match because it is ${isOpen ? 'open now, ' : ''}within ${dist.toFixed(1)} km, and fits your budget.`,
      source: 'demo' as const,
      sourceName: 'Demo data'
    };
  });

  // Filter demo fallback by category
  if (categoryFilter && categoryFilter !== 'all') {
    if (categoryFilter === 'budget') {
      demoFallback = demoFallback.filter((p) => p.priceLevel === 'budget');
    } else {
      demoFallback = demoFallback.filter((p) => p.foodCategory === categoryFilter);
    }
  }

  // Filter demo fallback by open now
  if (isOpenNowFilter) {
    demoFallback = demoFallback.filter((p) => p.isOpenNow === true);
  }

  demoFallback.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

  return {
    success: true,
    isLive: false,
    source: 'demo',
    sourceName: 'Demo data',
    origin: { lat: userLat, lon: userLon },
    radiusMeters: searchRadius,
    total: demoFallback.length,
    places: demoFallback
  };
}
