import express from 'express';
import { 
  getExpenseCategories, 
  createExpenseCategory, 
  updateExpenseCategory, 
  deleteExpenseCategory,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
} from '../controllers/expense';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

// Expense Categories
router.get('/categories', requirePermission('expenses:view'), getExpenseCategories);
router.post('/categories', requirePermission('expenses:create'), createExpenseCategory);
router.put('/categories/:id', requirePermission('expenses:edit'), updateExpenseCategory);
router.delete('/categories/:id', requirePermission('expenses:delete'), deleteExpenseCategory);

// Expenses
router.get('/', requirePermission('expenses:view'), getExpenses);
router.post('/', requirePermission('expenses:create'), createExpense);
router.put('/:id', requirePermission('expenses:edit'), updateExpense);
router.delete('/:id', requirePermission('expenses:delete'), deleteExpense);

export default router;
