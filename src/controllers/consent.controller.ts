import { Response } from 'express';
import { ConsentRequest } from '../middlewares/consent.middleware';
import { Consent, ConsentType } from '../models/Consent.model';
import { Couple, CoupleStatus } from '../models/Couple.model';

/**
 * Update consent settings for the current user
 * CRITICAL: Features only work when BOTH partners consent
 */
export const updateConsent = async (
  req: ConsentRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { photoSharing, memoryAccess, locationSharing } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You must be in a relationship to manage consent.',
      });
      return;
    }
    
    const couple = await Couple.findById(user.coupleId);
    
    if (!couple || couple.status !== CoupleStatus.ACTIVE) {
      res.status(400).json({
        success: false,
        message: 'No active relationship found.',
      });
      return;
    }
    
    let consent = await Consent.findOne({ coupleId: couple._id });
    
    if (!consent) {
      // Create consent if it doesn't exist
      consent = new Consent({
        coupleId: couple._id,
        partner1Consent: {
          userId: couple.partner1,
          photoSharing: false,
          memoryAccess: false,
          locationSharing: false,
        },
        partner2Consent: {
          userId: couple.partner2,
          photoSharing: false,
          memoryAccess: false,
          locationSharing: false,
        },
        history: [],
      });
    }
    
    // Determine which partner's consent to update
    const isPartner1 = consent.partner1Consent.userId.toString() === user._id.toString();
    const partnerConsent = isPartner1 ? consent.partner1Consent : consent.partner2Consent;
    
    // Track changes for history
    const changes: { type: ConsentType; enabled: boolean }[] = [];
    
    // Update consent values if provided
    if (photoSharing !== undefined && photoSharing !== partnerConsent.photoSharing) {
      partnerConsent.photoSharing = photoSharing;
      changes.push({ type: ConsentType.PHOTO_SHARING, enabled: photoSharing });
    }
    
    if (memoryAccess !== undefined && memoryAccess !== partnerConsent.memoryAccess) {
      partnerConsent.memoryAccess = memoryAccess;
      changes.push({ type: ConsentType.MEMORY_ACCESS, enabled: memoryAccess });
    }
    
    if (locationSharing !== undefined && locationSharing !== partnerConsent.locationSharing) {
      partnerConsent.locationSharing = locationSharing;
      changes.push({ type: ConsentType.LOCATION_SHARING, enabled: locationSharing });
    }
    
    partnerConsent.lastUpdated = new Date();
    
    // Add to history
    for (const change of changes) {
      consent.history.push({
        consentType: change.type,
        enabled: change.enabled,
        userId: user._id,
        timestamp: new Date(),
      });
    }
    
    await consent.save();
    
    // Calculate active features (both must consent)
    const activeFeatures = consent.getActiveFeatures();
    
    res.status(200).json({
      success: true,
      message: 'Consent settings updated.',
      data: {
        myConsent: {
          photoSharing: partnerConsent.photoSharing,
          memoryAccess: partnerConsent.memoryAccess,
          locationSharing: partnerConsent.locationSharing,
        },
        activeFeatures,
        note: 'Features are only active when both partners give consent.',
      },
    });
  } catch (error) {
    console.error('Update consent error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating consent.',
    });
  }
};

/**
 * Get current consent status
 */
export const getConsentStatus = async (
  req: ConsentRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You must be in a relationship to view consent.',
      });
      return;
    }
    
    const couple = await Couple.findById(user.coupleId);
    
    if (!couple || couple.status !== CoupleStatus.ACTIVE) {
      res.status(400).json({
        success: false,
        message: 'No active relationship found.',
      });
      return;
    }
    
    const consent = await Consent.findOne({ coupleId: couple._id });
    
    if (!consent) {
      res.status(404).json({
        success: false,
        message: 'Consent settings not found.',
      });
      return;
    }
    
    // Determine which is my consent vs partner's consent
    const isPartner1 = consent.partner1Consent.userId.toString() === user._id.toString();
    const myConsent = isPartner1 ? consent.partner1Consent : consent.partner2Consent;
    const partnerConsent = isPartner1 ? consent.partner2Consent : consent.partner1Consent;
    
    // Calculate active features
    const activeFeatures = consent.getActiveFeatures();
    
    res.status(200).json({
      success: true,
      data: {
        myConsent: {
          photoSharing: myConsent.photoSharing,
          memoryAccess: myConsent.memoryAccess,
          locationSharing: myConsent.locationSharing,
          lastUpdated: myConsent.lastUpdated,
        },
        partnerConsent: {
          photoSharing: partnerConsent.photoSharing,
          memoryAccess: partnerConsent.memoryAccess,
          locationSharing: partnerConsent.locationSharing,
          lastUpdated: partnerConsent.lastUpdated,
        },
        activeFeatures,
        featureStatus: {
          photoSharing: {
            active: activeFeatures.includes(ConsentType.PHOTO_SHARING),
            myConsent: myConsent.photoSharing,
            partnerConsent: partnerConsent.photoSharing,
          },
          memoryAccess: {
            active: activeFeatures.includes(ConsentType.MEMORY_ACCESS),
            myConsent: myConsent.memoryAccess,
            partnerConsent: partnerConsent.memoryAccess,
          },
          locationSharing: {
            active: activeFeatures.includes(ConsentType.LOCATION_SHARING),
            myConsent: myConsent.locationSharing,
            partnerConsent: partnerConsent.locationSharing,
          },
        },
      },
    });
  } catch (error) {
    console.error('Get consent status error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching consent status.',
    });
  }
};

