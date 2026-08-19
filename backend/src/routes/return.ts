import { Router } from 'express';
import { processReturn } from '../controllers/return';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(checkActive);

// Return requires sales:edit permission (it modifies a sale)
router.post('/', requirePermission('sales:edit'), processReturn);

export default router;
