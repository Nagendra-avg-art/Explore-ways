// server/src/utils/geoUtils.ts
// Mathematical geocoding helpers and operational hour validators

import { BackendPlace } from '../types/places.js';

/**
 * Haversine formula to compute great-circle distance in kilometers between two coordinates
 */
export function calculateHaversineDistanceKm(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth radius in km
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
 * Determine if a place is open based on current local hour and day
 */
export function checkIsOpenNow(place: BackendPlace): boolean | undefined {
  if (place.openHour === undefined || place.closeHour === undefined) {
    return undefined; // Operating hours not listed
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 is Sunday, 5 is Friday
  const currentHour = now.getHours() + now.getMinutes() / 60;

  if (place.closedDays && place.closedDays.includes(currentDay)) {
    return false;
  }

  return currentHour >= place.openHour && currentHour <= place.closeHour;
}
