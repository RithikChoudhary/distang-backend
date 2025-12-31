import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadStreakPhoto, getStreakStatus, markPhotoViewed } from '../controllers/streak.controller';
import { config } from '../config/env';

const router = Router();

// Configure multer with memory storage for Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.'));
    }
  },
});

/**
 * @route   POST /streak/upload
 * @desc    Upload streak photo (uploaded to Cloudinary, auto-expires in 24h)
 * @access  Private
 */
router.post('/upload', authenticate, upload.single('image'), uploadStreakPhoto);

/**
 * @route   GET /streak/status
 * @desc    Get streak status and photos
 * @access  Private
 */
router.get('/status', authenticate, getStreakStatus);

/**
 * @route   POST /streak/:photoId/viewed
 * @desc    Mark streak photo as viewed (after 40 seconds)
 * @access  Private
 */
router.post('/:photoId/viewed', authenticate, markPhotoViewed);

export default router;
