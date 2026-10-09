import { FoodPlace, FoodCategory, FoodPriceLevel } from '../types/travel';
import { getApiUrl } from './apiConfig';

export interface FoodApiResponse {
  success: boolean;
  isLive: boolean;
  source: string;
  sourceName: string;
  origin: { lat: number; lon: number };
  radiusMeters: number;
  total: number;
  places: any[];
}

/**
 * Normalizes raw API response into strongly typed FoodPlace objects
 */
export function normalizeFoodPlace(raw: any): FoodPlace {
  let priceLevel: FoodPriceLevel = 'unavailable';
  let priceLevelDisplay = 'Price not available';

  if (raw.priceLevel === 'budget') {
    priceLevel = 'budget';
    priceLevelDisplay = 'Budget Friendly';
  } else if (raw.priceLevel === 'moderate') {
    priceLevel = 'moderate';
    priceLevelDisplay = 'Moderate';
  } else if (raw.priceLevel === 'expensive') {
    priceLevel = 'expensive';
    priceLevelDisplay = 'Expensive';
  }

  const openingHoursDisplay = raw.openingHours || raw.openingHoursDisplay || 'Hours unavailable';

  let foodCategory: FoodCategory = raw.foodCategory || 'restaurant';
  let foodCategoryLabel = raw.foodCategoryLabel || 'Restaurant';

  if (raw.category === 'cafes' || raw.foodCategory === 'cafe') {
    foodCategory = 'cafe';
    foodCategoryLabel = 'Cafe';
  }

  return {
    id: raw.id,
    name: raw.name,
    category: raw.category || 'food',
    categoryLabel: raw.categoryLabel || '🍴 Dining',
    foodCategory,
    foodCategoryLabel,
    cuisine: raw.cuisine || undefined,
    rating: raw.rating !== undefined && raw.rating !== null ? Number(raw.rating) : undefined,
    reviewCount: raw.reviewCount,
    distanceKm: Number((raw.distanceKm || 0).toFixed(1)),
    travelTimeMin: raw.travelTimeMin || Math.max(3, Math.round((raw.distanceKm || 0) * 2.5 + 3)),
    visitDuration: raw.visitDuration || (foodCategory === 'cafe' ? '30–45 min' : '45–60 min'),
    lat: raw.lat,
    lon: raw.lon,
    imageUrl: raw.imageUrl || '',
    shortDescription: raw.shortDescription || `Authentic ${foodCategoryLabel} dining.`,
    fullDescription: raw.fullDescription,
    whyRecommended: raw.whyRecommended || `Discovered ${raw.distanceKm ? `${raw.distanceKm.toFixed(1)} km away` : 'nearby'}.`,
    recommendationReason: raw.recommendationReason || `Good match: Located nearby.`,
    tags: raw.tags || [foodCategoryLabel],
    openingHours: raw.openingHours,
    openingHoursDisplay,
    isOpenNow: raw.isOpenNow,
    entryFee: raw.entryFee,
    priceLevel,
    priceLevelDisplay,
    phone: raw.phone,
    website: raw.website,
    takeaway: raw.takeaway,
    delivery: raw.delivery,
    vegetarian: raw.vegetarian,
    address: raw.address,
    source: raw.source || 'demo',
    sourceName: raw.sourceName || (raw.source === 'live' ? 'Live nearby dining' : 'Curated dining')
  };
}

/**
 * Fetch nearby food places from backend POI service
 */
export async function fetchFoodPlaces(
  lat: number,
  lon: number,
  radius: number = 5000,
  category: string = 'all',
  openNow: boolean = false,
  signal?: AbortSignal
): Promise<{
  places: FoodPlace[];
  isLive: boolean;
  sourceLabel: string;
  total: number;
}> {
  try {
    const url = getApiUrl(`/api/places/food?lat=${lat}&lon=${lon}&radius=${radius}&category=${category}&openNow=${openNow}`);
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to load food places`);
    }

    const data: FoodApiResponse = await res.json();
    if (data.success && Array.isArray(data.places)) {
      const normalized = data.places.map(normalizeFoodPlace);
      return {
        places: normalized,
        isLive: data.isLive === true,
        sourceLabel: data.sourceName || (data.isLive ? 'Live nearby dining' : 'Curated dining'),
        total: normalized.length
      };
    }

    throw new Error('Malformed API response format');
  } catch (error: any) {
    console.warn('[FoodExplorer] API fetch failed:', error.message);
    throw error;
  }
}
