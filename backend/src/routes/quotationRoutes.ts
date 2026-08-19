import { Router } from 'express';
import { createQuotation, getQuotations, getQuotationById, updateQuotation, deleteQuotation, convertQuotation, downloadQuotationPDF, sendQuotationEmailController } from '../controllers/quotationController';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('quotations:view'), getQuotations);
router.post('/', requirePermission('quotations:create'), createQuotation);
router.get('/:id/pdf', requirePermission('quotations:view'), downloadQuotationPDF);
router.post('/:id/email', requirePermission('quotations:view'), sendQuotationEmailController);
router.get('/:id', requirePermission('quotations:view'), getQuotationById);
router.put('/:id', requirePermission('quotations:edit'), updateQuotation);
router.delete('/:id', requirePermission('quotations:delete'), deleteQuotation);
router.post('/:id/convert', requirePermission('quotations:edit', 'sales:create'), convertQuotation);

export default router;
