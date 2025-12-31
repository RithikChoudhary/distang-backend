import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import {
  sendBuzz,
  getPendingBuzzes,
  sendVoiceMessage,
  getPendingVoiceMessages,
  markVoiceMessageListened,
  getWalkieStatus,
} from '../controllers/walkie.controller';

const router = Router();

// Configure multer with memory storage for Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a',
      'audio/x-m4a', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/aac'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(m4a|mp3|wav|ogg|aac|webm)$/i)) {
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
 * @desc    Send voice message (uploaded to Cloudinary)
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
