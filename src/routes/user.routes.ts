import { Router } from 'express';
import multer from 'multer';
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
    fileSize: config.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

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
router.post('/profile-photo', authenticate, upload.single('image'), updateProfilePhoto);

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
