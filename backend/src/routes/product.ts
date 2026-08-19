import express from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/product';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('products:view'), getProducts);
router.post('/', requirePermission('products:create'), createProduct);
router.put('/:id', requirePermission('products:edit'), updateProduct);
router.delete('/:id', requirePermission('products:delete'), deleteProduct);

export default router;
