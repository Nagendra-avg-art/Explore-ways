import { 
  WeatherData, 
  HourlyForecastItem, 
  WeatherTripImpact, 
  WeatherImpactItem, 
  WeatherImpactSeverity, 
  PlaceOutdoorClassification 
} from '../types/weather.js';

/**
 * Classifies a place as 'outdoor', 'indoor', or 'mixed' based on category and tags.
 */
export function classifyPlaceEnvironment(place: { category?: string; name?: string; tags?: string[] }): PlaceOutdoorClassification {
  const cat = (place.category || '').toLowerCase();
  const name = (place.name || '').toLowerCase();
  const tags = (place.tags || []).map((t) => t.toLowerCase());
  const allText = `${name} ${tags.join(' ')}`;

  // 1. Definite Outdoor patterns
  if (cat === 'nature' || cat === 'photography') {
    return 'outdoor';
  }
  if (
    allText.includes('park') ||
    allText.includes('garden') ||
    allText.includes('beach') ||
    allText.includes('lake') ||
    allText.includes('viewpoint') ||
    allText.includes('waterfall') ||
    allText.includes('hill') ||
    allText.includes('outdoor') ||
    allText.includes('sanctuary') ||
    allText.includes('zoo')
  ) {
    return 'outdoor';
  }

  // 2. Definite Indoor patterns
  if (cat === 'shopping' || cat === 'cafes' || cat === 'food') {
    return 'indoor';
  }
  if (
    allText.includes('museum') ||
    allText.includes('mall') ||
    allText.includes('restaurant') ||
    allText.includes('cafe') ||
    allText.includes('indoor') ||
    allText.includes('gallery') ||
    allText.includes('theater') ||
    allText.includes('cinema')
  ) {
    return 'indoor';
  }

  // 3. Mixed / ambiguous patterns
  return 'mixed';
}

/**
 * Finds the closest hourly forecast item for a given time string (e.g. "13:30").
 */
export function findForecastForTime(
  hourlyForecast: HourlyForecastItem[],
  timeStr?: string
): HourlyForecastItem | null {
  if (!hourlyForecast || hourlyForecast.length === 0) return null;
  if (!timeStr) return hourlyForecast[0];

  const match = timeStr.match(/^(\d{1,2}):/);
  if (!match) return hourlyForecast[0];

  const hour = parseInt(match[1], 10);
  const found = hourlyForecast.find((h) => h.hour === hour);
  return found || hourlyForecast[0];
}

/**
 * Deterministic Weather Impact Engine for backend API and trip analysis.
 */
export function calculateWeatherTripImpact(
  weather: WeatherData | null,
  stops: any[],
  schedule?: any,
  activeTransport: string = 'auto',
  legs: any[] = []
): WeatherTripImpact {
  if (!weather || stops.length === 0) {
    return {
      overallSeverity: 'LOW',
      hasWeatherAlert: false,
      summary: weather 
        ? `${weather.current.condition}, ${weather.current.temperature}°C. Favorable conditions for your planned trip.`
        : 'Weather forecast is currently unavailable.',
      impactItems: [],
      travelWindowForecast: weather?.hourlyForecast?.slice(0, 8) || [],
      isAlternativeOrderDifferent: false,
    };
  }

  const impactItems: WeatherImpactItem[] = [];
  const hourly = weather.hourlyForecast || [];
  let highestSeverityRank = 0; // 0=LOW, 1=MODERATE, 2=HIGH, 3=SEVERE

  // 1. Evaluate impact on each scheduled stop
  stops.forEach((stop, index) => {
    const scheduledStop = schedule?.stops?.[index];
    const arrivalTime = scheduledStop?.arrivalTimeStr || '09:00';
    const departureTime = scheduledStop?.departureTimeStr || '10:00';
    const timeWindowStr = `${arrivalTime}–${departureTime}`;
    const forecast = findForecastForTime(hourly, arrivalTime);

    if (!forecast) return;

    const env = classifyPlaceEnvironment(stop);
    const rainProb = forecast.precipitationProbability;
    const isRainCondition = forecast.conditionType === 'rain' || 
                            forecast.conditionType === 'heavy_rain' || 
                            forecast.conditionType === 'thunderstorm';
    const isHighRain = rainProb >= 50 || isRainCondition;
    const isModerateRain = (rainProb >= 35 && rainProb < 50) || forecast.conditionType === 'drizzle';
    const isSevere = forecast.conditionType === 'thunderstorm' || (isRainCondition && rainProb >= 80);
    const isHighTemp = forecast.temperature >= 35;

    // Rain impacts
    if (isSevere) {
      if (env === 'indoor') {
        impactItems.push({
          severity: 'LOW',
          type: 'RAIN',
          affectedStopId: stop.id,
          affectedStopName: stop.name,
          affectedTime: timeWindowStr,
          outdoorClassification: 'indoor',
          reason: `Severe rain or storm outside (~${rainProb}%), but ${stop.name} is a sheltered indoor venue.`,
          suggestion: `Enjoy your visit indoors at ${stop.name} without weather exposure.`,
        });
      } else {
        highestSeverityRank = Math.max(highestSeverityRank, 3);
        impactItems.push({
          severity: 'SEVERE',
          type: 'RAIN',
          affectedStopId: stop.id,
          affectedStopName: stop.name,
          affectedTime: timeWindowStr,
          outdoorClassification: env,
          reason: `Thunderstorm or severe rain expected (~${rainProb}%) during planned visit (${timeWindowStr}).`,
          suggestion: `Postpone outdoor visit to ${stop.name} or prioritize enclosed indoor activities.`,
        });
      }
    } else if (isHighRain) {
      if (env === 'outdoor') {
        highestSeverityRank = Math.max(highestSeverityRank, 2);
        impactItems.push({
          severity: 'HIGH',
          type: 'RAIN',
          affectedStopId: stop.id,
          affectedStopName: stop.name,
          affectedTime: timeWindowStr,
          outdoorClassification: 'outdoor',
          reason: `High rain probability (~${rainProb}%) during planned outdoor visit to ${stop.name} (${timeWindowStr}).`,
          suggestion: `Consider visiting ${stop.name} earlier before the rain, or carrying full rain protection.`,
        });
      } else if (env === 'mixed') {
        highestSeverityRank = Math.max(highestSeverityRank, 1);
        impactItems.push({
          severity: 'MODERATE',
          type: 'RAIN',
          affectedStopId: stop.id,
          affectedStopName: stop.name,
          affectedTime: timeWindowStr,
          outdoorClassification: 'mixed',
          reason: `Rain likely (~${rainProb}%) during your visit to ${stop.name} (${timeWindowStr}).`,
          suggestion: `Carry an umbrella for outer courtyards and prioritize indoor covered sections during showers.`,
        });
      } else {
        // Indoor place during rain
        impactItems.push({
          severity: 'LOW',
          type: 'RAIN',
          affectedStopId: stop.id,
          affectedStopName: stop.name,
          affectedTime: timeWindowStr,
          outdoorClassification: 'indoor',
          reason: `Rain expected (~${rainProb}%), but ${stop.name} is an indoor venue.`,
          suggestion: `Great shelter stop during rain. Enjoy your visit indoors without weather interruption.`,
        });
      }
    } else if (isModerateRain && env === 'outdoor') {
      highestSeverityRank = Math.max(highestSeverityRank, 1);
      impactItems.push({
        severity: 'MODERATE',
        type: 'RAIN',
        affectedStopId: stop.id,
        affectedStopName: stop.name,
        affectedTime: timeWindowStr,
        outdoorClassification: 'outdoor',
        reason: `Passing showers possible (~${rainProb}%) during outdoor stay at ${stop.name} (${timeWindowStr}).`,
        suggestion: `A light rain jacket or umbrella will keep your outdoor visit comfortable.`,
      });
    }

    // Heat impacts
    if (isHighTemp && (env === 'outdoor' || env === 'mixed')) {
      const heatRank = forecast.temperature >= 38 ? 2 : 1;
      highestSeverityRank = Math.max(highestSeverityRank, heatRank);
      impactItems.push({
        severity: forecast.temperature >= 38 ? 'HIGH' : 'MODERATE',
        type: 'HEAT',
        affectedStopId: stop.id,
        affectedStopName: stop.name,
        affectedTime: timeWindowStr,
        outdoorClassification: env,
        reason: `Afternoon temperature reaches ~${forecast.temperature}°C during visit (${timeWindowStr}).`,
        suggestion: `High heat during outdoor exposure. Stay hydrated, wear sunscreen, and take shade breaks.`,
      });
    }
  });

  // 2. Evaluate impact on Active Transport
  let alternativeTransportSuggestion: { fromMode: string; toMode: string; reason: string } | undefined;

  const totalWalkDistanceKm = legs.reduce((acc: number, l: any) => acc + (l.distanceKm || 0), 0);
  const startHourMatch = (schedule?.startTimeStr || schedule?.stops?.[0]?.arrivalTimeStr)?.match(/^(\d{1,2}):/);
  const startHour = startHourMatch ? parseInt(startHourMatch[1], 10) : 9;
  const tripHourly = hourly.filter((h) => h.hour >= startHour && h.hour <= startHour + 5);
  const travelForecast = tripHourly.length > 0 ? tripHourly : hourly.slice(0, 8);
  const anyRainInTrip = travelForecast.some(
    (h) => h.precipitationProbability >= 40 || h.conditionType === 'rain' || h.conditionType === 'heavy_rain' || h.conditionType === 'thunderstorm'
  );
  const maxTempInTrip = Math.max(...travelForecast.map((h) => h.temperature), weather.current.temperature);

  if (activeTransport === 'walk') {
    if (anyRainInTrip) {
      highestSeverityRank = Math.max(highestSeverityRank, 2);
      impactItems.push({
        severity: 'HIGH',
        type: 'RAIN',
        plannedTransportMode: 'walk',
        reason: 'Rain is forecast during your travel window while Walking is active.',
        suggestion: 'Walking may be uncomfortable in expected rain. Consider Cab for dry, enclosed travel.',
        suggestedAlternativeMode: 'cab',
      });
      alternativeTransportSuggestion = {
        fromMode: 'walk',
        toMode: 'cab',
        reason: 'Walking may be uncomfortable during expected rain; Cab provides weatherproof door-to-door comfort.',
      };
    } else if (maxTempInTrip >= 35 && (totalWalkDistanceKm >= 1.0 || legs.length > 0)) {
      highestSeverityRank = Math.max(highestSeverityRank, 1);
      impactItems.push({
        severity: 'MODERATE',
        type: 'HEAT',
        plannedTransportMode: 'walk',
        reason: `High temperature (~${maxTempInTrip}°C) during planned walking route.`,
        suggestion: 'Long walking in high afternoon heat can cause fatigue. Consider an Auto Rickshaw or Cab.',
        suggestedAlternativeMode: 'auto',
      });
      alternativeTransportSuggestion = {
        fromMode: 'walk',
        toMode: 'auto',
        reason: 'High temperature may make this walking leg uncomfortable; Auto provides quicker shaded transit.',
      };
    }
  } else if (activeTransport === 'auto') {
    const heavyRain = travelForecast.some((h) => h.conditionType === 'heavy_rain' || h.conditionType === 'thunderstorm');
    if (heavyRain) {
      highestSeverityRank = Math.max(highestSeverityRank, 1);
      impactItems.push({
        severity: 'MODERATE',
        type: 'RAIN',
        plannedTransportMode: 'auto',
        reason: 'Heavy rain or strong downpour may cause splashing in open auto rickshaws.',
        suggestion: 'Consider switching to an air-conditioned enclosed Cab if heavy rainfall starts.',
        suggestedAlternativeMode: 'cab',
      });
      alternativeTransportSuggestion = {
        fromMode: 'auto',
        toMode: 'cab',
        reason: 'Heavy downpour; Cab provides enclosed weatherproof comfort.',
      };
    }
  }

  // 3. Alternative itinerary order (Suggestion only — NEVER silent)
  let suggestedStopOrder: string[] | undefined;
  let suggestedStopNames: string[] | undefined;
  let isAlternativeOrderDifferent = false;

  if (stops.length >= 2) {
    const penalty = (p: any, hr: number): number => {
      const f = hourly.find((h) => h.hour === hr) || hourly[0];
      if (!f) return 0;
      const env = classifyPlaceEnvironment(p);
      const rain = f.precipitationProbability;
      if (env === 'outdoor') return rain * 2;
      if (env === 'mixed') return rain * 1;
      return rain * 0.1;
    };

    const currentTotalPenalty = stops.reduce((acc, p, idx) => {
      const hr = (startHour + idx * 2) % 24;
      return acc + penalty(p, hr);
    }, 0);

    const candidateStops = [...stops].sort((a, b) => {
      const pA = penalty(a, startHour);
      const pB = penalty(b, startHour);
      return pA - pB;
    });

    const candidateTotalPenalty = candidateStops.reduce((acc, p, idx) => {
      const hr = (startHour + idx * 2) % 24;
      return acc + penalty(p, hr);
    }, 0);

    const candidateIds = candidateStops.map((s) => s.id);
    const currentIds = stops.map((s) => s.id);
    const isDiff = candidateIds.some((id, idx) => id !== currentIds[idx]);

    if (isDiff && candidateTotalPenalty < currentTotalPenalty) {
      suggestedStopOrder = candidateIds;
      suggestedStopNames = candidateStops.map((s) => s.name);
      isAlternativeOrderDifferent = true;
    }
  }

  // Determine overall severity
  const severityMap: WeatherImpactSeverity[] = ['LOW', 'MODERATE', 'HIGH', 'SEVERE'];
  const overallSeverity = severityMap[highestSeverityRank];
  const hasWeatherAlert = highestSeverityRank >= 1;

  // Generate concise human-friendly summary
  let summary = '';
  if (overallSeverity === 'SEVERE') {
    summary = 'Severe weather or thunderstorm expected. Exercise caution and consider indoor venues.';
  } else if (overallSeverity === 'HIGH') {
    summary = anyRainInTrip
      ? 'Rain expected during planned outdoor or walking activities. Review weather suggestions below.'
      : 'High afternoon temperatures may impact outdoor activities.';
  } else if (overallSeverity === 'MODERATE') {
    summary = 'Moderate weather impact expected. Minor adjustments or weather gear recommended.';
  } else {
    summary = `${weather.current.condition}, ${weather.current.temperature}°C. Favorable conditions for your planned trip.`;
  }

  return {
    overallSeverity,
    hasWeatherAlert,
    summary,
    impactItems,
    travelWindowForecast: hourly.slice(0, 8),
    suggestedStopOrder,
    suggestedStopNames,
    alternativeTransportSuggestion,
    isAlternativeOrderDifferent,
  };
}

/**
 * Calculates a subtle weather suitability score modifier for place recommendation ranking.
 */
export function calculatePlaceWeatherSuitability(
  place: any,
  weather: WeatherData | null
): { scoreModifier: number; reason?: string } {
  if (!weather) return { scoreModifier: 0 };

  const env = classifyPlaceEnvironment(place);
  const currentRain = weather.current.precipitationProbability >= 45 || 
                      weather.current.conditionType === 'rain' ||
                      weather.current.conditionType === 'heavy_rain';
  const currentHeat = weather.current.temperature >= 36;

  if (currentRain) {
    if (env === 'indoor') {
      return { scoreModifier: 6, reason: 'Indoor venue protected from current rain' };
    }
    if (env === 'outdoor') {
      return { scoreModifier: -5, reason: 'Outdoor venue subject to wet conditions' };
    }
    return { scoreModifier: 0 };
  }

  if (currentHeat) {
    if (env === 'indoor') {
      return { scoreModifier: 4, reason: 'Air-conditioned indoor escape from afternoon heat' };
    }
    if (env === 'outdoor') {
      return { scoreModifier: -3, reason: 'High outdoor temperatures' };
    }
  }

  return { scoreModifier: 0 };
}
