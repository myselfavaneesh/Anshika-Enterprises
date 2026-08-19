import express from 'express';
import { getSuppliers, createSupplier, updateSupplier, getSupplierLedger, deleteSupplier } from '../controllers/supplier';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('parties:view'), getSuppliers);
router.post('/', requirePermission('parties:create'), createSupplier);
router.put('/:id', requirePermission('parties:edit'), updateSupplier);
router.delete('/:id', requirePermission('parties:delete'), deleteSupplier);
router.get('/:id/ledger', requirePermission('parties:view'), getSupplierLedger);

export default router;
