import express from 'express';
import { getSuppliers, createSupplier, updateSupplier, getSupplierLedger, deleteSupplier } from '../controllers/supplier';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { SupplierSchema } from '../validators';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('parties:view'), getSuppliers);
router.post('/', requirePermission('parties:create'), validate(SupplierSchema), createSupplier);
router.put('/:id', requirePermission('parties:edit'), validate(SupplierSchema), updateSupplier);
router.delete('/:id', requirePermission('parties:delete'), deleteSupplier);
router.get('/:id/ledger', requirePermission('parties:view'), getSupplierLedger);

export default router;
