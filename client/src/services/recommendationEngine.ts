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

// Dynamic open status calculation
export function getPlaceIsOpenNow(placeId: string): boolean {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const day = now.getDay();

  // Friday closed check for Chowmahalla Palace
  if (placeId === 'chowmahalla' && day === 5) return false;
  
  if (placeId === 'birla-mandir') {
    return (hour >= 7 && hour <= 12) || (hour >= 15 && hour <= 21);
  }
  if (placeId === 'niloufer-cafe') {
    return hour >= 4 && hour <= 23.5;
  }
  if (placeId === 'paradise-biryani') {
    return hour >= 11.5 && hour <= 23.5;
  }
  return hour >= 9.5 && hour <= 18.0;
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
  isOpenNow?: boolean;
} {
  const distanceKm = calculateHaversineDistanceKm(userLat, userLon, place.lat, place.lon);
  const travelTimeMin = Math.max(5, Math.round(distanceKm * 2.5 + 4));
  const isOpenNow = place.isOpenNow !== undefined ? place.isOpenNow : getPlaceIsOpenNow(place.id);
  const reasons: string[] = [];

  // =========================================================================
  // 1. INTEREST SCORE (Weight: 30%)
  // =========================================================================
  let interestScore = 20; // baseline for non-matching categories
  const normInterests = preferences.interests.map((i) => i.trim().toLowerCase()).filter(Boolean);
  const isDirectCategoryMatch = normInterests.includes(place.category.toLowerCase());
  const matchingTags = place.tags.filter((tag) =>
    normInterests.some((interest) => tag.toLowerCase().includes(interest) || interest.includes(tag.toLowerCase()))
  );

  if (normInterests.length === 0 || normInterests.includes('all')) {
    interestScore = 80;
  } else if (isDirectCategoryMatch) {
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
  const paceMultiplier = preferences.pace === 'relaxed' ? 1.4 : preferences.pace === 'fast' ? 0.7 : 1.0;
  const adjustedStayHours = baseVisitHours * paceMultiplier;
  const totalRequiredHours = adjustedStayHours + (travelTimeMin / 60);

  let timeFitScore = 50;
  if (preferences.availableHours <= 2.5) {
    // 2-Hour Quick Trip
    if (totalRequiredHours <= 1.3) {
      timeFitScore = 100;
      reasons.push(`Optimal quick stop for your ${preferences.availableHours}h schedule`);
    } else if (totalRequiredHours <= 2.0) {
      timeFitScore = 75;
      reasons.push(`Fits within your ${preferences.availableHours}h limit`);
    } else {
      timeFitScore = 15; // Severe penalty: a 3h fort/village cannot fit in 2h
    }
  } else if (preferences.availableHours <= 5) {
    // 4-Hour Half-Day Excursion
    if (totalRequiredHours >= 1.2 && totalRequiredHours <= 3.5) {
      timeFitScore = 100;
      reasons.push(`Perfect duration for a ${preferences.availableHours}h half-day outing`);
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
      timeFitScore = 75;
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
  if (preferences.budgetAmount <= 600) {
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
  } else if (preferences.budgetAmount <= 1500) {
    // Moderate / Popular (₹1,000)
    if (totalEstExpense <= 600) {
      budgetFitScore = 95;
      reasons.push(`Comfortable value within your ₹${preferences.budgetAmount.toLocaleString()} budget`);
    } else {
      budgetFitScore = 65;
    }
  } else {
    // Premium / Cab & Dining (₹2,500 – ₹5,000+)
    budgetFitScore = 100;
    reasons.push(`Premium experience matching your ₹${preferences.budgetAmount.toLocaleString()} budget`);
  }

  // =========================================================================
  // 6. OPERATING STATUS SCORE (Weight: 10%)
  // =========================================================================
  let openStatusScore = 60; // neutral default if unlisted
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

  if (preferences.travelStyle === 'solo') {
    if (cat === 'cafes' || cat === 'food' || cat === 'photography' || tagsLower.includes('old city')) {
      styleFitScore = 98;
      reasons.push('Solo favorite: Walkable, great photography & cafe stops');
    }
  } else if (preferences.travelStyle === 'couple') {
    if (cat === 'nature' || tagsLower.includes('sunset') || tagsLower.includes('palace') || cat === 'architecture') {
      styleFitScore = 98;
      reasons.push('Scenic & romantic appeal with relaxed atmosphere');
    } else if (cat === 'shopping' || tagsLower.includes('bazaar')) {
      styleFitScore = 60;
    }
  } else if (preferences.travelStyle === 'family') {
    if (tagsLower.includes('family friendly') || tagsLower.includes('crafts') || cat === 'culture' || cat === 'nature') {
      styleFitScore = 98;
      reasons.push('Family-approved: Comfortable terrain & multi-age interest');
    } else if (place.id === 'golconda') {
      styleFitScore = 35; // Steep climb penalty
    }
  } else if (preferences.travelStyle === 'friends') {
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
    ((styleFitScore - 75) * 0.10);

  const matchScore = Math.min(99, Math.max(25, Math.round(weightedTotal)));

  return {
    matchScore,
    matchReasons: reasons.slice(0, 3),
    scoreBreakdown: {
      interest: interestScore,
      distance: distanceScore,
      rating: ratingScore,
      timeFit: timeFitScore,
      budgetFit: budgetFitScore,
      openStatus: openStatusScore,
      styleFit: styleFitScore,
    },
    distanceKm,
    isOpenNow,
  };
}

/**
 * Score, filter, and rank places dynamically based on user preferences and location
 */
export function rankPlacesForUser(
  places: Place[],
  userLat: number,
  userLon: number,
  preferences: UserPreferences
): RecommendedPlace[] {
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[Recommendation Engine] Scoring ${places.length} places with interests=[${preferences.interests.join(
        ', '
      )}] hours=${preferences.availableHours} budget=₹${preferences.budgetAmount} style=${preferences.travelStyle} maxDist=${preferences.maxDistanceKm} minRate=${preferences.minRating} openNow=${preferences.openNowOnly}`
    );
  }

  let scoredList: RecommendedPlace[] = places.map((place) => {
    const scored = scorePlace(place, userLat, userLon, preferences);
    return {
      ...place,
      distanceKm: scored.distanceKm,
      travelTimeMin: Math.max(5, Math.round(scored.distanceKm * 2.5 + 4)),
      isOpenNow: scored.isOpenNow,
      matchScore: scored.matchScore,
      matchReasons: scored.matchReasons,
      scoreBreakdown: scored.scoreBreakdown,
    };
  });

  // Apply Hard Filters
  if (preferences.maxDistanceKm && preferences.maxDistanceKm > 0) {
    scoredList = scoredList.filter((p) => p.distanceKm <= preferences.maxDistanceKm!);
  }

  if (preferences.minRating && preferences.minRating > 0) {
    scoredList = scoredList.filter((p) => p.rating !== undefined && p.rating >= preferences.minRating!);
  }

  if (preferences.openNowOnly) {
    scoredList = scoredList.filter((p) => p.isOpenNow === true);
  }

  // Sort descending by matchScore
  scoredList.sort((a, b) => b.matchScore - a.matchScore);

  if (process.env.NODE_ENV !== 'production' && scoredList.length > 0) {
    console.log(
      `[Recommendation Engine] Top 3 matches:`,
      scoredList.slice(0, 3).map((p) => `${p.name} (${p.matchScore}%)`)
    );
  }

  return scoredList;
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

    if (preferences.maxDistanceKm) {
      params.append('maxDistance', preferences.maxDistanceKm.toString());
    }
    if (preferences.minRating) {
      params.append('minRating', preferences.minRating.toString());
    }
    if (preferences.openNowOnly) {
      params.append('openNow', 'true');
    }

    const res = await fetch(`/api/recommendations?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.places && Array.isArray(data.places)) {
        return data.places;
      }
    }
  } catch (err) {
    console.warn('[Recommendation Engine] Backend API call failed, falling back to local client engine:', err);
  }

  return [];
}
