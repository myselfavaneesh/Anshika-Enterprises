import express from 'express';
import { getSales, createSale, downloadInvoice, getSaleById, deleteSale, updateSale, sendSaleEmailController } from '../controllers/sale';
import { authenticate, isAdmin } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getSales);
router.post('/', createSale);
router.get('/:id/invoice', downloadInvoice);
router.post('/:id/email', sendSaleEmailController);
router.get('/:id', getSaleById);
router.put('/:id', isAdmin, updateSale);
router.delete('/:id', isAdmin, deleteSale);

export default router;
