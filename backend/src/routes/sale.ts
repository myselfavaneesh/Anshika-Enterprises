import express from 'express';
import { getSales, createSale, downloadInvoice } from '../controllers/sale';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getSales);
router.post('/', createSale);
router.get('/:id/invoice', downloadInvoice);

export default router;
