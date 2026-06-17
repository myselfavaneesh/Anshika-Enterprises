import express from 'express';
import { getSales, createSale, downloadInvoice, getSaleById, deleteSale } from '../controllers/sale';
import { authenticate, isAdmin } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getSales);
router.post('/', createSale);
router.get('/:id/invoice', downloadInvoice);
router.get('/:id', getSaleById);
router.delete('/:id', isAdmin, deleteSale);

export default router;
