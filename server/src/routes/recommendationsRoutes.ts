import { Router } from 'express';
import { getRecommendations } from '../controllers/recommendationsController.js';

const router = Router();

// GET /api/recommendations
router.get('/', getRecommendations);

export default router;
