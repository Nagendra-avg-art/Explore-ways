// server/src/services/placesService.ts
// Service handling attraction discovery, OpenStreetMap Nominatim integration, and caching

import { BackendPlace } from '../types/places.js';
import { PLACES_DATA } from '../data/demo/demoPlaces.js';
import { calculateHaversineDistanceKm, checkIsOpenNow } from '../utils/geoUtils.js';

export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  temples: 'https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?auto=format&fit=crop&w=800&q=80',
  history: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
  nature: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
  food: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
  architecture: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=800&q=80',
  cafes: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
  shopping: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  photography: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  culture: 'https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=800&q=80',
};

export function classifyNominatimPoi(
  type: string,
  category: string,
  displayName: string
): { category: string; categoryLabel: string } {
  const t = (type || '').toLowerCase();
  const c = (category || '').toLowerCase();
  const name = (displayName || '').toLowerCase();

  if (
    t.includes('temple') || t.includes('place_of_worship') || t.includes('shrine') ||
    t.includes('mosque') || t.includes('church') ||
    c.includes('religion') || c.includes('worship') ||
    name.includes('temple') || name.includes('mandir') || name.includes('shrine') ||
    name.includes('dargah') || name.includes('masjid') || name.includes('church')
  ) {
    return { category: 'temples', categoryLabel: '🛕 Temple / Shrine' };
  }

  if (
    t.includes('monument') || t.includes('memorial') || t.includes('fort') ||
    t.includes('castle') || t.includes('ruins') || t.includes('archaeological') ||
    c.includes('historic') ||
    name.includes('fort') || name.includes('monument') || name.includes('tomb') ||
    name.includes('charminar') || name.includes('palace') || name.includes('mahal')
  ) {
    return { category: 'history', categoryLabel: '🏛️ Historic Landmark' };
  }

  if (
    t.includes('park') || t.includes('garden') || t.includes('water') ||
    t.includes('lake') || t.includes('nature_reserve') || t.includes('zoo') ||
    c.includes('leisure') || c.includes('natural') ||
    name.includes('park') || name.includes('garden') || name.includes('lake') ||
    name.includes('cheruvu') || name.includes('sagar') || name.includes('sanctuary')
  ) {
    return { category: 'nature', categoryLabel: '🌊 Nature & Park' };
  }

  if (
    t.includes('museum') || t.includes('arts_centre') || t.includes('gallery') ||
    t.includes('theatre') ||
    name.includes('museum') || name.includes('gallery') || name.includes('art') ||
    name.includes('cultural') || name.includes('planetarium')
  ) {
    return { category: 'culture', categoryLabel: '🎭 Culture & Museum' };
  }

  if (
    t.includes('viewpoint') || t.includes('cliff') || t.includes('peak') ||
    t.includes('bridge') ||
    name.includes('viewpoint') || name.includes('sunset') || name.includes('sunrise') ||
    name.includes('hill') || name.includes('gopuram') || name.includes('promenade')
  ) {
    return { category: 'photography', categoryLabel: '📸 Scenic Viewpoint' };
  }

  if (
    t.includes('mall') || t.includes('market') || t.includes('bazaar') ||
    t.includes('marketplace') ||
    name.includes('bazaar') || name.includes('market') || name.includes('mall') ||
    name.includes('shopping')
  ) {
    return { category: 'shopping', categoryLabel: '🛍️ Traditional Market' };
  }

  if (
    t.includes('restaurant') || t.includes('fast_food') || t.includes('food_court') ||
    name.includes('hotel') || name.includes('biryani') || name.includes('kitchen') ||
    name.includes('restaurant') || name.includes('bhojanalay')
  ) {
    return { category: 'food', categoryLabel: '🍴 Local Food' };
  }

  if (
    t.includes('cafe') ||
    name.includes('cafe') || name.includes('chai') || name.includes('coffee') ||
    name.includes('tea') || name.includes('bakery')
  ) {
    return { category: 'cafes', categoryLabel: '☕ Cafe & Tea Spot' };
  }

  return { category: 'culture', categoryLabel: '🏛️ Cultural Place' };
}

const nearbyPoiCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Discovers nearby attractions using OpenStreetMap Nominatim with local fallback
 */
export async function discoverNearbyPlaces(
  userLat: number,
  userLon: number,
  radiusMeters: number = 6000,
  categoryFilter?: string
) {
  const searchRadius = Math.min(25000, Math.max(1000, radiusMeters));
  const category = categoryFilter || 'all';
  const cacheKey = `${userLat.toFixed(3)}_${userLon.toFixed(3)}_${searchRadius}_${category}`;

  const cached = nearbyPoiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const livePlaces: BackendPlace[] = [];
  const seenNames = new Set<string>();

  // TIER 1: OpenStreetMap Nominatim
  try {
    const delta = Math.min(0.18, (searchRadius / 1000) * 0.012);
    const viewbox = `${userLon - delta},${userLat + delta},${userLon + delta},${userLat - delta}`;

    let searchTerm = 'attraction';
    if (category === 'temples') searchTerm = 'temple';
    else if (category === 'history') searchTerm = 'monument';
    else if (category === 'nature') searchTerm = 'park';
    else if (category === 'food') searchTerm = 'restaurant';
    else if (category === 'cafes') searchTerm = 'cafe';
    else if (category === 'shopping') searchTerm = 'market';
    else if (category === 'culture') searchTerm = 'museum';
    else if (category === 'architecture') searchTerm = 'palace';
    else if (category === 'photography') searchTerm = 'viewpoint';

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchTerm)}&bounded=1&viewbox=${viewbox}&limit=25`;
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
      const nomItems = (await nomRes.json()) as any[];
      if (Array.isArray(nomItems) && nomItems.length > 0) {
        for (const p of nomItems) {
          const rawName = p.name || p.display_name.split(',')[0];
          if (!rawName || rawName.trim().length < 2) continue;
          let name = rawName.trim();
          const pLat = parseFloat(p.lat);
          const pLon = parseFloat(p.lon);
          if (isNaN(pLat) || isNaN(pLon)) continue;

          const addressParts = p.display_name.split(',');
          const address = addressParts.slice(1, 3).map((s: string) => s.trim()).filter(Boolean).join(', ') || undefined;

          if (name.length <= 8 && addressParts[1]) {
            name = `${name} (${addressParts[1].trim()})`;
          }

          const normKey = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${pLat.toFixed(3)}_${pLon.toFixed(3)}`;
          if (seenNames.has(normKey)) continue;
          seenNames.add(normKey);

          const classification = classifyNominatimPoi(p.type, p.category, name);
          if (category !== 'all' && classification.category !== category) {
            continue;
          }

          const distanceKm = calculateHaversineDistanceKm(userLat, userLon, pLat, pLon);
          const travelTimeMin = Math.max(3, Math.round(distanceKm * 2.5 + 3));
          const imageUrl = CATEGORY_IMAGE_MAP[classification.category] || CATEGORY_IMAGE_MAP.culture;

          livePlaces.push({
            id: `osm-${p.place_id || p.osm_id}`,
            name,
            category: classification.category,
            categoryLabel: classification.categoryLabel,
            lat: pLat,
            lon: pLon,
            distanceKm,
            travelTimeMin,
            visitDuration: classification.category === 'history' || classification.category === 'architecture' ? '1–2 hrs' : '45–60 min',
            imageUrl,
            shortDescription: `Authentic ${classification.categoryLabel.replace(/^[^\w\s]+/, '').trim()}${address ? ` in ${address}` : ''}, discovered via OpenStreetMap live coordinates.`,
            fullDescription: p.display_name,
            whyRecommended: `Real-time discovery: ${distanceKm} km from your current GPS position.`,
            tags: [classification.categoryLabel.replace(/^[^\w\s]+/, '').trim(), 'Live POI', ...(address ? [address] : [])],
            source: 'live',
            sourceName: 'OpenStreetMap Live POI',
            address,
            rating: undefined,
            reviewCount: undefined,
            openingHours: undefined,
            isOpenNow: undefined,
            entryFee: undefined
          });
        }
      }
    }
  } catch (nomErr: any) {
    console.warn('[Nearby API] Nominatim POI search skipped or timed out:', nomErr?.message);
  }

  // If live places found >= 3, return them
  if (livePlaces.length >= 3) {
    livePlaces.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    const resultData = {
      success: true,
      isLive: true,
      source: 'osm-live',
      sourceName: 'OpenStreetMap Live POI',
      origin: { lat: userLat, lon: userLon },
      total: livePlaces.length,
      places: livePlaces
    };
    nearbyPoiCache.set(cacheKey, { timestamp: Date.now(), data: resultData });
    return resultData;
  }

  // Graceful fallback: Curated Seed Dataset with re-calculated distances
  let fallbackPlaces = PLACES_DATA.map((p) => {
    const distanceKm = calculateHaversineDistanceKm(userLat, userLon, p.lat, p.lon);
    const isOpen = checkIsOpenNow(p);
    return {
      ...p,
      distanceKm,
      travelTimeMin: Math.max(5, Math.round(distanceKm * 2.5 + 4)),
      isOpenNow: isOpen,
      source: 'demo' as const,
      sourceName: 'Curated Seed Data (Demo Fallback)',
    };
  });

  if (category !== 'all') {
    fallbackPlaces = fallbackPlaces.filter((p) => p.category === category);
  }

  fallbackPlaces.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    success: true,
    isLive: false,
    source: 'demo-fallback',
    sourceName: 'Curated Seed Data (Demo Fallback)',
    origin: { lat: userLat, lon: userLon },
    total: fallbackPlaces.length,
    places: fallbackPlaces
  };
}
