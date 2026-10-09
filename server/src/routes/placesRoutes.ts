import { Router } from 'express';
import { getPlaces, getPlaceById, getNearbyPlaces, getNearbyFoodPlaces, getPlacePhoto } from '../controllers/placesController.js';

const router = Router();

// GET /api/places/photo - Verified landmark photography lookup
router.get('/photo', getPlacePhoto);

// GET /api/places/nearby - Real OpenStreetMap Nearby POI discovery
router.get('/nearby', getNearbyPlaces);

// GET /api/places/food - Real Location-Aware Food Explorer POI Discovery
router.get('/food', getNearbyFoodPlaces);

// GET /api/places
router.get('/', getPlaces);

// GET /api/places/:id
router.get('/:id', getPlaceById);

export default router;
