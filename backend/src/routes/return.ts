import { Router } from 'express';
import { processReturn, getReturns } from '../controllers/return';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(checkActive);

// Return requires sales:edit permission (it modifies a sale)
router.get('/', requirePermission('sales:view'), getReturns);
router.post('/', requirePermission('sales:edit'), processReturn);

export default router;
