import express from 'express';
import { getDashboardStats } from '../controllers/dashboard';
import { authenticate, isAdmin } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.get('/', isAdmin, getDashboardStats);

export default router;
