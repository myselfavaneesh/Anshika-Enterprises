import express from 'express';
import { 
  getPurchaseOrders, 
  createPurchaseOrder, 
  updatePurchaseOrderStatus
} from '../controllers/purchaseOrder';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('purchases:view'), getPurchaseOrders);
router.post('/', requirePermission('purchases:create'), createPurchaseOrder);
router.patch('/:id/status', requirePermission('purchases:edit'), updatePurchaseOrderStatus);

export default router;
