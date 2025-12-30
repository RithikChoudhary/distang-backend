import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
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

// Configure multer for memory uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(config.uploadPath, 'memories'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
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
 * @desc    Upload a new memory (photo)
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
 * @route   GET /memory/:id
 * @desc    Get a single memory
 * @access  Private - Requires mutual memory access consent
 */
router.get(
  '/:id',
  authenticate,
  requireConsent(ConsentType.MEMORY_ACCESS),
  getMemory
);

/**
 * @route   DELETE /memory/:id
 * @desc    Delete a memory
 * @access  Private - Requires mutual memory access consent
 */
router.delete(
  '/:id',
  authenticate,
  requireConsent(ConsentType.MEMORY_ACCESS),
  deleteMemory
);

export default router;

