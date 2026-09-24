import { Router } from 'express';
import { recordPayment, getLedger, updatePayment, deletePayment, bulkRecordPayment } from '../controllers/payment';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { PaymentSchema, BulkPaymentSchema } from '../validators';

const router = Router();

router.use(authenticate);
router.use(checkActive);

router.post('/', requirePermission('payments:create'), validate(PaymentSchema), recordPayment);
router.post('/bulk', requirePermission('payments:create'), validate(BulkPaymentSchema), bulkRecordPayment);
router.get('/ledger', requirePermission('payments:view'), getLedger);
router.put('/:id', requirePermission('payments:create'), updatePayment);
router.delete('/:id', requirePermission('payments:create'), deletePayment);

export default router;
