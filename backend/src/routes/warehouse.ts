import express from 'express';
import { 
  getWarehouses, 
  createWarehouse, 
  updateWarehouse, 
  deleteWarehouse,
  getStockTransfers,
  createStockTransfer
} from '../controllers/warehouse';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('warehouses:view'), getWarehouses);
router.post('/', requirePermission('warehouses:create'), createWarehouse);
router.put('/:id', requirePermission('warehouses:edit'), updateWarehouse);
router.delete('/:id', requirePermission('warehouses:delete'), deleteWarehouse);

router.get('/transfers', requirePermission('warehouses:view'), getStockTransfers);
router.post('/transfers', requirePermission('warehouses:create'), createStockTransfer);

export default router;
