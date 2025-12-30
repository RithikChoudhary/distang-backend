import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { updateConsent, getConsentStatus } from '../controllers/consent.controller';

const router = Router();

/**
 * @route   POST /consent/update
 * @desc    Update consent settings
 * @access  Private
 */
router.post('/update', authenticate, updateConsent);

/**
 * @route   GET /consent/status
 * @desc    Get current consent status
 * @access  Private
 */
router.get('/status', authenticate, getConsentStatus);

export default router;

