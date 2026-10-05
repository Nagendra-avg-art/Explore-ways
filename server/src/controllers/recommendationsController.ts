import { Request, Response } from 'express';
import { 
  PLACES_DATA, 
  BackendPlace, 
  calculateHaversineDistanceKm, 
  checkIsOpenNow 
} from './placesController.js';

export interface ScoreBreakdown {
  interest: number;
  distance: number;
  rating: number;
  timeFit: number;
  styleFit: number;
}

export interface RecommendedPlaceResponse {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  rating: number;
  reviewCount: number;
  lat: number;
  lon: number;
  distanceKm: number;
  travelTimeMin: number;
  visitDuration: string;
  imageUrl: string;
  shortDescription: string;
  fullDescription: string;
  whyRecommended: string;
  tags: string[];
  openingHours: string;
  isOpenNow: boolean;
  entryFee: string;
  nearbyFood: string[];
  transportEstimates: { mode: string; label: string; time: string; cost: string; icon: string }[];
  matchScore: number;
  matchReasons: string[];
  scoreBreakdown: ScoreBreakdown;
}

// Helper to convert human duration strings like '1–2 hrs' to numeric hours
function parseDurationHours(durationStr: string): number {
  const lower = durationStr.toLowerCase();
  if (lower.includes('45 min') || lower.includes('30 min')) return 0.75;
  if (lower.includes('1–2 hrs') || lower.includes('1-2 hrs')) return 1.5;
  if (lower.includes('2–3 hrs') || lower.includes('2-3 hrs')) return 2.5;
  if (lower.includes('2–4 hrs') || lower.includes('2-4 hrs')) return 3.0;
  if (lower.includes('1 hr') || lower.includes('1 hour')) return 1.0;
  if (lower.includes('2 hrs') || lower.includes('2 hours')) return 2.0;
  if (lower.includes('3 hrs') || lower.includes('3 hours')) return 3.0;
  return 1.5; // fallback
}

/**
 * Multi-Factor Scoring Engine for Recommendations
 */
export function scorePlaceForUser(
  place: BackendPlace,
  userLat: number,
  userLon: number,
  interests: string[],
  availableHours: number,
  travelStyle: string,
  pace: string
): {
  matchScore: number;
  matchReasons: string[];
  scoreBreakdown: ScoreBreakdown;
  distanceKm: number;
  travelTimeMin: number;
  isOpenNow: boolean;
} {
  const distanceKm = calculateHaversineDistanceKm(userLat, userLon, place.lat, place.lon);
  const travelTimeMin = Math.max(5, Math.round(distanceKm * 2.5 + 4));
  const isOpenNow = checkIsOpenNow(place);
  const reasons: string[] = [];

  // 1. Interest Score (Weight: 35%)
  let interestScore = 30;
  const isDirectCategoryMatch = interests.includes(place.category);
  const hasTagMatch = place.tags.some((tag) => 
    interests.some((interest) => tag.toLowerCase().includes(interest.toLowerCase()))
  );

  if (isDirectCategoryMatch) {
    interestScore = 95;
    reasons.push(`Direct match for your interest in ${place.categoryLabel.replace(/^[^\w\s]+/, '').trim()}`);
  } else if (hasTagMatch) {
    interestScore = 75;
    reasons.push(`Matches your themes: ${place.tags.join(', ')}`);
  } else if (interests.length === 0) {
    interestScore = 80; // No filter specified, neutral high
  }

  // 2. Distance Score (Weight: 20%)
  let distanceScore = 50;
  if (distanceKm <= 3.0) {
    distanceScore = 100;
    reasons.push(`Very close by: Only ${distanceKm} km away`);
  } else if (distanceKm <= 7.0) {
    distanceScore = 85;
    reasons.push(`Quick reach: ${distanceKm} km from you`);
  } else if (distanceKm <= 15.0) {
    distanceScore = 65;
  } else {
    distanceScore = Math.max(20, Math.round(100 - distanceKm * 2.5));
  }

  // 3. Rating & Quality Score (Weight: 15%)
  // Normalized 4.0 to 5.0 -> 30 to 100
  const normalizedRating = Math.min(100, Math.max(30, Math.round(((place.rating - 3.8) / 1.2) * 85 + 15)));
  const reviewBonus = place.reviewCount > 10000 ? 5 : place.reviewCount > 5000 ? 3 : 0;
  const ratingScore = Math.min(100, normalizedRating + reviewBonus);
  if (place.rating >= 4.7) {
    reasons.push(`Top-rated landmark (${place.rating}★ from ${place.reviewCount.toLocaleString()} reviews)`);
  }

  // 4. Time & Pace Compatibility Score (Weight: 15%)
  const baseVisitHours = parseDurationHours(place.visitDuration);
  const paceMultiplier = pace === 'relaxed' ? 1.35 : pace === 'fast' ? 0.75 : 1.0;
  const adjustedStayHours = baseVisitHours * paceMultiplier;
  const totalRequiredHours = adjustedStayHours + (travelTimeMin / 60);

  let timeFitScore = 50;
  if (totalRequiredHours <= availableHours) {
    timeFitScore = 100;
    reasons.push(`Fits smoothly into your ${availableHours}h window (${place.visitDuration} stay)`);
  } else if (totalRequiredHours <= availableHours + 0.75) {
    timeFitScore = 70;
  } else {
    timeFitScore = 30; // Schedule too tight
  }

  // 5. Travel Style Affinity Score (Weight: 15%)
  let styleFitScore = 75;
  const tagsLower = place.tags.map((t) => t.toLowerCase());
  const cat = place.category;

  if (travelStyle === 'solo') {
    if (cat === 'cafes' || cat === 'food' || cat === 'photography' || tagsLower.includes('old city')) {
      styleFitScore = 98;
      reasons.push('High solo traveler affinity: Walkable, great photography & cafe stops');
    }
  } else if (travelStyle === 'couple') {
    if (cat === 'nature' || tagsLower.includes('sunset') || tagsLower.includes('palace') || cat === 'architecture') {
      styleFitScore = 98;
      reasons.push('Scenic & romantic appeal with relaxed atmosphere');
    }
  } else if (travelStyle === 'family') {
    if (tagsLower.includes('family friendly') || tagsLower.includes('crafts') || cat === 'culture' || cat === 'nature') {
      styleFitScore = 98;
      reasons.push('Family-approved: Comfortable terrain & multi-age interest');
    } else if (place.id === 'golconda') {
      // Steep climbs can be taxing for elders/toddlers
      styleFitScore = 45;
    }
  } else if (travelStyle === 'friends') {
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
    matchReasons: reasons.slice(0, 3), // Top 3 reasons
    scoreBreakdown: {
      interest: interestScore,
      distance: distanceScore,
      rating: ratingScore,
      timeFit: timeFitScore,
      styleFit: styleFitScore
    },
    distanceKm,
    travelTimeMin,
    isOpenNow
  };
}

/**
 * GET /api/recommendations
 * Query: lat, lon, interests, hours, budget, style, pace, limit
 */
export const getRecommendations = async (req: Request, res: Response) => {
  const { 
    lat, 
    lon, 
    interests: interestsQuery, 
    hours, 
    budget, 
    style, 
    pace,
    limit 
  } = req.query;

  const userLat = lat ? parseFloat(lat as string) : 17.3616;
  const userLon = lon ? parseFloat(lon as string) : 78.4747;
  
  const interests = interestsQuery 
    ? (interestsQuery as string).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : ['history', 'food', 'temples'];

  const availableHours = hours ? parseFloat(hours as string) : 4;
  const budgetAmount = budget ? parseFloat(budget as string) : 1000;
  const travelStyle = (style as string) || 'solo';
  const travelPace = (pace as string) || 'moderate';
  const resultLimit = limit ? parseInt(limit as string, 10) : 10;

  // Score all places
  const scoredPlaces: RecommendedPlaceResponse[] = PLACES_DATA.map((place) => {
    const scoreResult = scorePlaceForUser(
      place,
      userLat,
      userLon,
      interests,
      availableHours,
      travelStyle,
      travelPace
    );

    return {
      ...place,
      distanceKm: scoreResult.distanceKm,
      travelTimeMin: scoreResult.travelTimeMin,
      isOpenNow: scoreResult.isOpenNow,
      matchScore: scoreResult.matchScore,
      matchReasons: scoreResult.matchReasons,
      scoreBreakdown: scoreResult.scoreBreakdown
    };
  });

  // Sort descending by matchScore
  scoredPlaces.sort((a, b) => b.matchScore - a.matchScore);

  const topResults = scoredPlaces.slice(0, resultLimit);

  return res.status(200).json({
    success: true,
    total: topResults.length,
    appliedPreferences: {
      interests,
      availableHours,
      budgetAmount,
      travelStyle,
      pace: travelPace
    },
    origin: { lat: userLat, lon: userLon },
    places: topResults
  });
};
