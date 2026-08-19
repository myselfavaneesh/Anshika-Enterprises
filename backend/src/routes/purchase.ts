import { Router } from 'express';
import { createPurchase, getPurchases, getPurchaseById, deletePurchase, updatePurchase } from '../controllers/purchase';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('purchases:view'), getPurchases);
router.post('/', requirePermission('purchases:create'), createPurchase);
router.get('/:id', requirePermission('purchases:view'), getPurchaseById);
router.put('/:id', requirePermission('purchases:edit'), updatePurchase);
router.delete('/:id', requirePermission('purchases:delete'), deletePurchase);

export default router;
