import express from 'express';
import { getInventory, stockIn, stockOut, getSerials, searchSerials } from '../controllers/inventory';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getInventory);
router.post('/stock-in', stockIn);
router.post('/stock-out', stockOut);
router.get('/serials/:productId', getSerials);
router.get('/search', searchSerials);

export default router;
