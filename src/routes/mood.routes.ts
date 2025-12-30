import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  setMood,
  getPartnerMood,
  getMyMood,
  getMoodHistory,
  getMoodTypes,
} from '../controllers/mood.controller';

const router = Router();

/**
 * @route   POST /mood
 * @desc    Set current mood
 * @access  Private
 */
router.post('/', authenticate, setMood);

/**
 * @route   GET /mood/partner
 * @desc    Get partner's current mood
 * @access  Private
 */
router.get('/partner', authenticate, getPartnerMood);

/**
 * @route   GET /mood/me
 * @desc    Get my current mood
 * @access  Private
 */
router.get('/me', authenticate, getMyMood);

/**
 * @route   GET /mood/history
 * @desc    Get mood history for the couple
 * @access  Private
 */
router.get('/history', authenticate, getMoodHistory);

/**
 * @route   GET /mood/types
 * @desc    Get all mood types
 * @access  Private
 */
router.get('/types', authenticate, getMoodTypes);

export default router;

