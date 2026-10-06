import { FoodPlace, UserPreferences } from '../types/travel';
import { calculateHaversineDistanceKm } from './recommendationEngine';

export interface FoodScoreResult {
  matchScore: number;
  matchReasons: string[];
  recommendationReason: string;
  distanceKm: number;
}

/**
 * Scores a food place against user location and preferences.
 * Food Score = Cuisine/Preference Fit + Distance + Open Status + Rating + Budget Fit
 */
export function scoreFoodPlace(
  food: FoodPlace,
  userLat: number,
  userLon: number,
  preferences: UserPreferences
): FoodScoreResult {
  const distanceKm = calculateHaversineDistanceKm(userLat, userLon, food.lat, food.lon);
  const reasons: string[] = [];

  // 1. Cuisine & Preference Fit (Weight: 30 points)
  let cuisineScore = 20;
  const userInterests = preferences.interests.map((i) => i.toLowerCase());
  const hasFoodInterest = userInterests.includes('food') || userInterests.includes('all');
  const hasCafeInterest = userInterests.includes('cafes') && food.foodCategory === 'cafe';

  if (hasCafeInterest) {
    cuisineScore = 30;
    reasons.push('Matches your interest in cafes and tea culture');
  } else if (hasFoodInterest) {
    cuisineScore = 28;
    reasons.push(`Matches your interest in culinary exploration`);
  } else {
    cuisineScore = 18;
  }

  if (food.vegetarian) {
    cuisineScore = Math.min(30, cuisineScore + 2);
  }

  // 2. Distance Fit (Weight: 30 points)
  let distanceScore = 15;
  if (distanceKm <= 1.0) {
    distanceScore = 30;
    reasons.push(`Walking distance: Only ${distanceKm.toFixed(1)} km away`);
  } else if (distanceKm <= 2.5) {
    distanceScore = 26;
    reasons.push(`Nearby: ${distanceKm.toFixed(1)} km from your current spot`);
  } else if (distanceKm <= 5.0) {
    distanceScore = 20;
    reasons.push(`${distanceKm.toFixed(1)} km from your location`);
  } else {
    distanceScore = Math.max(8, Math.round(20 - (distanceKm - 5) * 1.5));
  }

  // 3. Open Status (Weight: 20 points)
  let openScore = 12; // neutral for unknown
  if (food.isOpenNow === true) {
    openScore = 20;
    reasons.push('Verified open right now');
  } else if (food.isOpenNow === false) {
    openScore = 4;
  } else {
    // Hours unavailable
    openScore = 12;
  }

  // 4. Budget Fit (Weight: 10 points)
  let budgetScore = 7;
  if (food.priceLevel === 'budget') {
    budgetScore = 10;
    reasons.push('Budget-friendly dining');
  } else if (food.priceLevel === 'moderate') {
    budgetScore = preferences.budgetAmount >= 1000 ? 9 : 6;
  } else if (food.priceLevel === 'expensive') {
    budgetScore = preferences.budgetAmount >= 2000 ? 8 : 4;
  } else {
    // Price not available
    budgetScore = 7;
  }

  // 5. Rating Fit (Weight: 10 points)
  let ratingScore = 7;
  if (food.rating !== undefined && food.rating > 0) {
    ratingScore = Math.round((food.rating / 5) * 10);
    if (food.rating >= 4.5) {
      reasons.push(`Top-rated: ⭐ ${food.rating.toFixed(1)}`);
    }
  } else {
    // Rating unavailable (neutral)
    ratingScore = 7;
  }

  const matchScore = Math.min(100, cuisineScore + distanceScore + openScore + budgetScore + ratingScore);

  // Build crisp, explainable recommendation reason
  let recommendationReason = '';
  if (food.isOpenNow === true && distanceKm <= 2.0 && food.priceLevel === 'budget') {
    recommendationReason = `Good match because it is open now, within ${distanceKm.toFixed(1)} km, and fits your budget.`;
  } else if (food.isOpenNow === true && distanceKm <= 2.0) {
    recommendationReason = `Good match because it is open now and within ${distanceKm.toFixed(1)} km.`;
  } else if (food.rating && food.rating >= 4.5 && distanceKm <= 3.0) {
    recommendationReason = `Good match: Highly rated (⭐ ${food.rating.toFixed(1)}) and within ${distanceKm.toFixed(1)} km of your location.`;
  } else if (food.vegetarian) {
    recommendationReason = `Good match: Authentic vegetarian dining within ${distanceKm.toFixed(1)} km.`;
  } else if (food.priceLevel === 'budget') {
    recommendationReason = `Good match: Budget-friendly dining within ${distanceKm.toFixed(1)} km.`;
  } else {
    recommendationReason = `Good match: Located ${distanceKm.toFixed(1)} km from your current reference point.`;
  }

  return {
    matchScore,
    matchReasons: reasons,
    recommendationReason,
    distanceKm
  };
}
