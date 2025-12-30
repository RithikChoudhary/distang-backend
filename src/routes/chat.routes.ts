import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
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
import { config } from '../config/env';

const router = Router();

// Multer config for chat images
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(config.uploadPath, 'chat'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

// Voice storage config
const voiceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(config.uploadPath, 'voice'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.m4a';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const voiceUpload = multer({
  storage: voiceStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /m4a|mp3|wav|aac|ogg|webm/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (ext || file.mimetype.startsWith('audio/')) {
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
 * @desc    Send an image message to partner
 * @access  Private - Requires being in a couple
 */
router.post('/send-image', authenticate, imageUpload.single('image'), sendImageMessage);

/**
 * @route   POST /chat/send-voice
 * @desc    Send a voice message to partner
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
