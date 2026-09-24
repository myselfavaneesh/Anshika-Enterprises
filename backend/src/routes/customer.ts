import express from 'express';
import { getCustomers, createCustomer, updateCustomer, getCustomerLedger, deleteCustomer } from '../controllers/customer';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { CustomerSchema } from '../validators';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('parties:view'), getCustomers);
router.post('/', requirePermission('parties:create'), validate(CustomerSchema), createCustomer);
router.put('/:id', requirePermission('parties:edit'), validate(CustomerSchema), updateCustomer);
router.delete('/:id', requirePermission('parties:delete'), deleteCustomer);
router.get('/:id/ledger', requirePermission('parties:view'), getCustomerLedger);

export default router;
