// server/src/services/categoryService.ts
// Centralized Category Mapping and Normalization Service
// Prevents obvious misclassifications and provides consistent taxonomy

export interface NormalizedCategory {
  category: string;
  categoryLabel: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const CANONICAL_CATEGORIES = [
  'temples',
  'history',
  'nature',
  'culture',
  'food',
  'cafes',
  'shopping',
  'photography',
  'architecture',
] as const;

export type CanonicalCategory = typeof CANONICAL_CATEGORIES[number];

/**
 * Normalizes provider types and names into canonical application categories.
 * Strict rules prevent cross-category contamination (e.g., dining mapped to temple).
 */
export function normalizePlaceCategory(
  rawType?: string,
  rawCategory?: string,
  displayName?: string
): NormalizedCategory {
  const type = (rawType || '').toLowerCase().trim();
  const cat = (rawCategory || '').toLowerCase().trim();
  const name = (displayName || '').toLowerCase().trim();

  // 1. DINING / RESTAURANT (Rule out first to prevent restaurants with names like "Temple View Hotel" becoming temples)
  if (
    type === 'restaurant' || type === 'fast_food' || type === 'food_court' ||
    cat === 'restaurant' || cat === 'fast_food' ||
    name.includes('restaurant') || name.includes('bhojanalay') || name.includes('dhaba') ||
    name.includes('kitchen') || name.includes('tiffin') || name.includes('biryani')
  ) {
    return {
      category: 'food',
      categoryLabel: '🍴 Local Food & Dining',
      confidence: 'HIGH',
    };
  }

  // 2. CAFES & TEA STALLS
  if (
    type === 'cafe' || cat === 'cafe' ||
    name.includes('cafe') || name.includes('coffee') || name.includes('chai') ||
    name.includes('tea stall') || name.includes('bakery')
  ) {
    return {
      category: 'cafes',
      categoryLabel: '☕ Cafe & Tea Spot',
      confidence: 'HIGH',
    };
  }

  // 3. TEMPLES & PLACES OF WORSHIP
  if (
    type === 'place_of_worship' || type === 'temple' || type === 'shrine' ||
    type === 'mosque' || type === 'church' || cat === 'religion' ||
    name.includes('temple') || name.includes('mandir') || name.includes('shrine') ||
    name.includes('dargah') || name.includes('masjid') || name.includes('church') ||
    name.includes('kovil') || name.includes('gurdwara')
  ) {
    return {
      category: 'temples',
      categoryLabel: '🛕 Temple / Sacred Site',
      confidence: 'HIGH',
    };
  }

  // 4. ARCHITECTURAL WONDERS & PALACES
  if (
    type === 'architecture' || cat === 'architecture' ||
    type === 'palace' || type === 'castle' || type === 'tower' || type === 'arch' ||
    name.includes('palace') || name.includes('mahal') || name.includes('arch') ||
    name.includes('tower') || name.includes('minar') || name.includes('bhavan')
  ) {
    return {
      category: 'architecture',
      categoryLabel: '🏛️ Iconic Architecture',
      confidence: 'HIGH',
    };
  }

  // 5. HISTORIC MONUMENTS & FORTS
  if (
    type === 'monument' || type === 'memorial' || type === 'fort' ||
    type === 'archaeological_site' || type === 'ruins' ||
    cat === 'historic' ||
    name.includes('fort') || name.includes('monument') || name.includes('tomb') ||
    name.includes('bastion')
  ) {
    return {
      category: 'history',
      categoryLabel: '🏛️ Historic Landmark',
      confidence: 'HIGH',
    };
  }

  // 5. PARKS & NATURE RESERVES
  if (
    type === 'park' || type === 'garden' || type === 'nature_reserve' ||
    type === 'zoo' || type === 'waterfall' || type === 'beach' ||
    cat === 'leisure' || cat === 'natural' ||
    name.includes('park') || name.includes('garden') || name.includes('lake') ||
    name.includes('cheruvu') || name.includes('sagar') || name.includes('falls') ||
    name.includes('sanctuary') || name.includes('forest')
  ) {
    return {
      category: 'nature',
      categoryLabel: '🌊 Nature & Scenic Park',
      confidence: 'HIGH',
    };
  }

  // 6. MUSEUMS & CULTURE
  if (
    type === 'museum' || type === 'arts_centre' || type === 'gallery' ||
    type === 'theatre' || type === 'planetarium' ||
    name.includes('museum') || name.includes('gallery') || name.includes('planetarium') ||
    name.includes('cultural centre') || name.includes('heritage centre')
  ) {
    return {
      category: 'culture',
      categoryLabel: '🎭 Culture & Museum',
      confidence: 'HIGH',
    };
  }

  // 7. SCENIC VIEWPOINTS & BRIDGES
  if (
    type === 'viewpoint' || type === 'cliff' || type === 'peak' ||
    type === 'bridge' ||
    name.includes('viewpoint') || name.includes('sunset') || name.includes('sunrise') ||
    name.includes('ghat') || name.includes('bridge') || name.includes('hill')
  ) {
    return {
      category: 'photography',
      categoryLabel: '📸 Scenic Viewpoint & Ghat',
      confidence: 'MEDIUM',
    };
  }

  // 8. MARKETS & SHOPPING
  if (
    type === 'marketplace' || type === 'mall' || type === 'bazaar' ||
    cat === 'shop' ||
    name.includes('bazaar') || name.includes('market') || name.includes('mall') ||
    name.includes('shopping') || name.includes('chowk')
  ) {
    return {
      category: 'shopping',
      categoryLabel: '🛍️ Traditional Market & Bazaar',
      confidence: 'HIGH',
    };
  }

  // Default neutral category
  return {
    category: 'culture',
    categoryLabel: '🏛️ Local Attraction',
    confidence: 'LOW',
  };
}
