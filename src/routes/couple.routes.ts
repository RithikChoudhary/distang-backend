import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  sendPairRequest,
  acceptPairRequest,
  rejectPairRequest,
  getPendingRequests,
  breakup,
  getCertificate,
  getRelationshipInfo,
  setRelationshipStartDate,
} from '../controllers/couple.controller';

const router = Router();

/**
 * @route   POST /couple/request
 * @desc    Send a pair request to another user
 * @access  Private
 */
router.post('/request', authenticate, sendPairRequest);

/**
 * @route   POST /couple/accept
 * @desc    Accept a pair request
 * @access  Private
 */
router.post('/accept', authenticate, acceptPairRequest);

/**
 * @route   POST /couple/reject
 * @desc    Reject a pair request
 * @access  Private
 */
router.post('/reject', authenticate, rejectPairRequest);

/**
 * @route   GET /couple/requests
 * @desc    Get pending pair requests
 * @access  Private
 */
router.get('/requests', authenticate, getPendingRequests);

/**
 * @route   POST /couple/breakup
 * @desc    End the relationship
 * @access  Private
 */
router.post('/breakup', authenticate, breakup);

/**
 * @route   GET /couple/certificate
 * @desc    Get relationship certificate (JSON or PDF)
 * @access  Private
 */
router.get('/certificate', authenticate, getCertificate);

/**
 * @route   GET /couple/relationship-info
 * @desc    Get relationship info including days together
 * @access  Private
 */
router.get('/relationship-info', authenticate, getRelationshipInfo);

/**
 * @route   PUT /couple/relationship-start-date
 * @desc    Set or update relationship start date
 * @access  Private
 */
router.put('/relationship-start-date', authenticate, setRelationshipStartDate);

export default router;

