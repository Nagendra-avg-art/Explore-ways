// server/src/middleware/rateLimiter.ts
// Lightweight in-memory rate limiter (Zero external dependencies, ₹0 cost)
// Protects public endpoints from request storms and upstream API exhaustion

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const clientIpMap = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1-minute sliding window
const MAX_REQUESTS_PER_WINDOW = 180; // 180 requests per minute per IP

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of clientIpMap.entries()) {
    if (now > entry.resetTime) {
      clientIpMap.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  // Allow health checks unconditionally
  if (req.path === '/api/health') {
    return next();
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || 'unknown';

  const now = Date.now();
  const entry = clientIpMap.get(ip);

  if (!entry || now > entry.resetTime) {
    clientIpMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please slow down and try again shortly.',
      retryAfterSeconds: Math.ceil((entry.resetTime - now) / 1000),
    });
    return;
  }

  entry.count++;
  return next();
}
