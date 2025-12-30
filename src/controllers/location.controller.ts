import { Response } from 'express';
import { ConsentRequest } from '../middlewares/consent.middleware';
import { User } from '../models/User.model';
import { LocationShare } from '../models/LocationShare.model';

/**
 * Share current location snapshot with partner
 * Location stays active until manually stopped
 * Requires mutual consent for location sharing
 */
export const shareLocation = async (
  req: ConsentRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const couple = req.couple;
    const { latitude, longitude, accuracy, timestamp } = req.body;
    
    if (!user || !couple) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    // Validate coordinates
    if (
      latitude === undefined ||
      longitude === undefined ||
      typeof latitude !== 'number' ||
      typeof longitude !== 'number'
    ) {
      res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude are required.',
      });
      return;
    }
    
    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      res.status(400).json({
        success: false,
        message: 'Invalid coordinates.',
      });
      return;
    }
    
    // Get partner info
    const partnerId = couple.partner1.toString() === user._id.toString()
      ? couple.partner2
      : couple.partner1;
    
    const partner = await User.findById(partnerId).select('uniqueId name');
    
    // Find existing location share or create new one
    let locationShare = await LocationShare.findOne({
      coupleId: couple._id,
      sharedBy: user._id,
    });
    
    if (locationShare) {
      // Update existing location
      locationShare.latitude = latitude;
      locationShare.longitude = longitude;
      locationShare.accuracy = accuracy || null;
      locationShare.isActive = true;
      locationShare.sharedAt = timestamp ? new Date(timestamp) : new Date();
      await locationShare.save();
    } else {
      // Create new location share
      locationShare = new LocationShare({
        coupleId: couple._id,
        sharedBy: user._id,
        latitude,
        longitude,
        accuracy: accuracy || null,
        isActive: true,
        sharedAt: timestamp ? new Date(timestamp) : new Date(),
      });
      await locationShare.save();
    }
    
    const sharedLocation = {
      sharedBy: {
        uniqueId: user.uniqueId,
        name: user.name,
      },
      sharedWith: partner ? {
        uniqueId: partner.uniqueId,
        name: partner.name,
      } : null,
      location: {
        latitude,
        longitude,
        accuracy: accuracy || null,
      },
      sharedAt: locationShare.sharedAt,
      isActive: locationShare.isActive,
    };
    
    res.status(200).json({
      success: true,
      message: 'Location shared with your partner.',
      data: {
        location: sharedLocation,
        note: 'Location will remain shared until you stop sharing.',
      },
    });
  } catch (error) {
    console.error('Share location error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while sharing location.',
    });
  }
};

/**
 * Stop sharing location with partner
 * Requires mutual consent for location sharing
 */
export const stopSharingLocation = async (
  req: ConsentRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const couple = req.couple;
    
    if (!user || !couple) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    // Find and deactivate location share
    const locationShare = await LocationShare.findOne({
      coupleId: couple._id,
      sharedBy: user._id,
    });
    
    if (!locationShare) {
      res.status(404).json({
        success: false,
        message: 'No active location share found.',
      });
      return;
    }
    
    locationShare.isActive = false;
    await locationShare.save();
    
    res.status(200).json({
      success: true,
      message: 'Location sharing stopped.',
    });
  } catch (error) {
    console.error('Stop sharing location error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while stopping location share.',
    });
  }
};

/**
 * Get partner's last shared location
 * Requires mutual consent for location sharing
 */
export const getPartnerLocation = async (
  req: ConsentRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const couple = req.couple;
    
    if (!user || !couple) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    // Get partner ID
    const partnerId = couple.partner1.toString() === user._id.toString()
      ? couple.partner2
      : couple.partner1;
    
    // Find partner's active location share
    const locationShare = await LocationShare.findOne({
      coupleId: couple._id,
      sharedBy: partnerId,
      isActive: true,
    })
      .sort({ sharedAt: -1 })
      .populate('sharedBy', 'uniqueId name');
    
    if (!locationShare) {
      res.status(404).json({
        success: false,
        message: 'No active location share from your partner.',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: {
        location: {
          sharedBy: locationShare.sharedBy,
          latitude: locationShare.latitude,
          longitude: locationShare.longitude,
          accuracy: locationShare.accuracy,
          sharedAt: locationShare.sharedAt,
          isActive: locationShare.isActive,
        },
      },
    });
  } catch (error) {
    console.error('Get partner location error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching location.',
    });
  }
};

/**
 * Get my location sharing status
 * Requires mutual consent for location sharing
 */
export const getMyLocationStatus = async (
  req: ConsentRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const couple = req.couple;
    
    if (!user || !couple) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }
    
    // Find my location share
    const locationShare = await LocationShare.findOne({
      coupleId: couple._id,
      sharedBy: user._id,
    }).sort({ sharedAt: -1 });
    
    if (!locationShare || !locationShare.isActive) {
      res.status(200).json({
        success: true,
        data: {
          isSharing: false,
        },
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: {
        isSharing: true,
        location: {
          latitude: locationShare.latitude,
          longitude: locationShare.longitude,
          accuracy: locationShare.accuracy,
          sharedAt: locationShare.sharedAt,
        },
      },
    });
  } catch (error) {
    console.error('Get my location status error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching status.',
    });
  }
};
