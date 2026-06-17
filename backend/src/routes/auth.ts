import express from 'express';
import { login, seedAdmin } from '../controllers/auth';

import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

const router = express.Router();

router.post('/login', loginLimiter, login);
router.post('/seed', seedAdmin);

export default router;
