// server/src/controllers/placesController.ts
// Lean HTTP controller delegating place and food discovery to dedicated services

import { Request, Response } from 'express';
import { BackendPlace, BackendFoodPlace, FoodCategory, FoodPriceLevel } from '../types/places.js';
import { PLACES_DATA } from '../data/demo/demoPlaces.js';
import { CURATED_PLACES } from '../data/curated/curatedPlaces.js';
import { DEMO_FOOD_PLACES } from '../data/demo/demoFoodPlaces.js';
import { calculateHaversineDistanceKm, checkIsOpenNow } from '../utils/geoUtils.js';
import { discoverNearbyPlaces } from '../services/placesService.js';
import { discoverNearbyFoodPlaces } from '../services/foodService.js';
import { lookupVerifiedPlacePhotoMetadata } from '../services/imageService.js';

// Backward-compatible re-exports
export {
  PLACES_DATA,
  CURATED_PLACES,
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

  const hasLat = lat !== undefined && lat !== '';
  const hasLon = lon !== undefined && lon !== '';

  if (hasLat || hasLon) {
    if (!hasLat || !hasLon) {
      return res.status(400).json({ error: 'Both latitude and longitude are required when filtering by location' });
    }
    const parsedLat = parseFloat(lat as string);
    const parsedLon = parseFloat(lon as string);
    if (isNaN(parsedLat) || isNaN(parsedLon) || parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
      return res.status(400).json({ error: 'Invalid numeric coordinates: lat must be between -90 and 90, lon between -180 and 180' });
    }
  }

  const hasExplicitCoords = hasLat && hasLon;
  const userLat = hasExplicitCoords ? parseFloat(lat as string) : 17.3616;
  const userLon = hasExplicitCoords ? parseFloat(lon as string) : 78.4747;
  const searchRadius = maxDistance ? Math.min(25000, parseFloat(maxDistance as string) * 1000) : 12000;

  // Use the unified place discovery engine
  const discoveryResult = await discoverNearbyPlaces(userLat, userLon, searchRadius, category as string);
  let results: BackendPlace[] = discoveryResult.places || [];

  // Filter: Search Keyword
  if (search) {
    const q = (search as string).trim().toLowerCase();
    results = results.filter((p) => 
      p.name.toLowerCase().includes(q) ||
      (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
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
      results = results.filter((p) => p.distanceKm !== undefined && p.distanceKm <= maxDist);
    }
  }

  // Filter: Open Now
  if (openNow === 'true') {
    results = results.filter((p) => p.isOpenNow === true);
  }

  // Sorting
  if (sortBy === 'distance') {
    results.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  } else if (sortBy === 'rating') {
    results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return res.status(200).json({
    success: true,
    total: results.length,
    origin: { lat: userLat, lon: userLon },
    source: discoveryResult.source,
    sourceName: discoveryResult.sourceName,
    isLive: discoveryResult.isLive,
    places: results
  });
};

/**
 * GET /api/places/:id
 */
export const getPlaceById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const place = CURATED_PLACES.find((p) => p.id === id) || PLACES_DATA.find((p) => p.id === id);

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

  if (isNaN(userLat) || isNaN(userLon) || userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
    return res.status(400).json({ error: 'Invalid numeric coordinates: lat must be between -90 and 90, lon between -180 and 180' });
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

  if (isNaN(userLat) || isNaN(userLon) || userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
    return res.status(400).json({ error: 'Invalid numeric coordinates: lat must be between -90 and 90, lon between -180 and 180' });
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

/**
 * GET /api/places/photo
 * On-demand verified landmark photography lookup with full metadata & attribution
 */
export const getPlacePhoto = async (req: Request, res: Response) => {
  const { name, lat, lon } = req.query;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Place name is required' });
  }

  const userLat = lat ? parseFloat(lat as string) : undefined;
  const userLon = lon ? parseFloat(lon as string) : undefined;

  const photoMeta = await lookupVerifiedPlacePhotoMetadata(name, userLat, userLon);

  return res.status(200).json({
    success: true,
    name,
    imageUrl: photoMeta?.photoUrl || null,
    photo: photoMeta || null,
    hasPhoto: Boolean(photoMeta?.photoUrl)
  });
};
