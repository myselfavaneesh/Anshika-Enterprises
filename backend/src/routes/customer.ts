import express from 'express';
import { getCustomers, createCustomer, updateCustomer } from '../controllers/customer';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getCustomers);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);

export default router;
