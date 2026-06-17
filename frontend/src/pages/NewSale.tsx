import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Trash2, Plus, Receipt } from 'lucide-react';


const NewSale = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  
  const [availableSerials, setAvailableSerials] = useState<any[]>([]);
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [isSerialsDialogOpen, setIsSerialsDialogOpen] = useState(false);
  
  const [discount, setDiscount] = useState('0');
  const [taxRate, setTaxRate] = useState('0'); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products')
        ]);
        setCustomers(custRes.data.data || custRes.data);
        setProducts(prodRes.data.data || prodRes.data);
      } catch (error) {
        console.error('Error fetching data', error);
      }
    };
    fetchData();
  }, []);

  const handleProductSelect = async (productId: string) => {
    setSelectedProductId(productId);
    setSelectedSerials([]);
    if (productId) {
      try {
        const res = await api.get(`/inventory/serials/${productId}?status=IN_STOCK`);
        setAvailableSerials(res.data);
      } catch (error) {
        console.error('Error fetching serials', error);
      }
    } else {
      setAvailableSerials([]);
    }
  };

  const toggleSerialSelection = (serialNumber: string) => {
    if (selectedSerials.includes(serialNumber)) {
      setSelectedSerials(selectedSerials.filter(s => s !== serialNumber));
    } else {
      setSelectedSerials([...selectedSerials, serialNumber]);
    }
  };

  const addToCart = () => {
    if (!selectedProductId || selectedSerials.length === 0) {
      alert("Please select at least one serial number");
      return;
    }
    const product = products.find(p => p._id === selectedProductId);
    if (!product) return;
    
    const qty = selectedSerials.length;

    const existingItemIndex = cart.findIndex(item => item.productId === product._id);
    if (existingItemIndex >= 0) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += qty;
      newCart[existingItemIndex].totalPrice = newCart[existingItemIndex].quantity * newCart[existingItemIndex].unitPrice;
      // Deduplicate serials just in case
      newCart[existingItemIndex].serialNumbers = Array.from(new Set([...newCart[existingItemIndex].serialNumbers, ...selectedSerials]));
      setCart(newCart);
    } else {
      setCart([...cart, {
        productId: product._id,
        name: product.name,
        sku: product.sku,
        quantity: qty,
        unitPrice: 0,
        totalPrice: 0,
        serialNumbers: selectedSerials
      }]);
    }
    
    setSelectedProductId('');
    setSelectedSerials([]);
    setAvailableSerials([]);
    setIsSerialsDialogOpen(false);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const updateItemPrice = (productId: string, price: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        return {
          ...item,
          unitPrice: price,
          totalPrice: item.quantity * price
        };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0); // Inclusive subtotal
  const discountAmount = Number(discount) || 0;
  
  // New GST Math:
  // Grand Total is (inclusive subtotal) - discount
  const grandTotal = subtotal - discountAmount;
  
  const taxRateNum = Number(taxRate) || 0;
  // Taxable Base = GrandTotal / (1 + GST%)
  const taxableAmount = grandTotal / (1 + (taxRateNum / 100));
  const taxAmount = grandTotal - taxableAmount;
  
  const cgstAmount = taxAmount / 2;
  const sgstAmount = taxAmount / 2;

  const handleGenerateInvoice = async () => {
    if (!selectedCustomerId) {
      alert('Please select a customer');
      return;
    }
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxableUnitPrice: item.unitPrice / (1 + (taxRateNum / 100)),
          taxableTotalPrice: item.totalPrice / (1 + (taxRateNum / 100)),
          serialNumbers: item.serialNumbers
        })),
        subtotal,
        discount: discountAmount,
        taxableAmount,
        taxRate: taxRateNum,
        taxAmount,
        cgstAmount,
        sgstAmount,
        grandTotal
      };

      const response = await api.post('/sales', payload);
      const saleId = response.data._id;
      
      window.open(`/sales/${saleId}/print`, '_blank');
      navigate('/sales');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error creating sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">New Sale & Billing</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
              >
                <option value="">Select a Customer...</option>
                {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>)}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Product</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={selectedProductId}
                    onChange={e => handleProductSelect(e.target.value)}
                  >
                    <option value="">Select Product...</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                
                <Button 
                  onClick={() => setIsSerialsDialogOpen(true)}
                  disabled={!selectedProductId || availableSerials.length === 0}
                  variant="secondary"
                >
                  Select Serials ({selectedSerials.length})
                </Button>
                
                <Button onClick={addToCart} disabled={selectedSerials.length === 0}><Plus className="mr-2 h-4 w-4" /> Add</Button>
              </div>

              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Cart is empty</TableCell></TableRow>
                    ) : (
                      cart.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium">
                            {item.name} <span className="text-xs text-muted-foreground ml-2">({item.sku})</span>
                            <div className="text-xs text-slate-500 mt-1 max-w-[200px] truncate">
                              S/N: {item.serialNumbers.join(', ')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01"
                              className="w-24 h-8 text-right ml-auto" 
                              value={item.unitPrice} 
                              onChange={e => updateItemPrice(item.productId, Number(e.target.value))} 
                            />
                          </TableCell>
                          <TableCell className="text-right">₹{item.totalPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => removeFromCart(item.productId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Discount (₹)</span>
                <Input 
                  type="number" 
                  min="0" 
                  className="w-24 h-8 text-right" 
                  value={discount} 
                  onChange={e => setDiscount(e.target.value)} 
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Global GST Rate (%)</span>
                <Input 
                  type="number" 
                  min="0" 
                  className="w-24 h-8 text-right" 
                  value={taxRate} 
                  onChange={e => setTaxRate(e.target.value)} 
                />
              </div>

              <div className="border-t pt-4 flex justify-between text-sm">
                <span className="text-slate-500">Taxable Value</span>
                <span className="font-medium">₹{taxableAmount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">CGST</span>
                <span className="font-medium">₹{cgstAmount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">SGST</span>
                <span className="font-medium">₹{sgstAmount.toFixed(2)}</span>
              </div>

              <div className="border-t pt-4 flex justify-between items-center">
                <span className="text-lg font-bold">Grand Total</span>
                <span className="text-xl font-bold text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>

              <Button 
                className="w-full mt-6" 
                size="lg" 
                onClick={handleGenerateInvoice}
                disabled={isSubmitting || cart.length === 0 || !selectedCustomerId}
              >
                <Receipt className="mr-2 h-5 w-5" />
                Generate Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isSerialsDialogOpen} onOpenChange={setIsSerialsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Serial Numbers</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 max-h-[60vh] overflow-y-auto p-1">
            {availableSerials.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground py-4">No serial numbers in stock</p>
            ) : (
              availableSerials.map(s => {
                // Ignore if already in cart
                const inCart = cart.find(c => c.productId === selectedProductId)?.serialNumbers.includes(s.serialNumber);
                if (inCart) return null;

                const isSelected = selectedSerials.includes(s.serialNumber);
                return (
                  <div 
                    key={s._id}
                    onClick={() => toggleSerialSelection(s.serialNumber)}
                    className={`p-2 border rounded cursor-pointer transition-colors text-sm text-center ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {s.serialNumber}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter className="mt-6 flex justify-between">
            <span className="text-sm font-medium pt-2">Selected: {selectedSerials.length}</span>
            <Button onClick={() => setIsSerialsDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewSale;
