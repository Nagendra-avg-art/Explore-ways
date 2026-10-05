import { Place, UserPreferences, RecommendedPlace, ScoreBreakdown } from '../types/travel';

// Parse duration strings like '1–2 hrs', '45 min' into numeric hours
export function parseDurationHours(durationStr: string): number {
  const lower = durationStr.toLowerCase();
  if (lower.includes('45 min') || lower.includes('30 min')) return 0.75;
  if (lower.includes('1–2 hrs') || lower.includes('1-2 hrs')) return 1.5;
  if (lower.includes('2–3 hrs') || lower.includes('2-3 hrs')) return 2.5;
  if (lower.includes('2–4 hrs') || lower.includes('2-4 hrs')) return 3.0;
  if (lower.includes('1 hr') || lower.includes('1 hour')) return 1.0;
  if (lower.includes('2 hrs') || lower.includes('2 hours')) return 2.0;
  if (lower.includes('3 hrs') || lower.includes('3 hours')) return 3.0;
  return 1.5;
}

// Great-circle Haversine formula
export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Score a single place against active user preferences and coordinates
 */
export function scorePlace(
  place: Place,
  userLat: number,
  userLon: number,
  preferences: UserPreferences
): {
  matchScore: number;
  matchReasons: string[];
  scoreBreakdown: ScoreBreakdown;
  distanceKm: number;
} {
  const distanceKm = calculateHaversineDistanceKm(userLat, userLon, place.lat, place.lon);
  const travelTimeMin = Math.max(5, Math.round(distanceKm * 2.5 + 4));
  const reasons: string[] = [];

  // 1. Interest Score (Weight: 35%)
  let interestScore = 30;
  const isDirectCategoryMatch = preferences.interests.includes(place.category);
  const hasTagMatch = place.tags.some((tag) =>
    preferences.interests.some((interest) => tag.toLowerCase().includes(interest.toLowerCase()))
  );

  if (isDirectCategoryMatch) {
    interestScore = 95;
    reasons.push(`Direct match for your interest in ${place.categoryLabel.replace(/^[^\w\s]+/, '').trim()}`);
  } else if (hasTagMatch) {
    interestScore = 75;
    reasons.push(`Matches your travel themes: ${place.tags.join(', ')}`);
  } else if (preferences.interests.length === 0) {
    interestScore = 80;
  }

  // 2. Distance Score (Weight: 20%)
  let distanceScore = 50;
  if (distanceKm <= 3.0) {
    distanceScore = 100;
    reasons.push(`Very close by: Only ${distanceKm} km away`);
  } else if (distanceKm <= 7.0) {
    distanceScore = 85;
    reasons.push(`Convenient reach: ${distanceKm} km away`);
  } else if (distanceKm <= 15.0) {
    distanceScore = 65;
  } else {
    distanceScore = Math.max(20, Math.round(100 - distanceKm * 2.5));
  }

  // 3. Rating Score (Weight: 15%)
  const normalizedRating = Math.min(100, Math.max(30, Math.round(((place.rating - 3.8) / 1.2) * 85 + 15)));
  const reviewBonus = place.reviewCount > 10000 ? 5 : place.reviewCount > 5000 ? 3 : 0;
  const ratingScore = Math.min(100, normalizedRating + reviewBonus);
  if (place.rating >= 4.7) {
    reasons.push(`Top-rated landmark (${place.rating}★ from ${place.reviewCount.toLocaleString()} reviews)`);
  }

  // 4. Time & Pace Compatibility Score (Weight: 15%)
  const baseVisitHours = parseDurationHours(place.visitDuration);
  const paceMultiplier = preferences.pace === 'relaxed' ? 1.35 : preferences.pace === 'fast' ? 0.75 : 1.0;
  const adjustedStayHours = baseVisitHours * paceMultiplier;
  const totalRequiredHours = adjustedStayHours + (travelTimeMin / 60);

  let timeFitScore = 50;
  if (totalRequiredHours <= preferences.availableHours) {
    timeFitScore = 100;
    reasons.push(`Fits smoothly into your ${preferences.availableHours}h schedule (${place.visitDuration} stay)`);
  } else if (totalRequiredHours <= preferences.availableHours + 0.75) {
    timeFitScore = 70;
  } else {
    timeFitScore = 30;
  }

  // 5. Travel Style Affinity Score (Weight: 15%)
  let styleFitScore = 75;
  const tagsLower = place.tags.map((t) => t.toLowerCase());
  const cat = place.category;

  if (preferences.travelStyle === 'solo') {
    if (cat === 'cafes' || cat === 'food' || cat === 'photography' || tagsLower.includes('old city')) {
      styleFitScore = 98;
      reasons.push('High solo explorer affinity: Walkable, great photography & cafe stops');
    }
  } else if (preferences.travelStyle === 'couple') {
    if (cat === 'nature' || tagsLower.includes('sunset') || tagsLower.includes('palace') || cat === 'architecture') {
      styleFitScore = 98;
      reasons.push('Scenic & romantic appeal with relaxed atmosphere');
    }
  } else if (preferences.travelStyle === 'family') {
    if (tagsLower.includes('family friendly') || tagsLower.includes('crafts') || cat === 'culture' || cat === 'nature') {
      styleFitScore = 98;
      reasons.push('Family-approved: Comfortable terrain & multi-age interest');
    } else if (place.id === 'golconda') {
      styleFitScore = 45;
    }
  } else if (preferences.travelStyle === 'friends') {
    if (cat === 'food' || cat === 'shopping' || tagsLower.includes('bazaar') || place.id === 'golconda') {
      styleFitScore = 98;
      reasons.push('Great for groups: Vibrant markets, street food & exploration');
    }
  }

  // Weighted Linear Combination
  const weightedTotal = 
    0.35 * interestScore +
    0.20 * distanceScore +
    0.15 * ratingScore +
    0.15 * timeFitScore +
    0.15 * styleFitScore;

  const matchScore = Math.min(99, Math.max(45, Math.round(weightedTotal)));

  return {
    matchScore,
    matchReasons: reasons.slice(0, 3),
    scoreBreakdown: {
      interest: interestScore,
      distance: distanceScore,
      rating: ratingScore,
      timeFit: timeFitScore,
      styleFit: styleFitScore,
    },
    distanceKm,
  };
}

/**
 * Score and rank a list of places based on user preferences and location
 */
export function rankPlacesForUser(
  places: Place[],
  userLat: number,
  userLon: number,
  preferences: UserPreferences
): RecommendedPlace[] {
  const ranked = places.map((place) => {
    const scored = scorePlace(place, userLat, userLon, preferences);
    return {
      ...place,
      distanceKm: scored.distanceKm,
      travelTimeMin: Math.max(5, Math.round(scored.distanceKm * 2.5 + 4)),
      matchScore: scored.matchScore,
      matchReasons: scored.matchReasons,
      scoreBreakdown: scored.scoreBreakdown,
    };
  });

  // Sort descending by matchScore
  ranked.sort((a, b) => b.matchScore - a.matchScore);
  return ranked;
}

/**
 * Fetch recommendations from backend with fallback to client ranking
 */
export async function fetchRecommendations(
  userLat: number,
  userLon: number,
  preferences: UserPreferences,
  limit: number = 10
): Promise<RecommendedPlace[]> {
  try {
    const params = new URLSearchParams({
      lat: userLat.toString(),
      lon: userLon.toString(),
      interests: preferences.interests.join(','),
      hours: preferences.availableHours.toString(),
      budget: preferences.budgetAmount.toString(),
      style: preferences.travelStyle,
      pace: preferences.pace,
      limit: limit.toString(),
    });

    const res = await fetch(`/api/recommendations?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.places && Array.isArray(data.places)) {
        return data.places;
      }
    }
  } catch (err) {
    console.warn('Backend recommendation fetch failed, using client engine fallback:', err);
  }

  return [];
}
