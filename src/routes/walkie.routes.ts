import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middlewares/auth.middleware';
import {
  sendBuzz,
  getPendingBuzzes,
  sendVoiceMessage,
  getPendingVoiceMessages,
  markVoiceMessageListened,
  getWalkieStatus,
} from '../controllers/walkie.controller';
import { config } from '../config/env';

const router = Router();

// Create voice uploads directory
const voiceDir = path.join(config.uploadPath, 'voice');
if (!fs.existsSync(voiceDir)) {
  fs.mkdirSync(voiceDir, { recursive: true });
}

// Configure multer for voice messages
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, voiceDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.m4a';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.m4a')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type.'));
    }
  },
});

/**
 * @route   POST /walkie/buzz
 * @desc    Send a buzz (vibration) to partner
 * @access  Private
 */
router.post('/buzz', authenticate, sendBuzz);

/**
 * @route   GET /walkie/buzzes
 * @desc    Get pending buzzes
 * @access  Private
 */
router.get('/buzzes', authenticate, getPendingBuzzes);

/**
 * @route   POST /walkie/voice
 * @desc    Send voice message
 * @access  Private
 */
router.post('/voice', authenticate, upload.single('audio'), sendVoiceMessage);

/**
 * @route   GET /walkie/voice
 * @desc    Get pending voice messages
 * @access  Private
 */
router.get('/voice', authenticate, getPendingVoiceMessages);

/**
 * @route   POST /walkie/voice/:messageId/listened
 * @desc    Mark voice message as listened
 * @access  Private
 */
router.post('/voice/:messageId/listened', authenticate, markVoiceMessageListened);

/**
 * @route   GET /walkie/status
 * @desc    Get walkie-talkie status
 * @access  Private
 */
router.get('/status', authenticate, getWalkieStatus);

export default router;

