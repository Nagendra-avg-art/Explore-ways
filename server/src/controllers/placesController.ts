// server/src/controllers/placesController.ts
// Lean HTTP controller delegating place and food discovery to dedicated services

import { Request, Response } from 'express';
import { BackendPlace, BackendFoodPlace, FoodCategory, FoodPriceLevel } from '../types/places.js';
import { PLACES_DATA } from '../data/demo/demoPlaces.js';
import { DEMO_FOOD_PLACES } from '../data/demo/demoFoodPlaces.js';
import { calculateHaversineDistanceKm, checkIsOpenNow } from '../utils/geoUtils.js';
import { discoverNearbyPlaces } from '../services/placesService.js';
import { discoverNearbyFoodPlaces } from '../services/foodService.js';

// Backward-compatible re-exports
export {
  PLACES_DATA,
  DEMO_FOOD_PLACES,
  BackendPlace,
  BackendFoodPlace,
  FoodCategory,
  FoodPriceLevel,
  calculateHaversineDistanceKm,
  checkIsOpenNow
};

/**
 * GET /api/places
 * Query options: category, search, maxDistance, minRating, openNow, sortBy, lat, lon
 */
export const getPlaces = async (req: Request, res: Response) => {
  const { 
    category, 
    search, 
    maxDistance, 
    minRating, 
    openNow, 
    sortBy, 
    lat, 
    lon 
  } = req.query;

  const userLat = lat ? parseFloat(lat as string) : 17.3616;
  const userLon = lon ? parseFloat(lon as string) : 78.4747;

  let results = PLACES_DATA.map((p) => {
    const distanceKm = calculateHaversineDistanceKm(userLat, userLon, p.lat, p.lon);
    const isOpen = checkIsOpenNow(p);
    const travelTimeMin = Math.max(5, Math.round(distanceKm * 2.5 + 4));

    return {
      ...p,
      distanceKm,
      travelTimeMin,
      isOpenNow: isOpen
    };
  });

  // Filter: Category
  if (category && category !== 'all') {
    results = results.filter((p) => p.category === category);
  }

  // Filter: Search Keyword
  if (search) {
    const q = (search as string).trim().toLowerCase();
    results = results.filter((p) => 
      p.name.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Filter: Minimum Rating
  if (minRating) {
    const ratingThreshold = parseFloat(minRating as string);
    if (!isNaN(ratingThreshold)) {
      results = results.filter((p) => p.rating !== undefined && p.rating >= ratingThreshold);
    }
  }

  // Filter: Maximum Distance Radius
  if (maxDistance) {
    const maxDist = parseFloat(maxDistance as string);
    if (!isNaN(maxDist) && maxDist > 0) {
      results = results.filter((p) => p.distanceKm <= maxDist);
    }
  }

  // Filter: Open Now
  if (openNow === 'true') {
    results = results.filter((p) => p.isOpenNow === true);
  }

  // Sorting
  if (sortBy === 'distance') {
    results.sort((a, b) => a.distanceKm - b.distanceKm);
  } else if (sortBy === 'rating') {
    results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return res.status(200).json({
    success: true,
    total: results.length,
    origin: { lat: userLat, lon: userLon },
    places: results
  });
};

/**
 * GET /api/places/:id
 */
export const getPlaceById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const place = PLACES_DATA.find((p) => p.id === id);

  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }

  const { lat, lon } = req.query;
  const userLat = lat ? parseFloat(lat as string) : 17.3616;
  const userLon = lon ? parseFloat(lon as string) : 78.4747;

  const distanceKm = calculateHaversineDistanceKm(userLat, userLon, place.lat, place.lon);
  const isOpen = checkIsOpenNow(place);

  return res.status(200).json({
    success: true,
    place: {
      ...place,
      distanceKm,
      travelTimeMin: Math.max(5, Math.round(distanceKm * 2.5 + 4)),
      isOpenNow: isOpen
    }
  });
};

/**
 * GET /api/places/nearby
 * Real Location-Aware Nearby POI Discovery
 */
export const getNearbyPlaces = async (req: Request, res: Response) => {
  const { lat, lon, radius, category } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const userLat = parseFloat(lat as string);
  const userLon = parseFloat(lon as string);

  if (isNaN(userLat) || isNaN(userLon)) {
    return res.status(400).json({ error: 'Invalid numeric coordinates' });
  }

  const radiusMeters = radius ? parseInt(radius as string, 10) : 6000;
  const result = await discoverNearbyPlaces(userLat, userLon, radiusMeters, category as string);

  return res.status(200).json(result);
};

/**
 * GET /api/places/food
 * Location-Aware Food Explorer POI Discovery
 */
export const getNearbyFoodPlaces = async (req: Request, res: Response) => {
  const rawLat = (req.query.lat || req.query.latitude) as string | undefined;
  const rawLon = (req.query.lon || req.query.lng || req.query.longitude) as string | undefined;
  const { radius, category, openNow } = req.query;

  if (!rawLat || !rawLon) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const userLat = parseFloat(rawLat);
  const userLon = parseFloat(rawLon);

  if (isNaN(userLat) || isNaN(userLon)) {
    return res.status(400).json({ error: 'Invalid numeric coordinates' });
  }

  const searchRadius = Math.min(15000, Math.max(1000, radius ? parseInt(radius as string, 10) : 5000));
  const categoryFilter = (category as string) || 'all';
  const isOpenNowFilter = openNow === 'true';

  const result = await discoverNearbyFoodPlaces(
    userLat,
    userLon,
    searchRadius,
    categoryFilter,
    isOpenNowFilter
  );

  return res.status(200).json(result);
};
