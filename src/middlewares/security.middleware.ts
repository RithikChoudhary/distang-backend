import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

/**
 * Simple in-memory rate limiter
 * For production, use Redis-based rate limiting
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware
 */
export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    // New window
    requestCounts.set(ip, {
      count: 1,
      resetTime: now + config.rateLimitWindow,
    });
    next();
    return;
  }
  
  if (record.count >= config.rateLimitMax) {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    });
    return;
  }
  
  record.count++;
  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (basic)
  if (config.isProduction) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: https:; script-src 'self'"
    );
  }
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Request sanitizer - basic input validation
 */
export const sanitizeRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Remove potential XSS from query params
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = (req.query[key] as string)
          .replace(/[<>]/g, '')
          .trim();
      }
    });
  }
  
  next();
};

/**
 * Request logger middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    
    if (res.statusCode >= 500) {
      console.error(`[ERROR] ${log}`);
    } else if (res.statusCode >= 400) {
      console.warn(`[WARN] ${log}`);
    } else if (config.isDevelopment) {
      console.log(`[INFO] ${log}`);
    }
  });
  
  next();
};

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  requestCounts.forEach((value, key) => {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  });
}, 60000); // Every minute

