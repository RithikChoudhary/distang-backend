import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import { config } from './config/env';
import { 
  rateLimiter, 
  securityHeaders, 
  sanitizeRequest, 
  requestLogger 
} from './middlewares/security.middleware';
import { 
  errorHandler, 
  notFoundHandler 
} from './middlewares/errorHandler.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import coupleRoutes from './routes/couple.routes';
import consentRoutes from './routes/consent.routes';
import memoryRoutes from './routes/memory.routes';
import locationRoutes from './routes/location.routes';
import chatRoutes from './routes/chat.routes';
import streakRoutes from './routes/streak.routes';
import calendarRoutes from './routes/calendar.routes';
import walkieRoutes from './routes/walkie.routes';
import callStatusRoutes from './routes/callStatus.routes';
import questionRoutes from './routes/question.routes';
import moodRoutes from './routes/mood.routes';
import adminRoutes from './routes/admin.routes';

/**
 * Create and configure Express application
 */
export const createApp = (): Express => {
  const app = express();
  
  // Create upload directories if they don't exist
  const uploadDirs = [
    path.join(config.uploadPath, 'profiles'),
    path.join(config.uploadPath, 'memories'),
    path.join(config.uploadPath, 'streaks'),
    path.join(config.uploadPath, 'gallery'),
    path.join(config.uploadPath, 'chat'),
    path.join(config.uploadPath, 'voice'),
  ];
  
  for (const dir of uploadDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  // Trust proxy for rate limiting (when behind nginx/load balancer)
  if (config.isProduction) {
    app.set('trust proxy', 1);
  }
  
  // Security middleware
  app.use(securityHeaders);
  app.use(requestLogger);
  
  // Rate limiting (apply to API routes only)
  app.use('/api', rateLimiter);
  app.use('/auth', rateLimiter);
  
  // CORS configuration
  app.use(cors({
    origin: config.isDevelopment 
      ? '*' 
      : config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Request sanitization
  app.use(sanitizeRequest);
  
  // Serve uploaded files statically
  app.use('/uploads', express.static(config.uploadPath, {
    maxAge: config.isProduction ? '1d' : 0,
    etag: true,
  }));
  
  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Codex Couples API is running',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
    });
  });
  
  // API routes
  app.use('/auth', authRoutes);
  app.use('/user', userRoutes);
  app.use('/couple', coupleRoutes);
  app.use('/consent', consentRoutes);
  app.use('/memory', memoryRoutes);
  app.use('/location', locationRoutes);
  app.use('/chat', chatRoutes);
  app.use('/streak', streakRoutes);
  app.use('/calendar', calendarRoutes);
  app.use('/walkie', walkieRoutes);
  app.use('/call-status', callStatusRoutes);
  app.use('/questions', questionRoutes);
  app.use('/mood', moodRoutes);
  app.use('/admin', adminRoutes);
  
  // 404 handler
  app.use(notFoundHandler);
  
  // Global error handler (must be last)
  app.use(errorHandler);
  
  return app;
};
