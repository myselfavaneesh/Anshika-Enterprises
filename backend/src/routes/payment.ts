import { Router } from 'express';
import { recordPayment, getLedger, updatePayment, deletePayment } from '../controllers/payment';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', recordPayment);
router.get('/ledger', getLedger);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

export default router;
