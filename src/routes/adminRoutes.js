import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
  adminLogin,
  changeAdminPassword,
  getAdminInfo,
} from '../controllers/AdminController.js';
import {
  listUsers,
  getUserById,
  getUserVerifications,
  getUserPayments,
} from '../controllers/adminUsersController.js';
import { getAdminOverview } from '../controllers/adminOverviewController.js';
import { rateLimitVerify } from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', adminLogin);
router.post('/change-password', requireAdmin, changeAdminPassword);
router.get('/me', requireAdmin, getAdminInfo);

router.get('/users', requireAdmin, listUsers);
router.get('/users/:id', requireAdmin,rateLimitVerify(30), getUserById);
router.get('/users/:id/verifications', requireAdmin,rateLimitVerify(60), getUserVerifications);
router.get('/users/:id/payments', requireAdmin, getUserPayments);
router.get('/overview', requireAdmin, getAdminOverview);


export default router;
