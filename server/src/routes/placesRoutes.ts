import { Router } from 'express';
import { getPlaces, getPlaceById, getNearbyPlaces } from '../controllers/placesController.js';

const router = Router();

// GET /api/places/nearby - Real OpenStreetMap Nearby POI discovery
router.get('/nearby', getNearbyPlaces);

// GET /api/places
router.get('/', getPlaces);

// GET /api/places/:id
router.get('/:id', getPlaceById);

export default router;
