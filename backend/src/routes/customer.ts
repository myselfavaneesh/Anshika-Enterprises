import express from 'express';
import { getCustomers, createCustomer, updateCustomer, getCustomerLedger } from '../controllers/customer';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getCustomers);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.get('/:id/ledger', getCustomerLedger);

export default router;
