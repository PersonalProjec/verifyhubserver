import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { idempotency } from '../middleware/idempotency.js';
import { rateLimitVerify } from '../middleware/ratelimit.js';
import { requireCreditsForVerification } from '../middleware/requireCredits.js';
import {
  getProviderCatalog,
  runProviderVerification,
} from '../controllers/providerController.js';

const router = Router();

router.get('/catalog', requireUser, getProviderCatalog);
router.post(
  '/run',
  requireUser,
  idempotency(),
  rateLimitVerify(12), // 12 runs/min/user
  requireCreditsForVerification,
  runProviderVerification
);

export default router;
