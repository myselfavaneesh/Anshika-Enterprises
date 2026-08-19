import { Router } from 'express';
import { recordPayment, getLedger, updatePayment, deletePayment } from '../controllers/payment';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(checkActive);

router.post('/', requirePermission('payments:create'), recordPayment);
router.get('/ledger', requirePermission('payments:view'), getLedger);
router.put('/:id', requirePermission('payments:create'), updatePayment);
router.delete('/:id', requirePermission('payments:create'), deletePayment);

export default router;
