import express from 'express';
import { getDashboardStats } from '../controllers/dashboard';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.get('/', getDashboardStats);

export default router;
