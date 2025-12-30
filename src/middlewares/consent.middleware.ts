import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { Consent, ConsentType } from '../models/Consent.model';
import { Couple, CoupleStatus } from '../models/Couple.model';

/**
 * Extended request with consent information
 */
export interface ConsentRequest extends AuthenticatedRequest {
  couple?: any;
  consent?: any;
}

/**
 * Middleware factory to check if a specific consent is active
 * CRITICAL: Features only work if BOTH partners have given consent
 */
export const requireConsent = (consentType: ConsentType) => {
  return async (
    req: ConsentRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
        return;
      }
      
      // Check if user is in an active couple
      if (!user.coupleId) {
        res.status(403).json({
          success: false,
          message: 'You must be in a relationship to access this feature.',
        });
        return;
      }
      
      // Find the couple
      const couple = await Couple.findById(user.coupleId);
      
      if (!couple || couple.status !== CoupleStatus.ACTIVE) {
        res.status(403).json({
          success: false,
          message: 'Your relationship is not active.',
        });
        return;
      }
      
      // Find consent record
      const consent = await Consent.findOne({ coupleId: couple._id });
      
      if (!consent) {
        res.status(403).json({
          success: false,
          message: 'Consent settings not found.',
        });
        return;
      }
      
      // Check if BOTH partners have consented
      const isEnabled = consent.isFeatureEnabled(consentType);
      
      if (!isEnabled) {
        res.status(403).json({
          success: false,
          message: `This feature requires mutual consent. Both partners must enable ${consentType}.`,
          consentRequired: consentType,
        });
        return;
      }
      
      // Attach couple and consent to request for downstream use
      req.couple = couple;
      req.consent = consent;
      
      next();
    } catch (error) {
      console.error('Consent middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking consent status.',
      });
    }
  };
};

/**
 * Middleware to check if user is in an active couple
 * Does not check specific consent, just validates relationship
 */
export const requireActiveCouple = async (
  req: ConsentRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(403).json({
        success: false,
        message: 'You are not currently in a relationship.',
      });
      return;
    }
    
    const couple = await Couple.findById(user.coupleId);
    
    if (!couple || couple.status !== CoupleStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: 'Your relationship is not active.',
      });
      return;
    }
    
    req.couple = couple;
    
    // Also load consent for convenience
    const consent = await Consent.findOne({ coupleId: couple._id });
    req.consent = consent;
    
    next();
  } catch (error) {
    console.error('Couple check middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking relationship status.',
    });
  }
};

