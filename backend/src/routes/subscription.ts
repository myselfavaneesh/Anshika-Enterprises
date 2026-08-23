import { Router } from 'express';
import { getSubscriptions, createSubscription, cancelSubscription } from '../controllers/subscription';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('sales:view'), getSubscriptions);
router.post('/', requirePermission('sales:create'), createSubscription);
router.post('/:id/cancel', requirePermission('sales:edit'), cancelSubscription);

export default router;
