import { Router } from 'express';
import { reverseGeocode, searchLocations } from '../controllers/locationController.js';

const router = Router();

// GET /api/location/reverse?lat=...&lon=...
router.get('/reverse', reverseGeocode);

// GET /api/location/search?q=...
router.get('/search', searchLocations);

export default router;
