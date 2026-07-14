import { Router } from 'express';
import { createQuotation, getQuotations, getQuotationById, updateQuotation, deleteQuotation } from '../controllers/quotationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createQuotation);
router.get('/', getQuotations);
router.get('/:id', getQuotationById);
router.put('/:id', updateQuotation);
router.delete('/:id', deleteQuotation);

export default router;
