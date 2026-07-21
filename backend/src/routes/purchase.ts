import { Router } from 'express';
import { createPurchase, getPurchases, getPurchaseById, deletePurchase, updatePurchase } from '../controllers/purchase';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createPurchase);
router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.put('/:id', isAdmin, updatePurchase);
router.delete('/:id', isAdmin, deletePurchase);

export default router;
