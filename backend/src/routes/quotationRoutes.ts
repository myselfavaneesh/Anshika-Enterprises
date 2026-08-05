import { Router } from 'express';
import { createQuotation, getQuotations, getQuotationById, updateQuotation, deleteQuotation, convertQuotation, downloadQuotationPDF, sendQuotationEmailController } from '../controllers/quotationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createQuotation);
router.get('/', getQuotations);
router.get('/:id/pdf', downloadQuotationPDF);
router.post('/:id/email', sendQuotationEmailController);
router.get('/:id', getQuotationById);
router.put('/:id', updateQuotation);
router.delete('/:id', deleteQuotation);
router.post('/:id/convert', convertQuotation);

export default router;
