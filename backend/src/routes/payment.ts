import { Router } from 'express';
import { recordPayment, getLedger, deletePayment } from '../controllers/payment';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', recordPayment);
router.get('/ledger', getLedger);
router.delete('/:id', isAdmin, deletePayment);

export default router;
