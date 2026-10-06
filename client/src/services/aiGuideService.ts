import { GeoLocation, Place, TripRoute, UserPreferences } from '../types/travel';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: 'gemini' | 'grounded-fallback';
  groundedFacts?: {
    city?: string;
    firstStop?: string;
    totalStops?: number;
    preferredTransport?: string;
    estimatedFareDisplay?: string;
    feasibilityStatus?: string;
    remainingBufferMin?: number;
  };
  suggestedFollowUps?: string[];
}

export interface AIStatusInfo {
  status: string;
  provider: string;
  isGrounded: boolean;
  hasApiKey: boolean;
  demoMode: boolean;
}

/**
 * Prepares a compact and relevant application context for the AI Guide.
 * Includes only pertinent location, preference, trip, and nearby POI data.
 */
export function formatAIContext(
  location: GeoLocation,
  preferences: UserPreferences,
  tripRoute: TripRoute,
  discoveredPlaces: Place[] = []
) {
  const stops = tripRoute.stops || [];
  
  // Compact list of selected trip stops
  const selectedStops = stops.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    categoryLabel: s.categoryLabel || s.category,
    rating: s.rating,
    distanceKm: Number((s.distanceKm || 0).toFixed(1)),
    visitDuration: s.visitDuration || '45-60 min',
    shortDescription: s.shortDescription,
    openingHours: s.openingHours,
    isOpenNow: s.isOpenNow,
    entryFee: s.entryFee,
    matchReasons: s.matchReasons || (s.whyRecommended ? [s.whyRecommended] : []),
    address: s.address
  }));

  // Top 5 nearby discovered places not already in trip
  const topNearby = discoveredPlaces
    .filter((p) => !stops.some((s) => s.id === p.id))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      categoryLabel: p.categoryLabel || p.category,
      rating: p.rating,
      distanceKm: Number((p.distanceKm || 0).toFixed(1)),
      visitDuration: p.visitDuration,
      shortDescription: p.shortDescription,
      isOpenNow: p.isOpenNow,
      entryFee: p.entryFee,
      matchReasons: p.matchReasons || (p.whyRecommended ? [p.whyRecommended] : [])
    }));

  return {
    location: {
      city: location.city || 'Unknown',
      area: location.area || '',
      lat: location.lat,
      lon: location.lon,
      formatted: location.formatted
    },
    userPreferences: {
      interests: preferences.interests || [],
      availableHours: preferences.availableHours || 4,
      budgetAmount: preferences.budgetAmount || 1000,
      travelStyle: preferences.travelStyle || 'solo',
      pace: preferences.pace || 'moderate',
      maxDistanceKm: preferences.maxDistanceKm,
      minRating: preferences.minRating,
      openNowOnly: preferences.openNowOnly
    },
    selectedTrip: {
      stopCount: stops.length,
      stops: selectedStops,
      totalDistanceKm: Number((tripRoute.totalDistanceKm || 0).toFixed(1)),
      totalTravelTimeMin: tripRoute.totalTravelTimeMin || 0,
      totalVisitTimeMin: tripRoute.totalVisitTimeMin || 0,
      totalEstimatedDurationMin: tripRoute.totalEstimatedDurationMin || 0,
      preferredMode: tripRoute.preferredMode || 'auto',
      isOptimized: Boolean(tripRoute.isOptimized),
      distanceSavedKm: tripRoute.distanceSavedKm
    },
    topNearbyPlaces: topNearby,
    itinerarySchedule: tripRoute.schedule ? {
      startTimeStr: tripRoute.schedule.startTimeStr,
      endTimeStr: tripRoute.schedule.endTimeStr,
      bufferMin: tripRoute.schedule.bufferMin,
      totalTripMin: tripRoute.schedule.totalTripMin,
      stops: tripRoute.schedule.stops.map((st) => ({
        stopIndex: st.stopIndex,
        name: st.place.name,
        arrivalTimeStr: st.arrivalTimeStr,
        departureTimeStr: st.departureTimeStr,
        visitDurationMin: st.visitDurationMin,
        visitDurationDisplay: st.visitDurationDisplay,
        openStatus: st.openStatus,
        openStatusLabel: st.openStatusLabel
      }))
    } : undefined,
    itineraryFeasibility: tripRoute.feasibility ? {
      status: tripRoute.feasibility.status,
      statusLabel: tripRoute.feasibility.statusLabel,
      availableMinutes: tripRoute.feasibility.availableMinutes,
      totalTripMinutes: tripRoute.feasibility.totalTripMinutes,
      bufferMinutes: tripRoute.feasibility.bufferMinutes,
      remainingMinutes: tripRoute.feasibility.remainingMinutes,
      exceededMinutes: tripRoute.feasibility.exceededMinutes,
      headline: tripRoute.feasibility.headline,
      explanation: tripRoute.feasibility.explanation,
      suggestions: tripRoute.feasibility.suggestions
    } : undefined,
    transportRecommendation: tripRoute.recommendation ? {
      recommendedMode: tripRoute.recommendation.recommended.mode,
      modeLabel: tripRoute.recommendation.recommended.modeLabel,
      tagline: tripRoute.recommendation.recommended.tagline,
      matchReasons: tripRoute.recommendation.recommended.matchReasons,
      travelTimeMin: tripRoute.recommendation.recommended.travelTimeMin,
      travelTimeDisplay: tripRoute.recommendation.recommended.travelTimeDisplay,
      fareDisplay: tripRoute.recommendation.recommended.fareEstimate.fareDisplay,
      budgetImpact: tripRoute.recommendation.budgetImpact,
      timeImpact: tripRoute.recommendation.timeImpact,
      alternatives: tripRoute.recommendation.alternatives.map((a) => ({
        mode: a.mode,
        modeLabel: a.modeLabel,
        travelTimeDisplay: a.travelTimeDisplay,
        fareDisplay: a.fareEstimate.fareDisplay,
        tagline: a.tagline
      })),
      summaryExplanation: tripRoute.recommendation.summaryExplanation
    } : undefined,
    tripFareSummary: tripRoute.fareSummary ? {
      preferredMode: tripRoute.fareSummary.preferredMode,
      totalFareDisplay: tripRoute.fareSummary.totalFareDisplay,
      totalMinFareInr: tripRoute.fareSummary.totalMinFareInr,
      totalMaxFareInr: tripRoute.fareSummary.totalMaxFareInr,
      isEstimate: tripRoute.fareSummary.isEstimate,
      assumptions: tripRoute.fareSummary.assumptions,
      legs: tripRoute.fareSummary.legs.map((l) => ({
        fromName: l.fromName,
        toName: l.toName,
        distanceKm: Number(l.distanceKm.toFixed(1)),
        fareDisplay: l.fare.fareDisplay
      }))
    } : undefined
  };
}

/**
 * Sends a travel question with structured context to the backend AI endpoint.
 * Returns response payload or fallback message on network error.
 */
export async function sendAIChatMessage(
  message: string,
  contextPayload: ReturnType<typeof formatAIContext>,
  conversationHistory: ChatMessage[] = []
): Promise<{
  answer: string;
  source: 'gemini' | 'grounded-fallback';
  groundedFacts?: any;
  suggestedFollowUps?: string[];
}> {
  try {
    const formattedHistory = conversationHistory.map((m) => ({
      role: m.role,
      content: m.content
    }));

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        context: contextPayload,
        conversationHistory: formattedHistory
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }

    throw new Error('Invalid response structure from AI service');
  } catch (error: any) {
    console.warn('[AI Guide] Backend request failed, using safe client fallback:', error);
    
    // Graceful fallback if backend is unreachable: does NOT break the application
    return {
      answer: `[APPLICATION DATA] The AI assistant service is temporarily offline or unreachable.\n\n` +
        `However, all your application data remains completely safe and functional! You can view your destinations in the **Explore** tab, inspect your route on the **Map**, and check fares and order in the **My Trip** tab.`,
      source: 'grounded-fallback',
      groundedFacts: {
        city: contextPayload.location.city,
        totalStops: contextPayload.selectedTrip.stopCount,
        preferredTransport: contextPayload.selectedTrip.preferredMode
      },
      suggestedFollowUps: ['What should I visit first?', 'How much will my trip cost?']
    };
  }
}

/**
 * Checks AI service status and configured provider.
 */
export async function fetchAIStatus(): Promise<AIStatusInfo> {
  try {
    const res = await fetch('/api/ai/status');
    if (!res.ok) throw new Error('Status check failed');
    return await res.json();
  } catch {
    return {
      status: 'offline',
      provider: 'grounded-local-engine',
      isGrounded: true,
      hasApiKey: false,
      demoMode: true
    };
  }
}
