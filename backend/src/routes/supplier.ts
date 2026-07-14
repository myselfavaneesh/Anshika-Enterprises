import express from 'express';
import { getSuppliers, createSupplier, updateSupplier, getSupplierLedger, deleteSupplier } from '../controllers/supplier';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);
router.get('/:id/ledger', getSupplierLedger);

export default router;
