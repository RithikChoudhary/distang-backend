import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { User } from '../models/User.model';
import { Couple, CoupleStatus } from '../models/Couple.model';
import { uploadImage, deleteFromCloudinary } from '../services/cloudinary.service';

/**
 * Get current user profile
 */
export const getMe = async (
  req: AuthenticatedRequest,
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
    
    // Get partner info if in a relationship
    let partnerInfo = null;
    if (user.coupleId) {
      const couple = await Couple.findById(user.coupleId);
      
      if (couple && couple.status === CoupleStatus.ACTIVE) {
        const partnerId = couple.partner1.toString() === user._id.toString()
          ? couple.partner2
          : couple.partner1;
        
        const partner = await User.findById(partnerId).select('name uniqueId profilePhoto');
        
        if (partner) {
          partnerInfo = {
            id: partner._id,
            uniqueId: partner.uniqueId,
            name: partner.name,
            profilePhoto: partner.profilePhoto,
          };
        }
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          uniqueId: user.uniqueId,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          gender: user.gender,
          profilePhoto: user.profilePhoto,
          relationshipStatus: user.relationshipStatus,
          coupleId: user.coupleId,
          pastRelationshipExists: user.pastRelationshipExists,
          createdAt: user.createdAt,
        },
        partner: partnerInfo,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user data.',
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { name, gender, phoneNumber } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    // Update allowed fields
    if (name) user.name = name.trim();
    if (gender) user.gender = gender;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          id: user._id,
          uniqueId: user.uniqueId,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          gender: user.gender,
          profilePhoto: user.profilePhoto,
          relationshipStatus: user.relationshipStatus,
          favorites: user.favorites,
          notifications: user.notifications,
        },
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating profile.',
    });
  }
};

/**
 * Update user favorites
 */
export const updateFavorites = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { food, placeVisited, placeToBe } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    // Update favorites
    if (food !== undefined) user.favorites.food = food;
    if (placeVisited !== undefined) user.favorites.placeVisited = placeVisited;
    if (placeToBe !== undefined) user.favorites.placeToBe = placeToBe;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Favorites updated successfully.',
      data: {
        favorites: user.favorites,
      },
    });
  } catch (error) {
    console.error('Update favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating favorites.',
    });
  }
};

/**
 * Get user favorites
 */
export const getFavorites = async (
  req: AuthenticatedRequest,
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
    
    res.status(200).json({
      success: true,
      data: {
        favorites: user.favorites,
      },
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching favorites.',
    });
  }
};

/**
 * Update notification preferences
 */
export const updateNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { messages, locationUpdates, streaks, calendar, walkieTalkie } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    // Initialize notifications if not exists
    if (!user.notifications) {
      (user as any).notifications = {
        messages: true,
        locationUpdates: true,
        streaks: true,
        calendar: true,
        walkieTalkie: true,
      };
    }
    
    // Update notification preferences
    if (messages !== undefined) user.notifications.messages = messages;
    if (locationUpdates !== undefined) user.notifications.locationUpdates = locationUpdates;
    if (streaks !== undefined) user.notifications.streaks = streaks;
    if (calendar !== undefined) user.notifications.calendar = calendar;
    if (walkieTalkie !== undefined) user.notifications.walkieTalkie = walkieTalkie;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Notification preferences updated.',
      data: {
        notifications: user.notifications,
      },
    });
  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating notification preferences.',
    });
  }
};

/**
 * Get notification preferences
 */
export const getNotifications = async (
  req: AuthenticatedRequest,
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
    
    res.status(200).json({
      success: true,
      data: {
        notifications: user.notifications || {
          messages: true,
          locationUpdates: true,
          streaks: true,
          calendar: true,
          walkieTalkie: true,
        },
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching notification preferences.',
    });
  }
};

/**
 * Update profile photo (uploads to Cloudinary)
 */
export const updateProfilePhoto = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const file = req.file;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded.',
      });
      return;
    }
    
    // Upload to Cloudinary
    const result = await uploadImage(
      file.buffer,
      'profile',
      user._id.toString(),
      undefined,
      'profile' // Use consistent public_id for profile photos
    );
    
    if (!result) {
      res.status(500).json({
        success: false,
        message: 'Failed to upload image to cloud storage.',
      });
      return;
    }
    
    // Delete old profile photo from Cloudinary if exists
    if (user.profilePhoto && user.profilePhoto.includes('cloudinary')) {
      const oldPublicId = user.profilePhoto.split('/').slice(-2).join('/').split('.')[0];
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
    }
    
    // Store Cloudinary URL
    user.profilePhoto = result.url;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully.',
      data: {
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    console.error('Update profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating profile photo.',
    });
  }
};

/**
 * Search for a user by unique ID (for pairing)
 */
export const searchUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { uniqueId } = req.params;
    const currentUser = req.user;
    
    if (!currentUser) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    if (!uniqueId) {
      res.status(400).json({
        success: false,
        message: 'Unique ID is required.',
      });
      return;
    }
    
    // Don't allow searching for yourself
    if (uniqueId.toUpperCase() === currentUser.uniqueId) {
      res.status(400).json({
        success: false,
        message: 'You cannot search for yourself.',
      });
      return;
    }
    
    const user = await User.findOne({
      uniqueId: uniqueId.toUpperCase(),
    }).select('uniqueId name profilePhoto relationshipStatus');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          uniqueId: user.uniqueId,
          name: user.name,
          profilePhoto: user.profilePhoto,
          relationshipStatus: user.relationshipStatus,
        },
      },
    });
  } catch (error) {
    console.error('Search user error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while searching for user.',
    });
  }
};

/**
 * Get partner's full profile (including relationship history)
 */
export const getPartnerProfile = async (
  req: AuthenticatedRequest,
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
        message: 'You are not in a relationship.',
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
    
    const partnerId = couple.partner1.toString() === user._id.toString()
      ? couple.partner2
      : couple.partner1;
    
    const partner = await User.findById(partnerId).select(
      'uniqueId name profilePhoto photos about relationshipHistory favorites gender createdAt'
    );
    
    if (!partner) {
      res.status(404).json({
        success: false,
        message: 'Partner not found.',
      });
      return;
    }
    
    // Calculate current relationship duration
    const startDate = couple.relationshipStartDate || couple.pairingDate || couple.createdAt;
    const now = new Date();
    const currentDays = Math.floor((now.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    
    res.status(200).json({
      success: true,
      data: {
        partner: {
          uniqueId: partner.uniqueId,
          name: partner.name,
          profilePhoto: partner.profilePhoto,
          photos: partner.photos,
          about: partner.about,
          favorites: partner.favorites,
          gender: partner.gender,
          memberSince: partner.createdAt,
        },
        relationshipHistory: partner.relationshipHistory || [],
        currentRelationship: {
          startDate,
          daysTogether: currentDays,
          relationshipStartDate: couple.relationshipStartDate,
        },
        stats: {
          totalPastRelationships: (partner.relationshipHistory || []).length,
          totalDaysInRelationships: (partner.relationshipHistory || []).reduce(
            (sum: number, r: any) => sum + (r.durationDays || 0), 0
          ) + currentDays,
        },
      },
    });
  } catch (error) {
    console.error('Get partner profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching partner profile.',
    });
  }
};

/**
 * Update user's about info (bio, hobbies, etc.)
 */
export const updateAbout = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { bio, hobbies, occupation, education, location, birthday } = req.body;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }
    
    // Initialize about if not exists
    if (!user.about) {
      user.about = { hobbies: [] };
    }
    
    // Update fields
    if (bio !== undefined) user.about.bio = bio?.slice(0, 500);
    if (hobbies !== undefined) user.about.hobbies = Array.isArray(hobbies) ? hobbies.slice(0, 10) : [];
    if (occupation !== undefined) user.about.occupation = occupation?.slice(0, 100);
    if (education !== undefined) user.about.education = education?.slice(0, 100);
    if (location !== undefined) user.about.location = location?.slice(0, 100);
    if (birthday !== undefined) user.about.birthday = birthday ? new Date(birthday) : undefined;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'About info updated successfully.',
      data: {
        about: user.about,
      },
    });
  } catch (error) {
    console.error('Update about error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating about info.',
    });
  }
};

/**
 * Get my relationship history
 */
export const getMyRelationshipHistory = async (
  req: AuthenticatedRequest,
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
    
    res.status(200).json({
      success: true,
      data: {
        relationshipHistory: user.relationshipHistory || [],
        totalPastRelationships: (user.relationshipHistory || []).length,
        totalDaysInRelationships: (user.relationshipHistory || []).reduce(
          (sum: number, r: any) => sum + (r.durationDays || 0), 0
        ),
      },
    });
  } catch (error) {
    console.error('Get relationship history error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching relationship history.',
    });
  }
};

