import { Router } from 'express';
import { handleAIChat, getAIStatus } from '../controllers/aiController.js';

const router = Router();

// GET /api/ai/status - Health and provider check
router.get('/status', getAIStatus);

// POST /api/ai/chat - Ask travel assistant with grounded context
router.post('/chat', handleAIChat);

export default router;
