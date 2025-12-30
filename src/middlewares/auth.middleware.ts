import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, TokenPayload } from '../utils/jwt';
import { User, IUser } from '../models/User.model';

/**
 * Extended Request interface with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: IUser;
  tokenPayload?: TokenPayload;
}

// Alias for backward compatibility
export type AuthRequest = AuthenticatedRequest;

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }
    
    // Verify token
    const payload = verifyToken(token);
    
    // Find user
    const user = await User.findById(payload.userId);
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    // Attach user and token payload to request
    req.user = user;
    req.tokenPayload = payload;
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload = verifyToken(token);
      const user = await User.findById(payload.userId);
      
      if (user) {
        req.user = user;
        req.tokenPayload = payload;
      }
    }
    
    next();
  } catch {
    // Continue without authentication
    next();
  }
};

