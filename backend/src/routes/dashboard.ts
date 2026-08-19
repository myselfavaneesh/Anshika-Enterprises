import express from 'express';
import { getDashboardStats } from '../controllers/dashboard';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);
router.get('/', requirePermission('dashboard:view'), getDashboardStats);

export default router;
