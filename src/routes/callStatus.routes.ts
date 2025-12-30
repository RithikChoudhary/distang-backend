import { Router } from 'express';
import {
  updateCallStatus,
  getMyCallStatus,
  getPartnerCallStatus,
  clearCallStatus,
} from '../controllers/callStatus.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Update my call status
router.post('/', updateCallStatus);

// Get my call status
router.get('/me', getMyCallStatus);

// Get partner's call status
router.get('/partner', getPartnerCallStatus);

// Clear my call status
router.delete('/', clearCallStatus);

export default router;

