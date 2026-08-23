import express from 'express';
import { 
  getPurchaseOrders, 
  createPurchaseOrder, 
  updatePurchaseOrderStatus
} from '../controllers/purchaseOrder';

const router = express.Router();

router.get('/', getPurchaseOrders);
router.post('/', createPurchaseOrder);
router.patch('/:id/status', updatePurchaseOrderStatus);

export default router;
