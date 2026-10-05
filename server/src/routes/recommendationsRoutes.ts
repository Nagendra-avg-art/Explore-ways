import { Router } from 'express';
import { getRecommendations } from '../controllers/recommendationsController.js';

const router = Router();

// GET /api/recommendations and POST /api/recommendations
router.get('/', getRecommendations);
router.post('/', getRecommendations);

export default router;
