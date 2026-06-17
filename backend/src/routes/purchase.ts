import { Router } from 'express';
import { createPurchase, getPurchases, getPurchaseById, deletePurchase } from '../controllers/purchase';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createPurchase);
router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.delete('/:id', isAdmin, deletePurchase);

export default router;
