import express from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('categories:view'), getCategories);
router.post('/', requirePermission('categories:create'), createCategory);
router.put('/:id', requirePermission('categories:edit'), updateCategory);
router.delete('/:id', requirePermission('categories:delete'), deleteCategory);

export default router;
