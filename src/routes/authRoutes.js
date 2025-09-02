import { Router } from 'express';
import {
  register,
  resendVerifyCode,
  verifyEmail,
  login,
  requestLoginCode,
  loginWithCode,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { idempotency } from '../middleware/idempotency.js';
import { rateLimitVerify } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', register);
router.post('/resend-verify-code', resendVerifyCode);
router.post('/verify-email', rateLimitVerify(6),verifyEmail);
router.post('/login',rateLimitVerify(10), login);
router.post('/request-login-code', requestLoginCode);
router.post('/login-with-code',rateLimitVerify(1), loginWithCode);

// NEW
router.post('/forgot-password',rateLimitVerify(1), forgotPassword);
router.post('/reset-password', idempotency(),rateLimitVerify(5), resetPassword);

export default router;
