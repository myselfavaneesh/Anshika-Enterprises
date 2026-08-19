import express from 'express';
import { getSales, createSale, downloadInvoice, getSaleById, deleteSale, updateSale, sendSaleEmailController } from '../controllers/sale';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('sales:view'), getSales);
router.post('/', requirePermission('sales:create'), createSale);
router.get('/:id/invoice', requirePermission('sales:view'), downloadInvoice);
router.post('/:id/email', requirePermission('sales:view'), sendSaleEmailController);
router.get('/:id', requirePermission('sales:view'), getSaleById);
router.put('/:id', requirePermission('sales:edit'), updateSale);
router.delete('/:id', requirePermission('sales:delete'), deleteSale);

export default router;
