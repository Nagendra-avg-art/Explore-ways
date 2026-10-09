import { Router } from 'express';
import { getWeather } from '../controllers/weatherController.js';

const router = Router();

// GET /api/weather?lat=...&lon=...&city=...&refresh=...
router.get('/', getWeather);
router.get('/current', getWeather);

export default router;
