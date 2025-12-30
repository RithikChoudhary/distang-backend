import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireConsent } from '../middlewares/consent.middleware';
import { ConsentType } from '../models/Consent.model';
import {
  shareLocation,
  stopSharingLocation,
  getPartnerLocation,
  getMyLocationStatus,
} from '../controllers/location.controller';

const router = Router();

/**
 * @route   POST /location/share
 * @desc    Share current location with partner (stays active until stopped)
 * @access  Private - Requires mutual location sharing consent
 * @note    This is a manual action - NO background tracking
 */
router.post(
  '/share',
  authenticate,
  requireConsent(ConsentType.LOCATION_SHARING),
  shareLocation
);

/**
 * @route   POST /location/stop
 * @desc    Stop sharing location with partner
 * @access  Private - Requires mutual location sharing consent
 */
router.post(
  '/stop',
  authenticate,
  requireConsent(ConsentType.LOCATION_SHARING),
  stopSharingLocation
);

/**
 * @route   GET /location/partner
 * @desc    Get partner's current shared location
 * @access  Private - Requires mutual location sharing consent
 */
router.get(
  '/partner',
  authenticate,
  requireConsent(ConsentType.LOCATION_SHARING),
  getPartnerLocation
);

/**
 * @route   GET /location/status
 * @desc    Get my location sharing status
 * @access  Private - Requires mutual location sharing consent
 */
router.get(
  '/status',
  authenticate,
  requireConsent(ConsentType.LOCATION_SHARING),
  getMyLocationStatus
);

export default router;

