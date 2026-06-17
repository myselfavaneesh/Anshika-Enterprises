import { Router } from 'express';
import { createQuotation, getQuotations, getQuotationById } from '../controllers/quotationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createQuotation);
router.get('/', getQuotations);
router.get('/:id', getQuotationById);

export default router;
