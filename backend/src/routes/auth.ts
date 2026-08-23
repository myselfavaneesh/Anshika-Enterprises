import express from 'express';
import { login, seedAdmin, getSessions, logout, logoutAllOther, getLoginHistory } from '../controllers/auth';
import { authenticate } from '../middleware/auth';

import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

const router = express.Router();

router.post('/login', loginLimiter, login);
router.get('/sessions', authenticate, getSessions);
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAllOther);
router.get('/history', authenticate, getLoginHistory);

// Only expose seed endpoint in development
if (process.env.NODE_ENV !== 'production') {
  router.post('/seed', seedAdmin);
}

export default router;
