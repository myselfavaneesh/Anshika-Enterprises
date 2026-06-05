import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit, Trash2, Search, AlertCircle, X } from 'lucide-react';

const Categories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (err: any) {
      console.error('Error fetching categories', err);
      setError('Failed to fetch categories. Please try again later.');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError(null);
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, formData);
      } else {
        await api.post('/categories', formData);
      }
      setIsOpen(false);
      fetchCategories();
      resetForm();
    } catch (err: any) {
      console.error('Error saving category', err);
      setDialogError(err.response?.data?.error || 'Failed to save category.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setError(null);
    if (confirm(`Are you sure you want to delete the category "${name}"?`)) {
      try {
        await api.delete(`/categories/${id}`);
        fetchCategories();
      } catch (err: any) {
        console.error('Error deleting category', err);
        setError(err.response?.data?.error || 'Failed to delete category.');
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', description: '' });
    setDialogError(null);
  };

  const handleEdit = (category: any) => {
    setEditingId(category._id);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setIsOpen(true);
  };

  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Categories</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage product categories and types for your inventory
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="shadow-sm hover:shadow-md transition-all duration-200">
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingId ? 'Edit Category' : 'Add New Category'}
              </DialogTitle>
            </DialogHeader>
            {dialogError && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 p-3 rounded-md text-sm mt-2 border border-red-100 dark:border-red-900/30">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>{dialogError}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                <Input 
                  required 
                  placeholder="e.g. Electronics, Office Supplies"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Optional description of the category"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>
              <Button type="submit" className="w-full mt-2">
                {editingId ? 'Update' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error notification bar */}
      {error && (
        <div className="flex items-center justify-between gap-2 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm border border-red-100 dark:border-red-900/30 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)} 
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Search Filter Toolbar */}
      <div className="flex items-center gap-2 max-w-sm bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-1.5 shadow-sm">
        <Search className="h-4 w-4 text-slate-400" />
        <input 
          type="text"
          placeholder="Filter categories..."
          className="flex-1 bg-transparent border-0 outline-none text-sm p-0.5 placeholder-slate-400 focus:ring-0 focus:ring-offset-0"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
            <TableRow>
              <TableHead className="w-1/3">Name</TableHead>
              <TableHead className="w-1/2">Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-slate-500 dark:text-slate-400">
                  {searchTerm ? 'No matching categories found.' : 'No categories found.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow 
                  key={category._id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors duration-150"
                >
                  <TableCell className="font-semibold text-slate-900 dark:text-white">
                    {category.name}
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400">
                    {category.description || <span className="text-slate-300 dark:text-slate-700 italic">No description</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(category)}
                        className="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        onClick={() => handleDelete(category._id, category.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Categories;
