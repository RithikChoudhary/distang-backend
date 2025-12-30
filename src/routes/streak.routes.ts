import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadStreakPhoto, getStreakStatus, markPhotoViewed } from '../controllers/streak.controller';
import { config } from '../config/env';

const router = Router();

// Create streaks upload directory
const streaksDir = path.join(config.uploadPath, 'streaks');
if (!fs.existsSync(streaksDir)) {
  fs.mkdirSync(streaksDir, { recursive: true });
}

// Configure multer for streak photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, streaksDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
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
 * @desc    Upload streak photo (auto-deletes in 24h)
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

