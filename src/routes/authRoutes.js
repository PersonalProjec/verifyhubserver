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

const router = Router();

router.post('/register', register);
router.post('/resend-verify-code', resendVerifyCode);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/request-login-code', requestLoginCode);
router.post('/login-with-code', loginWithCode);

// NEW
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
