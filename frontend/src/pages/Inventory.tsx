import { useEffect, useState } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Search, X, List, Plus, Minus } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { BarcodeScanner } from '../components/BarcodeScanner';

const Inventory = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [isOpenStockIn, setIsOpenStockIn] = useState(false);
  const [isOpenStockOut, setIsOpenStockOut] = useState(false);
  const [isOpenSerials, setIsOpenSerials] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductSerials, setSelectedProductSerials] = useState<any[]>([]);
  
  const [stockInForm, setStockInForm] = useState({
    purchaseInvoiceNumber: '',
    supplierName: '',
    serialNumbers: '',
    purchasePrice: '',
    isFOC: false
  });
  
  const [stockOutForm, setStockOutForm] = useState({
    serialNumbers: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');

  const filteredInventory = inventory.filter(inv => {
    const product = inv.productId || {};
    const matchesSearch = 
      (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    const lowStockThreshold = product.lowStockThreshold ?? 5;
    let matchesStatus = true;
    if (stockStatusFilter === 'LOW') {
      matchesStatus = inv.quantity <= lowStockThreshold && inv.quantity > 0;
    } else if (stockStatusFilter === 'OUT') {
      matchesStatus = inv.quantity === 0;
    }

    return matchesSearch && matchesStatus;
  });

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      setInventory(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching inventory', error);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serials = stockInForm.serialNumbers.split(/[,\n]/).map(s => s.trim()).filter(s => s);
      await api.post('/inventory/stock-in', {
        productId: selectedProductId,
        purchaseInvoiceNumber: stockInForm.purchaseInvoiceNumber,
        supplierName: stockInForm.supplierName,
        serialNumbers: serials,
        purchasePrice: stockInForm.isFOC ? 0 : (Number(stockInForm.purchasePrice) || undefined)
      });
      setIsOpenStockIn(false);
      fetchInventory();
      setStockInForm({ purchaseInvoiceNumber: '', supplierName: '', serialNumbers: '', purchasePrice: '', isFOC: false });
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error adding stock');
    }
  };

  const handleStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serials = stockOutForm.serialNumbers.split(/[,\n]/).map(s => s.trim()).filter(s => s);
      await api.post('/inventory/stock-out', {
        productId: selectedProductId,
        serialNumbers: serials
      });
      setIsOpenStockOut(false);
      fetchInventory();
      setStockOutForm({ serialNumbers: '' });
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error removing stock');
    }
  };

  const openSerials = async (productId: string) => {
    setSelectedProductId(productId);
    try {
      const res = await api.get(`/inventory/serials/${productId}`);
      setSelectedProductSerials(res.data);
      setIsOpenSerials(true);
    } catch (error) {
      console.error('Error fetching serials', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row flex-1 w-full gap-4 sm:items-center max-w-lg">
          <div className="flex flex-1 items-center gap-2 bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-1.5 shadow-sm w-full">
            <Search className="h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search inventory by product name or SKU..."
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
          
          <div className="w-full sm:w-48">
            <select 
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={stockStatusFilter}
              onChange={e => setStockStatusFilter(e.target.value)}
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="LOW">Low Stock Only</option>
              <option value="OUT">Out of Stock Only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center">No inventory found.</TableCell></TableRow>
            ) : (
              filteredInventory.map((inv) => (
                <TableRow key={inv._id}>
                  <TableCell className="font-medium">{inv.productId?.sku}</TableCell>
                  <TableCell>{inv.productId?.name}</TableCell>
                  <TableCell className="text-right font-bold">
                    <span className={inv.quantity <= inv.productId?.lowStockThreshold ? 'text-red-500' : ''}>
                      {inv.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{new Date(inv.updatedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openSerials(inv.productId?._id)}>
                      <List className="mr-2 h-4 w-4" /> Serials
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedProductId(inv.productId?._id); setIsOpenStockIn(true); }}>
                      <Plus className="mr-2 h-4 w-4" /> In
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedProductId(inv.productId?._id); setIsOpenStockOut(true); }}>
                      <Minus className="mr-2 h-4 w-4" /> Out
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stock In Dialog */}
      <Dialog open={isOpenStockIn} onOpenChange={setIsOpenStockIn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock In - Add Serial Numbers</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStockIn} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase Invoice Number</label>
              <Input required value={stockInForm.purchaseInvoiceNumber} onChange={e => setStockInForm({...stockInForm, purchaseInvoiceNumber: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier Name</label>
              <Input value={stockInForm.supplierName} onChange={e => setStockInForm({...stockInForm, supplierName: e.target.value})} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="isFOC"
                checked={stockInForm.isFOC} 
                onChange={e => setStockInForm({...stockInForm, isFOC: e.target.checked})}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="isFOC" className="text-sm font-medium">F.O.C (Free of Cost)</label>
            </div>
            {!stockInForm.isFOC && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Purchase Price (₹)</label>
                <Input type="number" step="0.01" value={stockInForm.purchasePrice} onChange={e => setStockInForm({...stockInForm, purchasePrice: e.target.value})} />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Serial Numbers (comma or newline separated)</label>
              <textarea 
                required
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" 
                value={stockInForm.serialNumbers} 
                onChange={e => setStockInForm({...stockInForm, serialNumbers: e.target.value})} 
                placeholder="SN001, SN002, SN003..."
              />
              <BarcodeScanner 
                onScan={(decodedText) => {
                  setStockInForm(prev => {
                    const current = prev.serialNumbers.split(/[,\n]/).map(s => s.trim()).filter(s => s);
                    if (!current.includes(decodedText)) {
                      const newSerials = current.length > 0 ? prev.serialNumbers + ',\n' + decodedText : decodedText;
                      return { ...prev, serialNumbers: newSerials };
                    }
                    return prev;
                  });
                }} 
                buttonText="Scan Serial Numbers (Camera)" 
              />
            </div>
            <Button type="submit" className="w-full">Confirm Stock In</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Out Dialog */}
      <Dialog open={isOpenStockOut} onOpenChange={setIsOpenStockOut}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Out - Remove Serial Numbers (Damage/Loss)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStockOut} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Serial Numbers to Remove (comma or newline separated)</label>
              <textarea 
                required
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" 
                value={stockOutForm.serialNumbers} 
                onChange={e => setStockOutForm({...stockOutForm, serialNumbers: e.target.value})} 
                placeholder="SN001, SN002..."
              />
              <BarcodeScanner 
                onScan={(decodedText) => {
                  setStockOutForm(prev => {
                    const current = prev.serialNumbers.split(/[,\n]/).map(s => s.trim()).filter(s => s);
                    if (!current.includes(decodedText)) {
                      const newSerials = current.length > 0 ? prev.serialNumbers + ',\n' + decodedText : decodedText;
                      return { ...prev, serialNumbers: newSerials };
                    }
                    return prev;
                  });
                }} 
                buttonText="Scan Serial Numbers (Camera)" 
              />
            </div>
            <Button type="submit" variant="destructive" className="w-full">Confirm Stock Out</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Serials Dialog */}
      <Dialog open={isOpenSerials} onOpenChange={setIsOpenSerials}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Serial Numbers History</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origin Invoice</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedProductSerials.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center">No serial numbers found.</TableCell></TableRow>
                ) : (
                  selectedProductSerials.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell className="font-medium">{s.serialNumber}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'IN_STOCK' ? 'default' : s.status === 'SOLD' ? 'secondary' : 'destructive'}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{s.purchaseInvoiceNumber || '-'}</TableCell>
                      <TableCell>{s.supplierName || '-'}</TableCell>
                      <TableCell>{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Inventory;
