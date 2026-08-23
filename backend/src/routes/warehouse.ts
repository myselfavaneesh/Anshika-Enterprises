import express from 'express';
import { 
  getWarehouses, 
  createWarehouse, 
  updateWarehouse, 
  deleteWarehouse,
  getStockTransfers,
  createStockTransfer
} from '../controllers/warehouse';

const router = express.Router();

router.get('/', getWarehouses);
router.post('/', createWarehouse);
router.put('/:id', updateWarehouse);
router.delete('/:id', deleteWarehouse);

router.get('/transfers', getStockTransfers);
router.post('/transfers', createStockTransfer);

export default router;
