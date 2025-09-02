import { Router } from 'express';
import multer from 'multer';
import { requireUser } from '../middleware/auth.js';
import {
  uploadVerification,
  getMyVerifications,
  getOneVerification,
  getPublicVerification,
  attestVerification,
  publicReceiptPdf,
  toggleSharePublic,
  sendAttestationEmail,
  runVerification,
} from '../controllers/verifyController.js';
import { requireCreditsForVerification } from '../middleware/requireCredits.js';
import { idempotency } from '../middleware/idempotency.js';
import { rateLimitVerify } from '../middleware/rateLimit.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = Router();

router.post(
  '/upload',
  requireUser,
  requireCreditsForVerification,
  rateLimitVerify(6),
  upload.single('file'),
  uploadVerification
);
router.get('/', requireUser, getMyVerifications);
router.get('/:id', requireUser, getOneVerification);
router.post('/:id/attest', rateLimitVerify(3), attestVerification); // token-based, public caller allowed if token is valid

// Public
router.get('/public/code/:code', rateLimitVerify(60), getPublicVerification);
router.get('/public/receipt/:code.pdf', rateLimitVerify(12), publicReceiptPdf);
router.post('/:id/share', requireUser, toggleSharePublic);
// routes/verifyRoutes.js
router.post(
  '/:id/send-attestation',
  requireUser,
  idempotency(),
  rateLimitVerify(3),
  sendAttestationEmail
);
router.post(
  '/run',
  requireUser,
  requireCreditsForVerification,
  runVerification
);

export default router;
