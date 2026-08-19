import express from 'express';
import { getCustomers, createCustomer, updateCustomer, getCustomerLedger, deleteCustomer } from '../controllers/customer';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('parties:view'), getCustomers);
router.post('/', requirePermission('parties:create'), createCustomer);
router.put('/:id', requirePermission('parties:edit'), updateCustomer);
router.delete('/:id', requirePermission('parties:delete'), deleteCustomer);
router.get('/:id/ledger', requirePermission('parties:view'), getCustomerLedger);

export default router;
