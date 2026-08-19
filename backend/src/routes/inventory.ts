import express from 'express';
import { getInventory, stockIn, stockOut, getSerials, searchSerials, updateSerial, deleteSerial } from '../controllers/inventory';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('inventory:view'), getInventory);
router.post('/stock-in', requirePermission('inventory:edit'), stockIn);
router.post('/stock-out', requirePermission('inventory:edit'), stockOut);
router.get('/serials/:productId', requirePermission('inventory:view'), getSerials);
router.get('/search', requirePermission('inventory:view'), searchSerials);
router.put('/serial/:id', requirePermission('inventory:edit'), updateSerial);
router.delete('/serial/:id', requirePermission('inventory:edit'), deleteSerial);

export default router;
