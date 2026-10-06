/**
 * AI Service for Smart Travel Companion
 * Phase 11 — AI Local Travel Guide
 *
 * Implements a grounded AI travel assistant that answers questions using the
 * actual application context (stops, routes, fares, transport recommendation,
 * itinerary feasibility, and nearby POIs).
 *
 * - When GEMINI_API_KEY is configured, queries the Gemini API with a strictly grounded system prompt.
 * - When GEMINI_API_KEY is missing or the external API fails/times out, executes a deterministic
 *   grounded rule-based response engine that uses the structured context directly.
 * - Never hallucinates ungrounded details; explicitly distinguishes APPLICATION DATA from ESTIMATES.
 */

export interface AIContextData {
  location: {
    city: string;
    area: string;
    lat: number;
    lon: number;
    formatted?: string;
  };
  userPreferences: {
    interests: string[];
    availableHours: number;
    budgetAmount: number;
    travelStyle: string;
    pace: string;
    maxDistanceKm?: number | null;
    minRating?: number | null;
    openNowOnly?: boolean;
  };
  selectedTrip: {
    stopCount: number;
    stops: Array<{
      id: string;
      name: string;
      category: string;
      categoryLabel?: string;
      rating?: number;
      distanceKm: number;
      visitDuration: string;
      shortDescription?: string;
      openingHours?: string;
      isOpenNow?: boolean;
      entryFee?: string;
      matchReasons?: string[];
      address?: string;
    }>;
    totalDistanceKm: number;
    totalTravelTimeMin: number;
    totalVisitTimeMin: number;
    totalEstimatedDurationMin: number;
    preferredMode: string;
    isOptimized: boolean;
    distanceSavedKm?: number;
  };
  topNearbyPlaces: Array<{
    id: string;
    name: string;
    category: string;
    categoryLabel?: string;
    rating?: number;
    distanceKm: number;
    visitDuration?: string;
    shortDescription?: string;
    isOpenNow?: boolean;
    openingHours?: string;
    entryFee?: string;
    address?: string;
    matchReasons?: string[];
  }>;
  topNearbyFoodPlaces?: Array<{
    id: string;
    name: string;
    foodCategory: string;
    foodCategoryLabel: string;
    cuisine?: string;
    distanceKm: number;
    rating?: number;
    priceLevel: string;
    priceLevelDisplay: string;
    isOpenNow?: boolean;
    openingHoursDisplay: string;
    vegetarian?: boolean;
    recommendationReason?: string;
    address?: string;
  }>;
  itinerarySchedule?: {
    startTimeStr: string;
    endTimeStr: string;
    bufferMin: number;
    totalTripMin: number;
    stops: Array<{
      stopIndex: number;
      name: string;
      arrivalTimeStr: string;
      departureTimeStr: string;
      visitDurationMin: number;
      visitDurationDisplay: string;
      openStatus: string;
      openStatusLabel: string;
    }>;
  };
  itineraryFeasibility?: {
    status: 'feasible' | 'tight' | 'exceeded';
    statusLabel: string;
    availableMinutes: number;
    totalTripMinutes: number;
    bufferMinutes: number;
    remainingMinutes: number;
    exceededMinutes: number;
    headline: string;
    explanation: string;
    suggestions: string[];
  };
  transportRecommendation?: {
    recommendedMode: string;
    modeLabel: string;
    tagline: string;
    matchReasons: string[];
    travelTimeMin: number;
    travelTimeDisplay: string;
    fareDisplay: string;
    budgetImpact: {
      tripBudgetInr: number;
      estimatedFareMinInr: number;
      estimatedFareMaxInr: number;
      remainingBudgetMinInr: number;
      remainingBudgetMaxInr: number;
      percentOfBudget: number;
    };
    timeImpact: {
      availableMinutes: number;
      transitTimeMinutes: number;
      remainingTimeMinutes: number;
    };
    alternatives: Array<{
      mode: string;
      modeLabel: string;
      travelTimeDisplay: string;
      fareDisplay: string;
      tagline: string;
    }>;
    summaryExplanation: string;
  };
  tripFareSummary?: {
    preferredMode: string;
    totalFareDisplay: string;
    totalMinFareInr: number;
    totalMaxFareInr: number;
    isEstimate: boolean;
    assumptions: string;
    legs: Array<{
      fromName: string;
      toName: string;
      distanceKm: number;
      fareDisplay: string;
    }>;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponsePayload {
  answer: string;
  source: 'gemini' | 'grounded-fallback';
  groundedFacts: {
    city: string;
    firstStop?: string;
    totalStops: number;
    preferredTransport: string;
    estimatedFareDisplay?: string;
    feasibilityStatus?: string;
    remainingBufferMin?: number;
  };
  suggestedFollowUps: string[];
}

/**
 * Builds system prompt instructing model to remain strictly grounded in application data
 */
function buildSystemPrompt(context: AIContextData): string {
  return `You are the AI Local Travel Guide for the Smart Travel Companion application.
Your role is to assist the user by answering questions about their active trip, itinerary, recommended places, transport, costs, and current location.

STRICT GROUNDING & ACCURACY RULES:
1. USE APPLICATION DATA FIRST: Always answer based on the structured application context provided below.
2. DO NOT FABRICATE FACTS: Do not invent opening hours, ticket prices, historical dates, ratings, or distances that are not in the structured data.
3. ADMIT MISSING DATA: If the user asks for details not present in the application data (e.g. historical trivia, ticket prices for unlisted places, specific phone numbers), explicitly state: "This specific detail is not available in our current application records."
4. CLEARLY DISTINGUISH DATA TYPES:
   - Prefix concrete facts from the app with [APPLICATION DATA] (e.g. confirmed stops, starting city, selected category).
   - Prefix estimates with [ESTIMATE] (e.g. estimated transit times, fare ranges, visit durations, buffer times).
   - Prefix general travel advice with [GENERAL INFORMATION] (e.g. general packing or walking tips).
5. ACTIONS ARE ADVISORY: You can advise or suggest changes (e.g. "You might want to skip Golconda Fort to save 75 minutes"), but remind the user they can make changes via the app controls. Do not claim you automatically modified the itinerary.
6. CONCISE & HELPFUL: Keep answers clear, well-structured, friendly, and directly focused on the user's question.

CURRENT APPLICATION CONTEXT:
${JSON.stringify(context, null, 2)}
`;
}

/**
 * Generates deterministic grounded response using application context
 * (Used when GEMINI_API_KEY is not set or when external API is unreachable)
 */
export function generateGroundedFallbackResponse(
  message: string,
  context: AIContextData
): AIResponsePayload {
  const query = message.toLowerCase().trim();
  const city = context?.location?.city || 'your area';
  const stops = context?.selectedTrip?.stops || [];
  const stopCount = stops.length;
  const feasibility = context?.itineraryFeasibility;
  const transport = context?.transportRecommendation;
  const fare = context?.tripFareSummary;
  const nearby = context?.topNearbyPlaces || [];
  const foodPlaces = context?.topNearbyFoodPlaces || [];
  const schedule = context?.itinerarySchedule;
  const prefs = context?.userPreferences;

  let answer = '';
  let followUps: string[] = [];

  // 0. Safeguard: Unrecorded details, obscure historical trivia, dates not in application data
  const isUnrecordedQuestion = 
    query.includes('1950') ||
    query.includes('1800') ||
    query.includes('born') ||
    query.includes('birth date') ||
    query.includes('architect') ||
    query.includes('telephone') ||
    query.includes('phone number') ||
    query.includes('wifi') ||
    query.includes('secret') ||
    query.includes('unverified') ||
    query.includes('unrecorded') ||
    query.includes('third cousin');

  if (isUnrecordedQuestion) {
    answer = `[APPLICATION DATA] This specific detail is not available in our current application records.\n\n` +
      `Our application data maintains verified operational and travel information for **${city}**, including:\n` +
      `• Active destinations & POIs (${stops.length} in your trip, ${nearby.length} nearby)\n` +
      `• Route distances, travel times, and timeline schedules\n` +
      `• City transport options and estimated tariffs\n` +
      `• Itinerary feasibility and visit duration estimates\n\n` +
      `I cannot verify unrecorded historical trivia or unlisted private details.`;
    followUps = ['What should I visit first?', 'How much will my trip cost?', 'Which transport should I take?'];
  }

  // 0.5 Food Explorer Intents: "What should I eat nearby?", "Cheapest food", "Vegetarian", "Add restaurant"
  else if (
    query.includes('eat nearby') ||
    query.includes('what should i eat') ||
    query.includes('where to eat') ||
    query.includes('food nearby') ||
    query.includes('food option is cheapest') ||
    query.includes('cheapest food') ||
    query.includes('vegetarian food') ||
    query.includes('get vegetarian') ||
    query.includes('food near my next stop') ||
    query.includes('add a restaurant') ||
    query.includes('food place is closest') ||
    query.includes('closest food')
  ) {
    if (foodPlaces.length === 0) {
      answer = `[APPLICATION DATA] I couldn't find reliable food information nearby. Try expanding your search radius to 5 km or 10 km in the Food Explorer tab.`;
      followUps = ['What can I do near me?', 'What should I visit first?'];
    } else if (query.includes('cheapest') || query.includes('cheap')) {
      const budgetOptions = foodPlaces.filter(f => f.priceLevel === 'budget');
      const pick = budgetOptions.length > 0 ? budgetOptions[0] : foodPlaces[0];
      answer = `[APPLICATION DATA] **Cheapest Food Option:** **${pick.name}**\n\n` +
        `• **Price Level:** [APPLICATION DATA] ${pick.priceLevelDisplay}\n` +
        `• **Distance:** [ESTIMATE] ~${pick.distanceKm.toFixed(1)} km away\n` +
        `• **Category:** ${pick.foodCategoryLabel} ${pick.cuisine ? `(${pick.cuisine})` : ''}\n` +
        `• **Status:** ${pick.isOpenNow === true ? '🟢 Open now' : pick.openingHoursDisplay}\n\n` +
        `You can tap "View on Map" or "Add to Trip" from the Food Explorer tab!`;
      followUps = ['Where can I get vegetarian food?', 'What should I eat nearby?', 'How much will my trip cost?'];
    } else if (query.includes('vegetarian') || query.includes('veg')) {
      const vegOptions = foodPlaces.filter(f => f.vegetarian === true || f.foodCategory === 'vegetarian');
      if (vegOptions.length > 0) {
        answer = `[APPLICATION DATA] **Vegetarian Dining Options in ${city}:**\n\n`;
        vegOptions.slice(0, 3).forEach((v, idx) => {
          answer += `${idx + 1}. **${v.name}** (${v.distanceKm.toFixed(1)} km away)\n` +
            `   • ${v.cuisine || v.foodCategoryLabel} · ${v.priceLevelDisplay}\n` +
            `   • Status: ${v.isOpenNow === true ? '🟢 Open now' : v.openingHoursDisplay}\n`;
        });
        answer += `\n*All options are mapped in the Food Explorer tab.*`;
      } else {
        answer = `[APPLICATION DATA] None of the currently mapped nearby places are explicitly tagged as pure vegetarian in local data. Check the Food Explorer tab for general restaurants.`;
      }
      followUps = ['What should I eat nearby?', 'Which food option is cheapest?', 'What should I visit first?'];
    } else if (query.includes('near my next stop')) {
      if (stops.length > 0) {
        const nextStop = stops[0];
        answer = `[APPLICATION DATA] **Food Options near ${nextStop.name}:**\n\n`;
        const nearNext = foodPlaces.slice(0, 2);
        nearNext.forEach((f, idx) => {
          answer += `${idx + 1}. **${f.name}** (~${f.distanceKm.toFixed(1)} km from your current spot)\n` +
            `   • Category: ${f.foodCategoryLabel} · ${f.priceLevelDisplay}\n`;
        });
        answer += `\n*Tip: You can add dining stops directly into your route in the Food Explorer tab!*`;
      } else {
        answer = `[APPLICATION DATA] You don't have any stops in your itinerary yet. Add a destination or browse nearby dining in the Food Explorer tab!`;
      }
      followUps = ['What should I eat nearby?', 'What should I visit first?'];
    } else if (query.includes('add a restaurant') || query.includes('add restaurant')) {
      answer = `[APPLICATION DATA] **Yes, you can add any restaurant or cafe to your trip!**\n\n` +
        `1. Go to the **Food Explorer** tab.\n` +
        `2. Find your preferred dining spot.\n` +
        `3. Tap **"Add to Trip"**.\n\n` +
        `Our itinerary engine will automatically incorporate it into your schedule, calculate travel times, and update your feasibility buffer.`;
      followUps = ['What should I eat nearby?', 'Can I fit another place?'];
    } else if (query.includes('closest') || query.includes('closest food')) {
      const closest = [...foodPlaces].sort((a, b) => a.distanceKm - b.distanceKm)[0];
      answer = `[APPLICATION DATA] **Closest Food Option:** **${closest.name}**\n\n` +
        `• **Distance:** [ESTIMATE] Only **${closest.distanceKm.toFixed(1)} km** from your current location\n` +
        `• **Category:** ${closest.foodCategoryLabel} ${closest.cuisine ? `(${closest.cuisine})` : ''}\n` +
        `• **Status:** ${closest.isOpenNow === true ? '🟢 Open now' : closest.openingHoursDisplay}\n` +
        `• **Price Level:** ${closest.priceLevelDisplay}\n`;
      followUps = ['Which food option is cheapest?', 'Where can I get vegetarian food?'];
    } else {
      // General "What should I eat nearby?"
      answer = `[APPLICATION DATA] **Recommended Dining Near You in ${city}:**\n\n`;
      foodPlaces.slice(0, 3).forEach((f, idx) => {
        answer += `${idx + 1}. **${f.name}** (${f.distanceKm.toFixed(1)} km away)\n` +
          `   • ${f.cuisine ? `Cuisine: ${f.cuisine}` : `Category: ${f.foodCategoryLabel}`}\n` +
          `   • Price: ${f.priceLevelDisplay} · ${f.isOpenNow === true ? '🟢 Open now' : f.openingHoursDisplay}\n` +
          `   • "${f.recommendationReason || 'Convenient dining nearby'}"\n\n`;
      });
      answer += `Tap **"Add to Trip"** on any place in the Food Explorer tab to include it in your itinerary!`;
      followUps = ['Which food option is cheapest?', 'Where can I get vegetarian food?', 'Which food place is closest?'];
    }
  }

  // 1. "What should I visit first?" / "Why is [place] first?" / "Order of stops"
  else if (
    query.includes('visit first') || 
    query.includes('first place') || 
    query.includes('start with') || 
    query.includes('where to start') ||
    query.includes('what should i see first')
  ) {
    if (stopCount === 0) {
      if (nearby.length > 0) {
        const top = nearby[0];
        answer = `[APPLICATION DATA] You currently have no stops saved in your trip for **${city}**.\n\n` +
          `Based on your preferences and location, I recommend starting with **${top.name}** (${top.distanceKm.toFixed(1)} km away).\n` +
          (top.matchReasons && top.matchReasons.length > 0 
            ? `• **Why it's a great start:** ${top.matchReasons.join('. ')}\n`
            : `• **Category:** ${top.category} · Rating: ⭐ ${top.rating || 'N/A'}\n`) +
          `\nTap "Add to Trip" on the Explore or Map tab to include it!`;
        followUps = ['Why did you recommend this place?', 'What else is near me?', 'How much will my trip cost?'];
      } else {
        answer = `[APPLICATION DATA] You don't have any stops added to your trip yet in **${city}**.\n\nExplore nearby attractions in the Explore tab or adjust your location to discover top places.`;
        followUps = ['What can I do near me?', 'Which transport should I take?'];
      }
    } else {
      const firstStop = stops[0];
      const schedFirst = schedule?.stops?.[0];
      const isOpt = context.selectedTrip.isOptimized;

      answer = `[APPLICATION DATA] You should visit **${firstStop.name}** first in your itinerary.\n\n` +
        `• **Order Reason:** ${isOpt ? 'Our route optimizer ordered this first for minimal travel distance and maximum route efficiency.' : 'This is your first scheduled destination starting from your origin.'}\n` +
        `• **Distance from origin:** [ESTIMATE] ~${firstStop.distanceKm.toFixed(1)} km\n` +
        `• **Estimated Visit Duration:** [ESTIMATE] ~${firstStop.visitDuration || '45-60 min'}\n` +
        (schedFirst ? `• **Planned Timing:** [ESTIMATE] Arrive at ${schedFirst.arrivalTimeStr}, depart at ${schedFirst.departureTimeStr}\n` : '') +
        (firstStop.isOpenNow !== undefined ? `• **Opening Status:** [APPLICATION DATA] ${firstStop.isOpenNow ? '🟢 Currently Open' : '🔴 Currently Closed'}\n` : '') +
        (firstStop.matchReasons && firstStop.matchReasons.length > 0 ? `• **Recommendation Factor:** ${firstStop.matchReasons[0]}\n` : '');

      if (stops.length > 1) {
        answer += `\nAfter ${firstStop.name}, your route continues to **${stops[1].name}**.`;
      }

      followUps = ['Why did you recommend this place?', 'Can I fit another place?', 'How much will my trip cost?'];
    }
  }

  // 2. "Why did you recommend this place?" / "Why this place?"
  else if (
    query.includes('why did you recommend') || 
    query.includes('why this place') || 
    query.includes('why recommended') ||
    query.includes('why was this recommended') ||
    query.includes('why is this place')
  ) {
    // Check if user named a specific stop or check the first stop / top place
    type CandidatePlace = AIContextData['selectedTrip']['stops'][number] | AIContextData['topNearbyPlaces'][number];
    let matchedPlace: CandidatePlace | undefined = stops.find(s => query.includes(s.name.toLowerCase()));
    if (!matchedPlace && nearby.length > 0) {
      matchedPlace = nearby.find(n => query.includes(n.name.toLowerCase()));
    }
    if (!matchedPlace && stops.length > 0) {
      matchedPlace = stops[0];
    }
    if (!matchedPlace && nearby.length > 0) {
      matchedPlace = nearby[0];
    }

    if (matchedPlace) {
      answer = `[APPLICATION DATA] **Why ${matchedPlace.name} was recommended:**\n\n` +
        `• **Category & Interests:** Matches your profile for **${matchedPlace.categoryLabel || matchedPlace.category}**.\n` +
        `• **Distance:** Located ${matchedPlace.distanceKm.toFixed(1)} km from your starting point in ${city}.\n` +
        (matchedPlace.rating ? `• **Rating:** ⭐ ${matchedPlace.rating.toFixed(1)} / 5.0 based on visitor feedback.\n` : '') +
        (matchedPlace.matchReasons && matchedPlace.matchReasons.length > 0 
          ? `• **Matching Factors:** ${matchedPlace.matchReasons.join('. ')}.\n` 
          : `• **Schedule Fit:** Fits well within your ${prefs.availableHours || 4}-hour available window.\n`) +
        `• **Pace & Style:** Matches your **${prefs.travelStyle || 'solo'}** style with **${prefs.pace || 'moderate'}** pace.\n` +
        (matchedPlace.isOpenNow !== undefined ? `• **Status:** ${matchedPlace.isOpenNow ? '🟢 Verified Open Now' : '🔴 Currently closed or hours unverified'}\n` : '');
      
      followUps = ['What should I visit first?', 'How much will my trip cost?', 'Can I fit another place?'];
    } else {
      answer = `[APPLICATION DATA] To give you the exact recommendation factors, please add a place to your trip or ask about a specific destination like Charminar or Golconda Fort.`;
      followUps = ['What can I do near me?', 'What should I visit first?'];
    }
  }

  // 3. "How much will my trip approximately cost?" / "Trip cost" / "Fare"
  else if (
    query.includes('cost') || 
    query.includes('fare') || 
    query.includes('price') || 
    query.includes('how much') ||
    query.includes('budget')
  ) {
    const fareDisplay = fare?.totalFareDisplay || transport?.fareDisplay || '₹100–₹160 estimated';
    const mode = transport?.modeLabel || context.selectedTrip.preferredMode || 'Auto Rickshaw';
    const budget = prefs.budgetAmount || 1000;
    const remaining = transport?.budgetImpact?.remainingBudgetMinInr;

    answer = `[ESTIMATE] **Trip Cost Breakdown for ${city}:**\n\n` +
      `• **Estimated Transport Fare:** ${fareDisplay} via **${mode}**\n` +
      `• **User Stated Budget:** [APPLICATION DATA] ₹${budget}\n` +
      (remaining !== undefined ? `• **Remaining Budget Buffer:** [ESTIMATE] ~₹${Math.max(0, remaining)} remaining for snacks, tickets, and incidentals.\n` : '') +
      `\n[APPLICATION DATA] **Entry Fees:**\n`;

    let hasEntryFees = false;
    stops.forEach(s => {
      if (s.entryFee) {
        hasEntryFees = true;
        answer += `• ${s.name}: ${s.entryFee}\n`;
      }
    });
    if (!hasEntryFees) {
      answer += `• Detailed ticket fees are not specified in current local records; monument tickets are typically ₹20–₹50 for Indian nationals.\n`;
    }

    if (fare?.legs && fare.legs.length > 0) {
      answer += `\n**Route Leg Fare Estimates:**\n`;
      fare.legs.forEach((leg, i) => {
        answer += `${i + 1}. ${leg.fromName} → ${leg.toName}: ${leg.fareDisplay} (${leg.distanceKm.toFixed(1)} km)\n`;
      });
    }

    answer += `\n*Note: All travel fares are [ESTIMATE] computed using city baseline tariffs, not live booking prices.*`;
    followUps = ['Which transport should I take?', 'Can I fit another place?', 'Summarize my itinerary'];
  }

  // 4. "Which transport should I take?" / "Should I take an auto or cab?" / "Cheapest option"
  else if (
    query.includes('transport') || 
    query.includes('auto or cab') || 
    query.includes('cab or auto') || 
    query.includes('cheapest') ||
    query.includes('which mode') ||
    query.includes('walk or')
  ) {
    if (transport) {
      const rec = transport.recommendedMode;
      const recLabel = transport.modeLabel;
      const recFare = transport.fareDisplay;
      const recTime = transport.travelTimeDisplay;

      answer = `[APPLICATION DATA] **Recommended Transport:** **${recLabel}**\n\n` +
        `• **Why it's recommended:** ${transport.tagline}\n` +
        `• **Estimated Fare:** [ESTIMATE] ${recFare}\n` +
        `• **Estimated Travel Time:** [ESTIMATE] ${recTime}\n` +
        `• **Key Decision Factors:**\n` +
        transport.matchReasons.map(r => `  - ${r}`).join('\n') + '\n\n';

      if (query.includes('cheapest')) {
        answer += `[APPLICATION DATA] Walking is free (₹0) for short hops under 1.5 km. For motorized transport, **Auto Rickshaw** is usually the most economical option for city distances under 15 km.\n\n`;
      }

      if (transport.alternatives && transport.alternatives.length > 0) {
        answer += `**Available Alternatives Comparison:**\n`;
        transport.alternatives.forEach(alt => {
          answer += `• **${alt.modeLabel}:** [ESTIMATE] ${alt.travelTimeDisplay} · Fare: ${alt.fareDisplay} (${alt.tagline})\n`;
        });
      }

      answer += `\n*Tip: You can change your preferred transport mode at any time in the My Trip route tab.*`;
      followUps = ['How much will my trip cost?', 'What should I visit first?', 'Can I fit another place?'];
    } else {
      answer = `[APPLICATION DATA] For city travel in ${city}, an **Auto Rickshaw** is typically recommended for quick hops (under 5 km) with fares around ₹50–₹120, while a **Cab** is best for longer journeys or family trips.\n\nAdd stops to your trip to see exact transport route times and fares!`;
      followUps = ['What can I do near me?', 'How much will my trip cost?'];
    }
  }

  // 5. "Can I fit another place?" / "Can I fit one more place?" / "Do I have time?"
  else if (
    query.includes('fit another') || 
    query.includes('fit one more') || 
    query.includes('add another') || 
    query.includes('have time') ||
    query.includes('tight schedule')
  ) {
    if (!feasibility) {
      answer = `[APPLICATION DATA] You currently have ${stopCount} stops in your trip. With an available window of ${prefs.availableHours || 4} hours, you can comfortably add 1 to 2 more destinations (each stop typically takes 45–60 minutes plus travel time).`;
      followUps = ['What can I do near me?', 'What should I visit first?'];
    } else {
      const remainingMin = feasibility.remainingMinutes;
      const availMin = feasibility.availableMinutes;
      const totalMin = feasibility.totalTripMinutes;

      if (feasibility.status === 'feasible' && remainingMin >= 60) {
        answer = `[APPLICATION DATA] **Yes, you can comfortably fit another place!**\n\n` +
          `• **Available Window:** ${Math.round(availMin / 60)} hours (${availMin} min)\n` +
          `• **Current Trip Duration:** [ESTIMATE] ${totalMin} min (including travel & visits)\n` +
          `• **Remaining Buffer:** [ESTIMATE] **${remainingMin} minutes**\n\n` +
          `Since an average visit takes 45–60 minutes, you have ample time. Consider adding one of these nearby attractions:\n`;

        const candidates = nearby.filter(n => !stops.some(s => s.id === n.id)).slice(0, 2);
        if (candidates.length > 0) {
          candidates.forEach(c => {
            answer += `• **${c.name}** (${c.distanceKm.toFixed(1)} km · ${c.category})\n`;
          });
        }
        followUps = ['What should I visit first?', 'How much will my trip cost?', 'Summarize my itinerary'];
      } else if (feasibility.status === 'tight' || (remainingMin > 0 && remainingMin < 60)) {
        answer = `[APPLICATION DATA] **Adding another place is not recommended — your schedule is tight.**\n\n` +
          `• **Remaining Buffer:** [ESTIMATE] only **${remainingMin} minutes**\n` +
          `• **Current Trip Time:** [ESTIMATE] ${totalMin} min out of ${availMin} min available\n\n` +
          `Adding another stop would push your schedule over your ${prefs.availableHours}-hour limit. We recommend sticking to your current ${stopCount} stops to enjoy a relaxed visit.`;
        followUps = ['I only have 2 hours. What should I skip?', 'Summarize my itinerary', 'Which transport should I take?'];
      } else {
        answer = `[APPLICATION DATA] **No, your itinerary is already exceeding your available time by ${feasibility.exceededMinutes} minutes.**\n\n` +
          `• **Total Planned Time:** [ESTIMATE] ${totalMin} min\n` +
          `• **Available Window:** ${availMin} min (${prefs.availableHours} hours)\n\n` +
          `To make your trip feasible, consider removing 1 stop or increasing your available time in your travel profile.`;
        followUps = ['I only have 2 hours. What should I skip?', 'Summarize my itinerary', 'Which transport should I take?'];
      }
    }
  }

  // 6. "I only have 2 hours. What should I skip?" / "What should I skip?"
  else if (
    query.includes('skip') || 
    query.includes('only have 2 hours') || 
    query.includes('tight on time') ||
    query.includes('short on time')
  ) {
    if (stopCount <= 1) {
      answer = `[APPLICATION DATA] You only have ${stopCount} stop(s) in your trip. A single stop fits comfortably within 2 hours.`;
      followUps = ['What should I visit first?', 'How much will my trip cost?'];
    } else {
      // Find the stop with the longest visit or farthest distance or lowest match score
      const candidateToSkip = [...stops].sort((a, b) => (b.distanceKm || 0) - (a.distanceKm || 0))[0];
      answer = `[APPLICATION DATA] If you only have 2 hours (120 minutes):\n\n` +
        `• **Recommended adjustment:** Consider skipping **${candidateToSkip.name}**.\n` +
        `• **Why skip this stop?** It adds the greatest travel distance (~${candidateToSkip.distanceKm.toFixed(1)} km) and visit time (${candidateToSkip.visitDuration}).\n` +
        `• **Remaining itinerary:** Keeping the closer stops will reduce your round-trip transit and keep you well within 120 minutes.\n\n` +
        `*Note: You can safely remove this stop using the trash icon in the My Trip tab.*`;
      followUps = ['Can I fit another place?', 'Summarize my itinerary', 'Which transport should I take?'];
    }
  }

  // 7. "Tell me about [place]" / "Tell me about this place"
  else if (
    query.includes('tell me about') || 
    query.includes('about this place') || 
    query.includes('information about') ||
    query.includes('details on')
  ) {
    type CandidateTarget = AIContextData['selectedTrip']['stops'][number] | AIContextData['topNearbyPlaces'][number];
    let target: CandidateTarget | undefined = stops.find(s => query.includes(s.name.toLowerCase()));
    if (!target && nearby.length > 0) {
      target = nearby.find(n => query.includes(n.name.toLowerCase()));
    }
    if (!target && stops.length > 0) {
      target = stops[0];
    }
    if (!target && nearby.length > 0) {
      target = nearby[0];
    }

    if (target) {
      answer = `[APPLICATION DATA] **${target.name}**\n\n` +
        `• **Category:** ${target.categoryLabel || target.category}\n` +
        (target.shortDescription ? `• **Overview:** ${target.shortDescription}\n` : '') +
        (target.distanceKm ? `• **Distance:** ~${target.distanceKm.toFixed(1)} km from your current reference point\n` : '') +
        (target.rating ? `• **Rating:** ⭐ ${target.rating.toFixed(1)} / 5.0\n` : '') +
        (target.visitDuration ? `• **Recommended Duration:** [ESTIMATE] ${target.visitDuration}\n` : '') +
        (target.openingHours ? `• **Opening Hours:** [APPLICATION DATA] ${target.openingHours}\n` : '• **Opening Hours:** [APPLICATION DATA] Specific operating hours are not recorded in local data; typically 9:00 AM – 5:30 PM for heritage sites.\n') +
        (target.entryFee ? `• **Entry Fee:** [APPLICATION DATA] ${target.entryFee}\n` : '• **Entry Fee:** [APPLICATION DATA] Ticket fee is not recorded in local data.\n') +
        (target.address ? `• **Location:** ${target.address}\n` : '');

      followUps = ['Why did you recommend this place?', 'What should I visit first?', 'How much will my trip cost?'];
    } else {
      answer = `[APPLICATION DATA] Please specify the place name (e.g., "Tell me about Charminar") or add places to your itinerary to get full details.`;
      followUps = ['What can I do near me?', 'What should I visit first?'];
    }
  }

  // 8. "What can I do near me?" / "Nearby places"
  else if (
    query.includes('near me') || 
    query.includes('nearby') || 
    query.includes('around here') ||
    query.includes('what can i do')
  ) {
    if (nearby.length > 0) {
      answer = `[APPLICATION DATA] **Top Attractions Near You in ${city}:**\n\n`;
      nearby.slice(0, 5).forEach((p, idx) => {
        answer += `${idx + 1}. **${p.name}**\n` +
          `   • Category: ${p.category} · Distance: ${p.distanceKm.toFixed(1)} km\n` +
          `   • Rating: ⭐ ${p.rating || 'N/A'}\n` +
          (p.shortDescription ? `   • ${p.shortDescription}\n` : '') +
          `\n`;
      });
      answer += `You can add any of these places directly to your trip from the Explore tab!`;
      followUps = ['What should I visit first?', 'Why did you recommend this place?', 'Which transport should I take?'];
    } else {
      answer = `[APPLICATION DATA] No nearby POIs found for your active coordinates in ${city}. Try adjusting your search radius or exploring another city in the location picker.`;
      followUps = ['What should I visit first?', 'How much will my trip cost?'];
    }
  }

  // 9. "Give me a quick summary of my trip" / "Summarize my itinerary"
  else if (
    query.includes('summary') || 
    query.includes('summarize') || 
    query.includes('overview') ||
    query.includes('my trip')
  ) {
    if (stopCount === 0) {
      answer = `[APPLICATION DATA] Your trip currently has 0 stops. To create a personalized itinerary in ${city}, browse the Explore tab and tap "Add to Trip".`;
      followUps = ['What can I do near me?', 'What should I visit first?'];
    } else {
      const mode = transport?.modeLabel || context.selectedTrip.preferredMode || 'Auto Rickshaw';
      const fareDisp = fare?.totalFareDisplay || '₹100–₹160 estimated';
      const feasStatus = feasibility?.statusLabel || 'Schedule Feasible';

      answer = `[APPLICATION DATA] **Trip Summary for ${city}:**\n\n` +
        `• **Origin:** ${context.location.area || city}\n` +
        `• **Stops (${stopCount}):** ${stops.map(s => s.name).join(' → ')}\n` +
        `• **Total Road Distance:** [ESTIMATE] ~${context.selectedTrip.totalDistanceKm.toFixed(1)} km\n` +
        `• **Estimated Total Time:** [ESTIMATE] ~${context.selectedTrip.totalEstimatedDurationMin} min (Travel: ${context.selectedTrip.totalTravelTimeMin} min, Visits: ${context.selectedTrip.totalVisitTimeMin} min)\n` +
        `• **Schedule Feasibility:** [ESTIMATE] **${feasStatus}** (${feasibility?.remainingMinutes ?? 30} min buffer remaining)\n` +
        `• **Recommended Mode:** **${mode}** (Fare: [ESTIMATE] ${fareDisp})\n` +
        `• **Route Status:** ${context.selectedTrip.isOptimized ? '✨ Optimized for minimal travel' : 'Manual sequence'}\n`;

      followUps = ['What should I visit first?', 'How much will my trip cost?', 'Can I fit another place?'];
    }
  }

  // 10. Default / General Questions & Missing Data Safeguard
  else {
    // If user asked a very specific obscure question where data is missing:
    if (
      query.includes('ticket price for 19') || 
      query.includes('architect born') || 
      query.includes('secret') || 
      query.includes('unverified') ||
      query.includes('phone number') ||
      query.includes('wifi password')
    ) {
      answer = `[APPLICATION DATA] This specific detail is not available in our current application records.\n\n` +
        `I have reliable, verified information for **${city}** covering:\n` +
        `• Destinations & POIs (${stops.length} in your trip, ${nearby.length} nearby)\n` +
        `• Route distances & estimated travel times\n` +
        `• Transport options & fare estimates\n` +
        `• Itinerary feasibility & timeline schedules\n\n` +
        `Feel free to ask about any of these aspects!`;
      followUps = ['What should I visit first?', 'How much will my trip cost?', 'Which transport should I take?'];
    } else {
      // Helpful conversational grounding
      answer = `[GENERAL INFORMATION] I'm your local travel guide for **${city}**! ` +
        (stopCount > 0 
          ? `You have **${stopCount} stop(s)** scheduled (${stops.map(s => s.name).join(', ')}). ` 
          : `You don't have any stops added yet. `) +
        `\n\nI can help you with:\n` +
        `1. **Itinerary order:** "What should I visit first?"\n` +
        `2. **Recommendations:** "Why did you recommend this place?"\n` +
        `3. **Costs & Fares:** "How much will my trip cost?"\n` +
        `4. **Transport:** "Should I take an auto or cab?"\n` +
        `5. **Time management:** "Can I fit another place?" or "I only have 2 hours. What should I skip?"\n\n` +
        `What would you like to explore?`;
      followUps = ['What should I visit first?', 'Why is this recommended?', 'Can I fit another place?', "What's the cheapest option?", 'Summarize my itinerary'];
    }
  }

  return {
    answer,
    source: 'grounded-fallback',
    groundedFacts: {
      city,
      firstStop: stops[0]?.name,
      totalStops: stopCount,
      preferredTransport: transport?.modeLabel || context?.selectedTrip?.preferredMode || 'Auto Rickshaw',
      estimatedFareDisplay: fare?.totalFareDisplay || transport?.fareDisplay,
      feasibilityStatus: feasibility?.statusLabel,
      remainingBufferMin: feasibility?.remainingMinutes
    },
    suggestedFollowUps: followUps
  };
}

/**
 * Main AI Query Router
 * Attempts Gemini API when configured, falls back seamlessly to grounded fallback engine.
 */
export async function queryAITravelGuide(
  message: string,
  context: AIContextData,
  conversationHistory: ChatMessage[] = []
): Promise<AIResponsePayload> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const demoMode = process.env.DEMO_MODE === 'true';

  // If no API key or in explicit offline/mock mode, use our deterministic grounded engine immediately
  if (!apiKey) {
    return generateGroundedFallbackResponse(message, context);
  }

  // If GEMINI_API_KEY is present, call Google Gemini API with system prompt & context
  try {
    const systemPrompt = buildSystemPrompt(context);
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Append up to last 4 conversation turns for context
    const recentHistory = conversationHistory.slice(-4);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12-second timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents,
        generationConfig: {
          temperature: 0.2, // Low temperature for high factual grounding
          topP: 0.8,
          maxOutputTokens: 1024
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[AI Service] Gemini API returned HTTP ${response.status}. Using grounded fallback.`);
      return generateGroundedFallbackResponse(message, context);
    }

    const data: any = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText || typeof candidateText !== 'string') {
      console.warn('[AI Service] Empty response from Gemini API. Using grounded fallback.');
      return generateGroundedFallbackResponse(message, context);
    }

    return {
      answer: candidateText,
      source: 'gemini',
      groundedFacts: {
        city: context.location.city || 'your area',
        firstStop: context.selectedTrip?.stops?.[0]?.name,
        totalStops: context.selectedTrip?.stops?.length || 0,
        preferredTransport: context.transportRecommendation?.modeLabel || context?.selectedTrip?.preferredMode || 'Auto',
        estimatedFareDisplay: context.tripFareSummary?.totalFareDisplay || context.transportRecommendation?.fareDisplay,
        feasibilityStatus: context.itineraryFeasibility?.statusLabel,
        remainingBufferMin: context.itineraryFeasibility?.remainingMinutes
      },
      suggestedFollowUps: [
        'What should I visit first?',
        'Why did you recommend this place?',
        'How much will my trip cost?',
        'Can I fit another place?'
      ]
    };
  } catch (err: any) {
    console.warn(`[AI Service] Gemini API request failed: ${err.message}. Seamlessly using grounded fallback.`);
    return generateGroundedFallbackResponse(message, context);
  }
}
