import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import {
  sendMessage,
  sendImageMessage,
  sendVoiceMessage,
  getMessages,
  markAsRead,
  deleteMessage,
  getUnreadCount,
} from '../controllers/chat.controller';

const router = Router();

// Configure multer with memory storage for Cloudinary
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

// Voice upload config
const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a',
      'audio/x-m4a', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/aac'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(m4a|mp3|wav|ogg|aac|webm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

/**
 * @route   POST /chat/send
 * @desc    Send a text message to partner
 * @access  Private - Requires being in a couple
 */
router.post('/send', authenticate, sendMessage);

/**
 * @route   POST /chat/send-image
 * @desc    Send an image message to partner (uploaded to Cloudinary)
 * @access  Private - Requires being in a couple
 */
router.post('/send-image', authenticate, imageUpload.single('image'), sendImageMessage);

/**
 * @route   POST /chat/send-voice
 * @desc    Send a voice message to partner (uploaded to Cloudinary)
 * @access  Private - Requires being in a couple
 */
router.post('/send-voice', authenticate, voiceUpload.single('audio'), sendVoiceMessage);

/**
 * @route   GET /chat/messages
 * @desc    Get chat messages (paginated)
 * @access  Private - Requires being in a couple
 */
router.get('/messages', authenticate, getMessages);

/**
 * @route   POST /chat/read
 * @desc    Mark all unread messages as read
 * @access  Private
 */
router.post('/read', authenticate, markAsRead);

/**
 * @route   DELETE /chat/message/:messageId
 * @desc    Delete a message (soft delete)
 * @access  Private
 */
router.delete('/message/:messageId', authenticate, deleteMessage);

/**
 * @route   GET /chat/unread
 * @desc    Get unread message count
 * @access  Private
 */
router.get('/unread', authenticate, getUnreadCount);

export default router;
