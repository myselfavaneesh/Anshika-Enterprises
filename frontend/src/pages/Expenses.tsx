import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Edit, PieChart, Loader2 } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

interface ExpenseCategory {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  categoryId: string;
  category?: ExpenseCategory;
  amount: number;
  date: string;
  paymentMode?: string;
  notes?: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  
  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'CASH',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  const fetchData = async () => {
    try {
      const [expRes, catRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/categories')
      ]);
      setExpenses(expRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsSubmittingCat(true);
    try {
      await api.post('/expenses/categories', { name: newCategoryName });
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to add category. It might already exist.');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        date: new Date(formData.date).toISOString()
      };
      
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      setIsExpenseModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete expense');
    }
  };

  const openNewExpenseModal = () => {
    if (categories.length === 0) {
      toast.error('Please add at least one Expense Category first.');
      return;
    }
    setEditingExpense(null);
    setFormData({
      categoryId: categories[0].id,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMode: 'CASH',
      notes: ''
    });
    setIsExpenseModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Expense Tracking</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
            <PieChart className="w-4 h-4 mr-2" />
            Categories
          </Button>
          <Button onClick={openNewExpenseModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No expenses found.
                    </TableCell>
                  </TableRow>
                )}
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{expense.category?.name}</TableCell>
                    <TableCell>{expense.paymentMode}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{expense.notes}</TableCell>
                    <TableCell className="text-right font-semibold">₹{expense.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingExpense(expense);
                        setFormData({
                          categoryId: expense.categoryId,
                          amount: expense.amount.toString(),
                          date: expense.date.split('T')[0],
                          paymentMode: expense.paymentMode || 'CASH',
                          notes: expense.notes || ''
                        });
                        setIsExpenseModalOpen(true);
                      }}>
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(expense.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Expense Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveExpense} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                required
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Amount (₹)</label>
              <Input 
                type="number" 
                step="0.01" 
                min="0"
                value={formData.amount} 
                onChange={e => setFormData({ ...formData, amount: e.target.value })} 
                required 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })} 
                required 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Payment Mode</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.paymentMode}
                onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input 
                value={formData.notes} 
                onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                placeholder="Optional description..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Expense Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="New Category Name (e.g. Rent)" 
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
              />
              <Button onClick={handleAddCategory} disabled={isSubmittingCat}>
                {isSubmittingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
            <div className="mt-4 border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
              {categories.length === 0 && <p className="text-sm text-muted-foreground text-center">No categories yet.</p>}
              {categories.map(c => (
                <div key={c.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded">
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
