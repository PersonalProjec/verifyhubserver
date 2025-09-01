import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import {
  getMe,
  updateMe,
  changePassword,
} from '../controllers/userController.js';

const router = Router();

router.get('/me', requireUser, getMe);
router.patch('/me', requireUser, updateMe);
router.post('/change-password', requireUser, changePassword);

export default router;
