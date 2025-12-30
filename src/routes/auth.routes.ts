import { Router } from 'express';
import {
  initiateSignup,
  verifySignup,
  initiateLogin,
  verifyLogin,
  resendOTP,
  completeProfile,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Signup Flow (OTP-based)
 */
// Step 1: Collect info and send OTP
router.post('/signup/init', initiateSignup);

// Step 2: Verify OTP and create account
router.post('/signup/verify', verifySignup);

/**
 * Login Flow (OTP-based)
 */
// Step 1: Send OTP to email
router.post('/login/init', initiateLogin);

// Step 2: Verify OTP and login
router.post('/login/verify', verifyLogin);

/**
 * Common
 */
// Resend OTP
router.post('/resend-otp', resendOTP);

// Complete profile (requires auth)
router.post('/complete-profile', authenticate, completeProfile);

// Legacy routes (redirect to new flow)
router.post('/register', initiateSignup);
router.post('/login', initiateLogin);

export default router;
