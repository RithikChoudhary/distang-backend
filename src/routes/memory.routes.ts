import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import { requireConsent } from '../middlewares/consent.middleware';
import { ConsentType } from '../models/Consent.model';
import {
  uploadMemory,
  listMemories,
  getMemory,
  deleteMemory,
} from '../controllers/memory.controller';
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
 * @route   POST /memory/upload
 * @desc    Upload a new memory (photo) to Cloudinary
 * @access  Private - Requires mutual photo sharing consent
 */
router.post(
  '/upload',
  authenticate,
  requireConsent(ConsentType.PHOTO_SHARING),
  upload.single('image'),
  uploadMemory
);

/**
 * @route   GET /memory/list
 * @desc    Get list of memories
 * @access  Private - Requires mutual memory access consent
 */
router.get(
  '/list',
  authenticate,
  requireConsent(ConsentType.MEMORY_ACCESS),
  listMemories
);

/**
 * @route   GET /memory/:memoryId
 * @desc    Get a single memory
 * @access  Private
 */
router.get(
  '/:memoryId',
  authenticate,
  requireConsent(ConsentType.MEMORY_ACCESS),
  getMemory
);

/**
 * @route   DELETE /memory/:memoryId
 * @desc    Delete a memory
 * @access  Private
 */
router.delete(
  '/:memoryId',
  authenticate,
  deleteMemory
);

export default router;
