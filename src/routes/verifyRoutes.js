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
} from '../controllers/verifyController.js';
import { requireCreditsForVerification } from '../middleware/requireCredits.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = Router();

router.post(
  '/upload',
  requireUser,
  requireCreditsForVerification,
  upload.single('file'),
  uploadVerification
);
router.get('/', requireUser, getMyVerifications);
router.get('/:id', requireUser, getOneVerification);
router.post('/:id/attest', attestVerification); // token-based, public caller allowed if token is valid

// Public
router.get('/public/code/:code', getPublicVerification);
router.get('/public/receipt/:code.pdf', publicReceiptPdf);
router.post('/:id/share', requireUser, toggleSharePublic);
// routes/verifyRoutes.js
router.post('/:id/send-attestation', requireUser, sendAttestationEmail);

export default router;
