import { Router, Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getMe,
  updateProfile,
  updateProfilePhoto,
  searchUser,
  getFavorites,
  updateFavorites,
  getNotifications,
  updateNotifications,
  getPartnerProfile,
  updateAbout,
  getMyRelationshipHistory,
} from '../controllers/user.controller';
import { config } from '../config/env';

const router = Router();

// Configure multer with memory storage for Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSize || 10 * 1024 * 1024, // Default 10MB
  },
  fileFilter: (req, file, cb) => {
    console.log(`📁 Multer processing file: ${file.originalname}, type: ${file.mimetype}, size will be checked`);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log(`❌ Invalid file type: ${file.mimetype}`);
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

// Multer error handling middleware
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof MulterError) {
    console.error(`❌ Multer error: ${err.code} - ${err.message}`);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${(config.maxFileSize || 10 * 1024 * 1024) / (1024 * 1024)}MB.`,
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  } else if (err) {
    console.error(`❌ Upload error: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed.',
    });
  }
  next();
};

/**
 * @route   GET /user/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, getMe);

/**
 * @route   PUT /user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, updateProfile);

/**
 * @route   POST /user/profile-photo
 * @desc    Update profile photo (uploaded to Cloudinary)
 * @access  Private
 */
router.post('/profile-photo', authenticate, upload.single('photo'), handleMulterError, updateProfilePhoto);

/**
 * @route   GET /user/search/:uniqueId
 * @desc    Search for a user by unique ID
 * @access  Private
 */
router.get('/search/:uniqueId', authenticate, searchUser);

/**
 * @route   GET /user/favorites
 * @desc    Get user favorites
 * @access  Private
 */
router.get('/favorites', authenticate, getFavorites);

/**
 * @route   PUT /user/favorites
 * @desc    Update user favorites
 * @access  Private
 */
router.put('/favorites', authenticate, updateFavorites);

/**
 * @route   GET /user/notifications
 * @desc    Get notification preferences
 * @access  Private
 */
router.get('/notifications', authenticate, getNotifications);

/**
 * @route   PUT /user/notifications
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/notifications', authenticate, updateNotifications);

/**
 * @route   GET /user/partner-profile
 * @desc    Get partner's full profile (including relationship history)
 * @access  Private
 */
router.get('/partner-profile', authenticate, getPartnerProfile);

/**
 * @route   PUT /user/about
 * @desc    Update user's about info (bio, hobbies, etc.)
 * @access  Private
 */
router.put('/about', authenticate, updateAbout);

/**
 * @route   GET /user/relationship-history
 * @desc    Get my relationship history
 * @access  Private
 */
router.get('/relationship-history', authenticate, getMyRelationshipHistory);

export default router;
