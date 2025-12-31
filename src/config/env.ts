import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment configuration with defaults for development
 * Copy .env.example to .env and update values for your environment
 */
export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/codex_couples',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '90d',
  
  // Uploads
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
  
  // Email (for OTP)
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'noreply@codexcouples.com',
  
  // Cloudinary (for file storage)
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dbkbqh8sy',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '632942881449357',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  
  // Security
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 min
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  
  // API
  apiVersion: 'v1',
  apiPrefix: '/api',
  
  // Feature flags
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate required environment variables in production
export const validateEnv = (): void => {
  if (config.isProduction) {
    const required = [
      'JWT_SECRET',
      'MONGODB_URI',
      'SMTP_USER',
      'SMTP_PASS',
    ];
    const missing = required.filter((key) => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Warn about security
    if (config.jwtSecret === 'dev-secret-change-in-production') {
      console.warn('⚠️  WARNING: Using default JWT secret in production!');
    }
  }
};

export default config;
