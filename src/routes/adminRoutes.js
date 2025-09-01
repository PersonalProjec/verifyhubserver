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

const router = Router();

router.post('/login', adminLogin);
router.post('/change-password', requireAdmin, changeAdminPassword);
router.get('/me', requireAdmin, getAdminInfo);

router.get('/users', requireAdmin, listUsers);
router.get('/users/:id', requireAdmin, getUserById);
router.get('/users/:id/verifications', requireAdmin, getUserVerifications);
router.get('/users/:id/payments', requireAdmin, getUserPayments);


export default router;
