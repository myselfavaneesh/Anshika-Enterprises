import express from 'express';
import { getSuppliers, createSupplier, updateSupplier, getSupplierLedger } from '../controllers/supplier';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.get('/:id/ledger', getSupplierLedger);

export default router;
