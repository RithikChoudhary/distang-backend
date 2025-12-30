import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Streak, StreakPhoto } from '../models/Streak.model';
import { Couple } from '../models/Couple.model';

/**
 * Upload streak photo
 * - Users can upload up to 3 photos
 * - Photos expire after 24 hours if not viewed
 * - If viewed, they become "seen" after 40 seconds
 */
export const uploadStreakPhoto = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const file = req.file;
    
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({ success: false, message: 'You must be in a relationship.' });
      return;
    }
    
    if (!file) {
      res.status(400).json({ success: false, message: 'No image provided.' });
      return;
    }
    
    const couple = await Couple.findById(user.coupleId);
    if (!couple) {
      res.status(404).json({ success: false, message: 'Couple not found.' });
      return;
    }
    
    // Check how many active photos user has (max 3)
    const activePhotos = await StreakPhoto.countDocuments({
      coupleId: couple._id,
      uploadedBy: user._id,
      isExpired: false,
      expiresAt: { $gt: new Date() },
    });
    
    if (activePhotos >= 3) {
      res.status(400).json({ 
        success: false, 
        message: 'You already have 3 active streak photos. Wait for them to expire or be viewed.' 
      });
      return;
    }
    
    // Create streak photo (expires in 24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const photo = new StreakPhoto({
      coupleId: couple._id,
      uploadedBy: user._id,
      imagePath: `/uploads/streaks/${file.filename}`,
      expiresAt,
    });
    
    await photo.save();
    
    // Update streak counter
    let streak = await Streak.findOne({ coupleId: couple._id });
    
    if (!streak) {
      streak = new Streak({ coupleId: couple._id });
    }
    
    const isPartner1 = couple.partner1.toString() === user._id.toString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isPartner1) {
      streak.partner1LastPhoto = new Date();
    } else {
      streak.partner2LastPhoto = new Date();
    }
    
    // Check if both partners have posted today
    const partner1Today = streak.partner1LastPhoto && 
      new Date(streak.partner1LastPhoto).setHours(0, 0, 0, 0) === today.getTime();
    const partner2Today = streak.partner2LastPhoto && 
      new Date(streak.partner2LastPhoto).setHours(0, 0, 0, 0) === today.getTime();
    
    if (partner1Today && partner2Today) {
      const lastStreak = streak.lastStreakDate ? new Date(streak.lastStreakDate) : null;
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastStreak && lastStreak.setHours(0, 0, 0, 0) === yesterday.getTime()) {
        streak.currentStreak += 1;
      } else if (!lastStreak || lastStreak.setHours(0, 0, 0, 0) !== today.getTime()) {
        streak.currentStreak = 1;
      }
      
      streak.lastStreakDate = today;
      
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
    }
    
    await streak.save();
    
    res.status(201).json({
      success: true,
      message: 'Streak photo uploaded!',
      data: {
        photo: {
          id: photo._id,
          imagePath: photo.imagePath,
          expiresAt: photo.expiresAt,
        },
        streak: {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
        },
        activePhotosCount: activePhotos + 1,
      },
    });
  } catch (error) {
    console.error('Upload streak photo error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload streak photo.' });
  }
};

/**
 * Get streak status and photos
 * Returns up to 3 partner photos that haven't been viewed
 */
export const getStreakStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    
    if (!user.coupleId) {
      res.status(200).json({
        success: true,
        data: { streak: null, photos: [] },
      });
      return;
    }
    
    const couple = await Couple.findById(user.coupleId);
    if (!couple) {
      res.status(404).json({ success: false, message: 'Couple not found.' });
      return;
    }
    
    // Determine partner ID
    const partnerId = couple.partner1.toString() === user._id.toString()
      ? couple.partner2
      : couple.partner1;
    
    const [streak, photos] = await Promise.all([
      Streak.findOne({ coupleId: couple._id }),
      StreakPhoto.find({
        coupleId: couple._id,
        expiresAt: { $gt: new Date() },
        isExpired: false,
      })
        .sort({ createdAt: -1 })
        .populate('uploadedBy', 'uniqueId name'),
    ]);
    
    // Get partner's photos (not viewed yet, max 3)
    const partnerPhotos = photos
      .filter(p => p.uploadedBy && (p.uploadedBy as any)._id.toString() === partnerId.toString())
      .slice(0, 3);
    
    // Get my photos
    const myPhotos = photos
      .filter(p => p.uploadedBy && (p.uploadedBy as any)._id.toString() === user._id.toString())
      .slice(0, 3);
    
    res.status(200).json({
      success: true,
      data: {
        streak: streak ? {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastStreakDate: streak.lastStreakDate,
        } : { currentStreak: 0, longestStreak: 0 },
        myPhoto: myPhotos[0] ? {
          id: myPhotos[0]._id,
          imagePath: myPhotos[0].imagePath,
          expiresAt: myPhotos[0].expiresAt,
          createdAt: myPhotos[0].createdAt,
        } : null,
        partnerPhoto: partnerPhotos[0] ? {
          id: partnerPhotos[0]._id,
          imagePath: partnerPhotos[0].imagePath,
          expiresAt: partnerPhotos[0].expiresAt,
          createdAt: partnerPhotos[0].createdAt,
          uploadedBy: partnerPhotos[0].uploadedBy,
        } : null,
        allPhotos: photos.map(p => ({
          id: p._id,
          imagePath: p.imagePath,
          expiresAt: p.expiresAt,
          createdAt: p.createdAt,
          uploadedBy: p.uploadedBy,
          viewedAt: p.viewedAt,
          isExpired: p.isExpired,
        })),
        partnerPhotosCount: partnerPhotos.length,
        myPhotosCount: myPhotos.length,
      },
    });
  } catch (error) {
    console.error('Get streak status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get streak status.' });
  }
};

/**
 * Mark streak photo as viewed
 * After 40 seconds of viewing, the photo is marked as "expired"
 */
export const markPhotoViewed = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { photoId } = req.params;
    
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    
    const photo = await StreakPhoto.findById(photoId);
    
    if (!photo) {
      res.status(404).json({ success: false, message: 'Photo not found.' });
      return;
    }
    
    // Can't view own photos
    if (photo.uploadedBy.toString() === user._id.toString()) {
      res.status(400).json({ success: false, message: 'Cannot view your own photo.' });
      return;
    }
    
    // Mark as viewed and expired
    photo.viewedAt = new Date();
    photo.viewedBy = user._id;
    photo.isExpired = true;
    
    await photo.save();
    
    res.status(200).json({
      success: true,
      message: 'Photo marked as viewed.',
      data: {
        photoId: photo._id,
        viewedAt: photo.viewedAt,
      },
    });
  } catch (error) {
    console.error('Mark photo viewed error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark photo as viewed.' });
  }
};
