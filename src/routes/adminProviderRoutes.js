import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
  listProvidersAdmin,
  getProviderAdmin,
  updateProviderAdmin,
  pingProviderAdmin,
} from '../controllers/adminProviderController.js';

const router = Router();

router.get('/', requireAdmin, listProvidersAdmin);
router.get('/:key', requireAdmin, getProviderAdmin);
router.patch('/:key', requireAdmin, updateProviderAdmin);
router.post('/:key/ping', requireAdmin, pingProviderAdmin);

export default router;
