import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import { config } from '../config/env';

/**
 * JWT payload interface
 */
export interface TokenPayload extends JwtPayload {
  userId: string;
  uniqueId: string;
}

/**
 * Generate a JWT token for a user
 */
export const generateToken = (userId: string, uniqueId: string): string => {
  const payload: TokenPayload = {
    userId,
    uniqueId,
  };
  
  const secret: Secret = config.jwtSecret;
  // Use expiresIn directly - supports strings like '7d', '30d', '1h' etc.
  const expiresIn = config.jwtExpiresIn || '30d';
  
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verify and decode a JWT token
 * Returns the payload if valid, throws error if invalid
 */
export const verifyToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Decode a token without verification (for debugging)
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.slice(7); // Remove 'Bearer ' prefix
};

