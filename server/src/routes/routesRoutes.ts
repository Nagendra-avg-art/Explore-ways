import { Router } from 'express';
import { getDirections } from '../controllers/routesController';

const router = Router();

// GET /api/routes/directions?coordinates=lon1,lat1;lon2,lat2&mode=driving
router.get('/directions', getDirections);

export default router;
