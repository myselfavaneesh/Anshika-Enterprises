import { Router } from 'express';
import { processReturn } from '../controllers/return';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();

// Only logged in users can process a return
router.post('/', authenticate, processReturn);

export default router;
