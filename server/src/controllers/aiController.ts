import { Request, Response } from 'express';
import { queryAITravelGuide, AIContextData, ChatMessage } from '../services/aiService.js';

export const handleAIChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, context, conversationHistory } = req.body;

    // Validate user input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Message is required and must be a non-empty string'
      });
      return;
    }

    if (message.length > 2000) {
      res.status(400).json({
        success: false,
        error: 'Message length exceeds maximum limit of 2,000 characters'
      });
      return;
    }

    // Default context if missing
    const safeContext: AIContextData = context || {
      location: { city: 'Hyderabad', area: 'Old City', lat: 17.3616, lon: 78.4747 },
      userPreferences: {
        interests: ['history', 'food'],
        availableHours: 4,
        budgetAmount: 1000,
        travelStyle: 'solo',
        pace: 'moderate'
      },
      selectedTrip: {
        stopCount: 0,
        stops: [],
        totalDistanceKm: 0,
        totalTravelTimeMin: 0,
        totalVisitTimeMin: 0,
        totalEstimatedDurationMin: 0,
        preferredMode: 'auto',
        isOptimized: false
      },
      topNearbyPlaces: []
    };

    const history: ChatMessage[] = Array.isArray(conversationHistory) ? conversationHistory : [];

    const result = await queryAITravelGuide(message.trim(), safeContext, history);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[AI Controller] Error processing chat request:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while consulting the AI travel guide',
      fallbackMessage: 'The AI guide is temporarily experiencing connectivity issues, but your route and places remain fully accessible.'
    });
  }
};

export const getAIStatus = (_req: Request, res: Response): void => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  res.status(200).json({
    status: 'online',
    provider: hasKey ? 'gemini' : 'grounded-local-engine',
    isGrounded: true,
    hasApiKey: hasKey,
    demoMode: process.env.DEMO_MODE === 'true'
  });
};
