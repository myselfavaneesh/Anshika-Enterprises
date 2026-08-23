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

const router = express.Router();

// Expense Categories
router.get('/categories', getExpenseCategories);
router.post('/categories', createExpenseCategory);
router.put('/categories/:id', updateExpenseCategory);
router.delete('/categories/:id', deleteExpenseCategory);

// Expenses
router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
