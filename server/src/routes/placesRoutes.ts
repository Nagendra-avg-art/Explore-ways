import { Router } from 'express';
import { getPlaces, getPlaceById } from '../controllers/placesController.js';

const router = Router();

// GET /api/places
router.get('/', getPlaces);

// GET /api/places/:id
router.get('/:id', getPlaceById);

export default router;
