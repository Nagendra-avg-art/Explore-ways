import { Request, Response } from 'express';
import { 
  PLACES_DATA, 
  CURATED_PLACES,
  BackendPlace, 
  calculateHaversineDistanceKm, 
  checkIsOpenNow 
} from './placesController.js';

export interface ScoreBreakdown {
  interestMatch: number;
  distanceProximity: number;
  ratingQuality: number;
  timeFit: number;
  budgetFit: number;
  openStatus: number;
  travelStyleBonus: number;
}

export interface RecommendedPlaceResponse {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  rating?: number;
  reviewCount?: number;
  lat: number;
  lon: number;
  distanceKm: number;
  travelTimeMin: number;
  visitDuration: string;
  imageUrl: string;
  shortDescription: string;
  fullDescription?: string;
  whyRecommended: string;
  tags: string[];
  openingHours?: string;
  isOpenNow?: boolean;
  entryFee?: string;
  nearbyFood?: string[];
  transportEstimates?: { mode: string; label: string; time: string; cost: string; icon: string }[];
  matchScore: number;
  matchReasons: string[];
  scoreBreakdown: ScoreBreakdown;
  source?: 'live' | 'demo' | 'curated';
  sourceName?: string;
  provenance?: import('../types/places.js').PlaceProvenance;
  confidence?: import('../types/places.js').DataConfidence;
  address?: string;
}

// Helper to convert human duration strings like '1–2 hrs' to numeric hours
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

// Helper to extract numeric entry fee in INR
export function parseEntryFeeAmount(entryFeeStr?: string): number {
  if (!entryFeeStr) return 0;
  const lower = entryFeeStr.toLowerCase();
  if (lower.includes('free')) return 0;
  const match = entryFeeStr.match(/₹\s*(\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
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
  budgetAmount: number,
  travelStyle: string,
  pace: string
): {
  matchScore: number;
  matchReasons: string[];
  scoreBreakdown: ScoreBreakdown;
  distanceKm: number;
  travelTimeMin: number;
  isOpenNow: boolean | undefined;
} {
  const distanceKm = calculateHaversineDistanceKm(userLat, userLon, place.lat, place.lon);
  const travelTimeMin = Math.max(5, Math.round(distanceKm * 2.5 + 4));
  const isOpenNow = checkIsOpenNow(place);
  const reasons: string[] = [];

  // =========================================================================
  // 1. INTEREST SCORE (Weight: 30%)
  // =========================================================================
  let interestScore = 20; // baseline for non-matching categories
  const normInterests = interests.map((i) => i.trim().toLowerCase()).filter(Boolean);
  const isDirectCategoryMatch = normInterests.includes(place.category.toLowerCase());
  const matchingTags = place.tags.filter((tag) =>
    normInterests.some((interest) => tag.toLowerCase().includes(interest) || interest.includes(tag.toLowerCase()))
  );

  if (normInterests.length === 0 || normInterests.includes('all')) {
    interestScore = 80; // neutral when no specific interest chosen
  } else if (isDirectCategoryMatch) {
    // If it matches the very first selected interest, give peak priority
    const isFirstInterest = normInterests[0] === place.category.toLowerCase();
    interestScore = isFirstInterest ? 96 : 90;
    if (matchingTags.length > 0) {
      interestScore = Math.min(100, interestScore + matchingTags.length * 3);
    }
    reasons.push(`Direct match for your interest in ${place.categoryLabel.replace(/^[^\w\s]+/, '').trim()}`);
  } else if (matchingTags.length > 0) {
    interestScore = 60 + Math.min(20, matchingTags.length * 8);
    reasons.push(`Matches your themes: ${matchingTags.join(', ')}`);
  } else {
    interestScore = 15; // strong divergence: non-matching place drops significantly
  }

  // =========================================================================
  // 2. DISTANCE SCORE (Weight: 20%)
  // =========================================================================
  let distanceScore = 40;
  if (distanceKm <= 1.5) {
    distanceScore = 100;
    reasons.push(`Walking distance: Only ${distanceKm} km away`);
  } else if (distanceKm <= 4.0) {
    distanceScore = 88;
    reasons.push(`Close by: ${distanceKm} km from you`);
  } else if (distanceKm <= 8.0) {
    distanceScore = 70;
    reasons.push(`Convenient reach: ${distanceKm} km away`);
  } else if (distanceKm <= 15.0) {
    distanceScore = 50;
  } else if (distanceKm <= 25.0) {
    distanceScore = 30;
  } else {
    distanceScore = Math.max(5, Math.round(100 - distanceKm * 3.5));
  }

  // =========================================================================
  // 3. RATING & QUALITY SCORE (Weight: 15%)
  // =========================================================================
  let ratingScore = 50;
  if (place.rating !== undefined && place.rating !== null) {
    if (place.rating >= 4.8) {
      ratingScore = 96;
    } else if (place.rating >= 4.7) {
      ratingScore = 88;
    } else if (place.rating >= 4.6) {
      ratingScore = 80;
    } else if (place.rating >= 4.5) {
      ratingScore = 70;
    } else if (place.rating >= 4.4) {
      ratingScore = 60;
    } else {
      ratingScore = 40;
    }

    if (place.reviewCount && place.reviewCount > 15000) {
      ratingScore = Math.min(100, ratingScore + 4);
    }

    if (place.rating >= 4.7) {
      reasons.push(`Top-rated: ${place.rating}★ (${place.reviewCount ? place.reviewCount.toLocaleString() : ''} reviews)`);
    }
  }

  // =========================================================================
  // 4. TIME & PACE COMPATIBILITY SCORE (Weight: 15%)
  // =========================================================================
  const baseVisitHours = parseDurationHours(place.visitDuration);
  const paceMultiplier = pace === 'relaxed' ? 1.4 : pace === 'fast' ? 0.7 : 1.0;
  const adjustedStayHours = baseVisitHours * paceMultiplier;
  const totalRequiredHours = adjustedStayHours + (travelTimeMin / 60);

  let timeFitScore = 50;

  if (availableHours <= 2.5) {
    // 2-Hour Quick Trip
    if (totalRequiredHours <= 1.3) {
      timeFitScore = 100;
      reasons.push(`Optimal quick stop for your ${availableHours}h schedule`);
    } else if (totalRequiredHours <= 2.0) {
      timeFitScore = 75;
      reasons.push(`Fits within your ${availableHours}h limit`);
    } else {
      timeFitScore = 15; // Severe penalty: a 3h fort/village cannot fit in 2h
    }
  } else if (availableHours <= 5) {
    // 4-Hour Half-Day Excursion
    if (totalRequiredHours >= 1.2 && totalRequiredHours <= 3.5) {
      timeFitScore = 100;
      reasons.push(`Perfect duration for a ${availableHours}h half-day outing`);
    } else if (totalRequiredHours <= 1.2) {
      timeFitScore = 80;
    } else {
      timeFitScore = 35;
    }
  } else {
    // Full Day (6 to 9+ Hours)
    if (adjustedStayHours >= 2.0) {
      timeFitScore = 100;
      reasons.push(`Spacious landmark ideal for a full-day itinerary`);
    } else {
      timeFitScore = 75; // Quick stops are still fine, but full day favors major anchors
    }
  }

  // =========================================================================
  // 5. BUDGET FIT SCORE (Weight: 10%)
  // =========================================================================
  const entryFeeNum = parseEntryFeeAmount(place.entryFee);
  const transitEstCost = Math.max(30, Math.round(distanceKm * 15));
  const isFoodStop = place.category === 'food' || place.category === 'cafes';
  const foodEst = isFoodStop ? (place.id === 'paradise-biryani' ? 350 : place.id === 'niloufer-cafe' ? 80 : 200) : 0;
  const totalEstExpense = entryFeeNum + transitEstCost + foodEst;

  let budgetFitScore = 70;
  if (budgetAmount <= 600) {
    // Budget Backpacker (₹500)
    if (totalEstExpense <= 120) {
      budgetFitScore = 100;
      reasons.push(`Pocket-friendly: Under ₹150 estimated expense`);
    } else if (totalEstExpense <= 250) {
      budgetFitScore = 80;
    } else if (totalEstExpense <= 450) {
      budgetFitScore = 55;
    } else {
      budgetFitScore = 25; // Exceeds budget constraints
    }
  } else if (budgetAmount <= 1500) {
    // Moderate / Popular (₹1,000)
    if (totalEstExpense <= 600) {
      budgetFitScore = 95;
      reasons.push(`Comfortable value within your ₹${budgetAmount.toLocaleString()} budget`);
    } else {
      budgetFitScore = 65;
    }
  } else {
    // Premium / Cab & Dining (₹2,500 – ₹5,000+)
    budgetFitScore = 100;
    reasons.push(`Premium experience matching your ₹${budgetAmount.toLocaleString()} budget`);
  }

  // =========================================================================
  // 6. OPERATING STATUS SCORE (Weight: 10%)
  // =========================================================================
  let openStatusScore = 60; // neutral default
  if (isOpenNow === true) {
    openStatusScore = 100;
    reasons.push('Open now for immediate visit');
  } else if (isOpenNow === false) {
    openStatusScore = 20;
  }

  // =========================================================================
  // 7. TRAVEL STYLE MODIFIER (±10 points)
  // =========================================================================
  let styleFitScore = 75;
  const tagsLower = place.tags.map((t) => t.toLowerCase());
  const cat = place.category;

  if (travelStyle === 'solo') {
    if (cat === 'cafes' || cat === 'food' || cat === 'photography' || tagsLower.includes('old city')) {
      styleFitScore = 98;
      reasons.push('Solo favorite: Walkable, great photography & cafe stops');
    }
  } else if (travelStyle === 'couple') {
    if (cat === 'nature' || tagsLower.includes('sunset') || tagsLower.includes('palace') || cat === 'architecture') {
      styleFitScore = 98;
      reasons.push('Scenic & romantic appeal with relaxed atmosphere');
    } else if (cat === 'shopping' || tagsLower.includes('bazaar')) {
      styleFitScore = 60; // Crowded bazaars less preferred for romantic vibe
    }
  } else if (travelStyle === 'family') {
    if (tagsLower.includes('family friendly') || tagsLower.includes('crafts') || cat === 'culture' || cat === 'nature') {
      styleFitScore = 98;
      reasons.push('Family-approved: Comfortable terrain & multi-age interest');
    } else if (place.id === 'golconda') {
      // Steep climbs of hundreds of stone stairs are taxing for toddlers and grandparents
      styleFitScore = 35;
    }
  } else if (travelStyle === 'friends') {
    if (cat === 'food' || cat === 'shopping' || tagsLower.includes('bazaar') || place.id === 'golconda') {
      styleFitScore = 98;
      reasons.push('Great for groups: Vibrant markets, street food & exploration');
    }
  }

  // =========================================================================
  // WEIGHTED COMPOSITE SCORE
  // =========================================================================
  const weightedTotal = 
    0.30 * interestScore +
    0.20 * distanceScore +
    0.15 * ratingScore +
    0.15 * timeFitScore +
    0.10 * budgetFitScore +
    0.10 * openStatusScore +
    ((styleFitScore - 75) * 0.10); // Style affinity bonus/penalty

  const matchScore = Math.min(99, Math.max(25, Math.round(weightedTotal)));

  return {
    matchScore,
    matchReasons: reasons.slice(0, 3),
    scoreBreakdown: {
      interestMatch: interestScore,
      distanceProximity: distanceScore,
      ratingQuality: ratingScore,
      timeFit: timeFitScore,
      budgetFit: budgetFitScore,
      openStatus: openStatusScore,
      travelStyleBonus: styleFitScore
    },
    distanceKm,
    travelTimeMin,
    isOpenNow
  };
}

export const getRecommendations = async (req: Request, res: Response) => {
  const body = req.body || {};
  const query = req.query || {};

  const lat = body.userLat ?? body.lat ?? query.lat;
  const lon = body.userLon ?? body.lon ?? query.lon;
  
  // Extract interests
  const rawInterests = body.preferences?.interests ?? body.interests ?? query.interests;
  let interests: string[] = [];
  if (Array.isArray(rawInterests)) {
    interests = rawInterests.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
  } else if (typeof rawInterests === 'string') {
    interests = rawInterests.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }

  // Extract hours
  const rawTime = body.preferences?.availableTime ?? body.availableHours ?? body.hours ?? query.hours;
  let availableHours = 4;
  if (rawTime === 'short' || rawTime === '2' || rawTime === 2) availableHours = 2;
  else if (rawTime === 'half_day' || rawTime === '4' || rawTime === 4) availableHours = 4;
  else if (rawTime === 'full_day' || rawTime === '8' || rawTime === 8) availableHours = 8;
  else if (typeof rawTime === 'number') availableHours = rawTime;
  else if (!isNaN(parseFloat(rawTime))) availableHours = parseFloat(rawTime);

  // Extract budget
  const rawBudget = body.preferences?.budgetAmount ?? body.budget ?? query.budget;
  const budgetAmount = rawBudget ? parseFloat(String(rawBudget)) : 1000;

  // Extract style & pace
  const travelStyle = body.preferences?.travelStyle ?? body.style ?? query.style ?? 'solo';
  const travelPace = body.preferences?.pacePreference ?? body.pace ?? query.pace ?? 'moderate';

  // Extract filters
  const maxDistance = body.preferences?.maxDistanceKm ?? body.maxDistance ?? query.maxDistance;
  const minRating = body.preferences?.minRating ?? body.minRating ?? query.minRating;
  const openNow = body.preferences?.openNowOnly ?? (body.openNow !== undefined ? body.openNow : query.openNow);
  const isOpenNowFilter = openNow === true || openNow === 'true';

  let userLat = 17.3616;
  let userLon = 78.4747;
  if (lat !== undefined || lon !== undefined) {
    const parsedLat = parseFloat(String(lat));
    const parsedLon = parseFloat(String(lon));
    if (isNaN(parsedLat) || isNaN(parsedLon) || parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
      return res.status(400).json({ error: 'Invalid numeric coordinates: lat must be between -90 and 90, lon between -180 and 180' });
    }
    userLat = parsedLat;
    userLon = parsedLon;
  }
  const limit = body.limit ?? query.limit;
  const resultLimit = limit ? Math.max(1, parseInt(String(limit), 10)) : 10;

  // Development logging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Recommendation Engine API] Recalculating: interests=[${interests.join(', ')}] hours=${availableHours} budget=₹${budgetAmount} style=${travelStyle} pace=${travelPace} origin=(${userLat}, ${userLon})`);
  }

  let candidatePool: BackendPlace[] = [];
  if (Array.isArray(body.candidatePlaces) && body.candidatePlaces.length > 0) {
    candidatePool = body.candidatePlaces;
  } else {
    // Location-safe candidate pool: match curated places within 35km first
    const curatedMatches = CURATED_PLACES.filter(p => calculateHaversineDistanceKm(userLat, userLon, p.lat, p.lon) <= 35);
    if (curatedMatches.length > 0) {
      candidatePool = curatedMatches;
    } else {
      const isHyderabadArea = calculateHaversineDistanceKm(userLat, userLon, 17.3616, 78.4747) <= 35;
      candidatePool = isHyderabadArea ? PLACES_DATA : [];
    }
  }

  // 1. Score all places
  let scoredPlaces: RecommendedPlaceResponse[] = candidatePool.map((place) => {
    const scoreResult = scorePlaceForUser(
      place,
      userLat,
      userLon,
      interests,
      availableHours,
      budgetAmount,
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

  // 2. Apply Hard Filters if specified
  if (maxDistance !== undefined && maxDistance !== null) {
    const maxDistNum = typeof maxDistance === 'number' ? maxDistance : parseFloat(String(maxDistance));
    if (!isNaN(maxDistNum) && maxDistNum > 0) {
      scoredPlaces = scoredPlaces.filter((p) => p.distanceKm <= maxDistNum);
    }
  }

  if (minRating !== undefined && minRating !== null) {
    const minRatingNum = typeof minRating === 'number' ? minRating : parseFloat(String(minRating));
    if (!isNaN(minRatingNum) && minRatingNum > 0) {
      scoredPlaces = scoredPlaces.filter((p) => p.rating !== undefined && p.rating >= minRatingNum);
    }
  }

  if (isOpenNowFilter) {
    scoredPlaces = scoredPlaces.filter((p) => p.isOpenNow === true);
  }

  // 3. Sort descending by matchScore
  scoredPlaces.sort((a, b) => b.matchScore - a.matchScore);

  const topResults = scoredPlaces.slice(0, resultLimit);

  return res.status(200).json({
    success: true,
    totalCandidates: candidatePool.length,
    count: topResults.length,
    total: topResults.length,
    appliedPreferences: {
      interests,
      availableHours,
      budgetAmount,
      travelStyle,
      pace: travelPace,
      maxDistance: maxDistance ? parseFloat(String(maxDistance)) : null,
      minRating: minRating ? parseFloat(String(minRating)) : null,
      openNow: isOpenNowFilter
    },
    origin: { lat: userLat, lon: userLon },
    places: topResults
  });
};
