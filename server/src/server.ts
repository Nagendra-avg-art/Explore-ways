import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());

import locationRoutes from './routes/locationRoutes.js';
import placesRoutes from './routes/placesRoutes.js';
import recommendationsRoutes from './routes/recommendationsRoutes.js';
import routesRoutes from './routes/routesRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

// Basic health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Smart Travel Companion API is online and operational',
    version: '1.0.0',
    demoMode: process.env.DEMO_MODE === 'true',
    timestamp: new Date().toISOString()
  });
});

// Location & Geocoding routes
app.use('/api/location', locationRoutes);

// Places & Discovery routes
app.use('/api/places', placesRoutes);

// Recommendation Engine routes
app.use('/api/recommendations', recommendationsRoutes);

// Real Road Routing & Directions routes
app.use('/api/routes', routesRoutes);

// AI Local Travel Guide routes
app.use('/api/ai', aiRoutes);

// Start listening
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Smart Travel Companion Backend running`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🛠️ Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
});

export default app;
