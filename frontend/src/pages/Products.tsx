import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', sku: '', categoryId: '', lowStockThreshold: '5', hsnCode: '', gstRate: '0'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = 
      selectedCategoryFilter === '' || 
      product.categoryId?._id === selectedCategoryFilter;
      
    return matchesSearch && matchesCategory;
  });

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      setProducts(prodRes.data.data || prodRes.data);
      setCategories(catRes.data.data || catRes.data);
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        lowStockThreshold: Number(formData.lowStockThreshold),
        gstRate: Number(formData.gstRate)
      };

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setIsOpen(false);
      fetchData();
      resetForm();
    } catch (error) {
      console.error('Error saving product', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        fetchData();
      } catch (error: any) {
        alert(error.response?.data?.error || 'Error deleting product');
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', sku: '', categoryId: '', lowStockThreshold: '5', hsnCode: '', gstRate: '0' });
  };

  const handleEdit = (product: any) => {
    setEditingId(product._id);
    setFormData({
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId?._id || '',
      lowStockThreshold: product.lowStockThreshold.toString(),
      hsnCode: product.hsnCode || '',
      gstRate: product.gstRate ? product.gstRate.toString() : '0'
    });
    setIsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Products</h2>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SKU</label>
                  <Input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} disabled={!!editingId} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                    value={formData.categoryId}
                    onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  >
                    <option value="">Select Category...</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">HSN Code</label>
                  <Input value={formData.hsnCode} onChange={e => setFormData({...formData, hsnCode: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">GST Rate (%)</label>
                  <Input type="number" min="0" max="100" required value={formData.gstRate} onChange={e => setFormData({...formData, gstRate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Low Stock Threshold</label>
                  <Input type="number" required value={formData.lowStockThreshold} onChange={e => setFormData({...formData, lowStockThreshold: e.target.value})} />
                </div>
              </div>
              <Button type="submit" className="w-full">{editingId ? 'Update' : 'Save'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 w-full gap-4 items-center max-w-lg">
          <div className="flex flex-1 items-center gap-2 bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-1.5 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search products by name, SKU..."
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
          
          <div className="w-48">
            <select 
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>HSN Code</TableHead>
              <TableHead>GST</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center">No products found.</TableCell></TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product._id}>
                  <TableCell className="font-medium">{product.sku}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.categoryId?.name || 'Unknown'}</TableCell>
                  <TableCell>{product.hsnCode || '-'}</TableCell>
                  <TableCell>{product.gstRate ? `${product.gstRate}%` : '0%'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(product._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

export default Products;
