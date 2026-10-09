import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimiter } from './middleware/rateLimiter.js';

import locationRoutes from './routes/locationRoutes.js';
import placesRoutes from './routes/placesRoutes.js';
import recommendationsRoutes from './routes/recommendationsRoutes.js';
import routesRoutes from './routes/routesRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configurable CORS origins with fallback for dev/prod
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permit requests with no origin (mobile clients, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
  },
  credentials: true
}));

// Apply sliding-window rate limiter (180 req/min per IP)
app.use(rateLimiter);

// Enforce reasonable JSON body limit (1MB max payload to prevent DOS)
app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Smart Travel Companion API is online and operational',
    version: '1.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    demoMode: process.env.DEMO_MODE === 'true',
    uptimeSeconds: Math.floor(process.uptime()),
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

// Weather-Aware Travel Intelligence routes (Phase 13)
app.use('/api/weather', weatherRoutes);

// Catch-all 404 handler for unmatched routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized global error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  console.error(`[Unhandled Error] ${req.method} ${req.path}:`, err?.message || err);
  res.status(err.status || 500).json({
    success: false,
    error: isProd ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
    ...(isProd ? {} : { stack: err.stack })
  });
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Smart Travel Companion Backend running`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🛠️ Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
});

// Graceful process shutdown
const handleShutdown = (signal: string) => {
  console.log(`\n[Server] Received ${signal}, closing server gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP connections closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default app;
