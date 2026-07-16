import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Trash2, Receipt } from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';

const SHOP_STATE_CODE = '09'; // Uttar Pradesh

export default function NewSale() {
  const navigate = useNavigate();
  
  // Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // POS State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  
  const [cart, setCart] = useState<any[]>([]);
  
  const [availableSerials, setAvailableSerials] = useState<any[]>([]);
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [isSerialsDialogOpen, setIsSerialsDialogOpen] = useState(false);
  
  const [discount, setDiscount] = useState('0');
  const [taxRate, setTaxRate] = useState('18'); 
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for keyboard navigation
  const productInputRef = useRef<HTMLInputElement>(null);
  const amountPaidRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products?limit=10000')
        ]);
        setCustomers(custRes.data.data || custRes.data);
        setProducts(prodRes.data.data || prodRes.data);
      } catch (error) {
        console.error('Error fetching data', error);
      }
    };
    fetchData();
  }, []);

  // Handle Customer Selection
  useEffect(() => {
    const c = customers.find(c => `${c.name} (${c.phone})` === customerSearch);
    if (c) setSelectedCustomerId(c._id);
    else setSelectedCustomerId('');
  }, [customerSearch, customers]);

  // Handle Product Selection
  useEffect(() => {
    if (!productSearch) {
      setSelectedProductId('');
      setAvailableSerials([]);
      return;
    }
    const searchLower = productSearch.toLowerCase();
    const p = products.find(prod => {
      const name = prod.name?.toLowerCase() || '';
      const sku = prod.sku?.toLowerCase() || '';
      const combined = prod.sku ? `${name} (${sku})` : name;
      return name === searchLower || sku === searchLower || combined === searchLower;
    });

    if (p && p._id !== selectedProductId) {
      setSelectedProductId(p._id);
      fetchSerials(p._id);
    } else if (!p) {
      setSelectedProductId('');
      setAvailableSerials([]);
    }
  }, [productSearch, products]);

  const fetchSerials = async (productId: string) => {
    try {
      const res = await api.get(`/inventory/serials/${productId}?status=IN_STOCK`);
      setAvailableSerials(res.data);
      if (res.data.length > 0) {
        setIsSerialsDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching serials', error);
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
    if (!selectedProductId || selectedSerials.length === 0) return;
    
    const product = products.find(p => p._id === selectedProductId);
    if (!product) return;
    
    const qty = selectedSerials.length;

    const existingItemIndex = cart.findIndex(item => item.productId === product._id);
    if (existingItemIndex >= 0) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += qty;
      newCart[existingItemIndex].totalPrice = newCart[existingItemIndex].quantity * newCart[existingItemIndex].unitPrice;
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
    
    // Reset product selection
    setProductSearch('');
    setSelectedProductId('');
    setSelectedSerials([]);
    setAvailableSerials([]);
    setIsSerialsDialogOpen(false);
    
    // Focus back to product search for next item
    setTimeout(() => productInputRef.current?.focus(), 100);
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

  // Math
  const selectedCustomer = customers.find(c => c._id === selectedCustomerId);
  const isInterState = selectedCustomer?.stateCode && selectedCustomer.stateCode !== SHOP_STATE_CODE;

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0); // Inclusive subtotal
  const discountAmount = Number(discount) || 0;
  
  const grandTotal = subtotal - discountAmount;
  const taxRateNum = Number(taxRate) || 0;
  
  const taxableAmount = grandTotal / (1 + (taxRateNum / 100));
  const taxAmount = grandTotal - taxableAmount;
  
  const cgstAmount = isInterState ? 0 : taxAmount / 2;
  const sgstAmount = isInterState ? 0 : taxAmount / 2;
  // Note: Backend might need igstAmount if it was added, but we'll stick to 0 cgst/sgst for IGST scenarios for now, or just send cgst=0, sgst=0.

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
        grandTotal,
        amountPaid: Number(amountPaid) || 0,
        paymentMode
      };

      const response = await api.post('/sales', payload);
      const saleId = response.data._id;
      
      window.open(`/sales/${saleId}/print`, '_blank');
      navigate('/parties');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error creating sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        amountPaidRef.current?.focus();
      } else if (e.key === 'F9') {
        e.preventDefault();
        submitBtnRef.current?.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">POS / New Sale</h2>
        <div className="text-sm text-slate-500">
          <kbd className="px-2 py-1 bg-slate-100 border rounded mr-2">F8</kbd> Jump to Payment
          <kbd className="px-2 py-1 bg-slate-100 border rounded ml-4 mr-2">F9</kbd> Submit
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-t-4 border-t-primary shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Customer Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <Input 
                list="customers-list"
                placeholder="Search Customer by Name or Phone... (Press Tab to move)"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="text-lg py-6 shadow-inner"
                autoFocus
              />
              <datalist id="customers-list">
                {customers.map(c => <option key={c._id} value={`${c.name} (${c.phone})`} />)}
              </datalist>
              {selectedCustomer && (
                <div className="mt-3 p-3 bg-green-50 text-green-800 rounded-md flex justify-between items-center text-sm">
                  <div>
                    <span className="font-semibold">{selectedCustomer.name}</span> • {selectedCustomer.phone}
                    {selectedCustomer.gstNumber && ` • GST: ${selectedCustomer.gstNumber}`}
                  </div>
                  <div className="font-medium">
                    State Code: {selectedCustomer.stateCode || '-'} {isInterState ? '(IGST)' : '(CGST/SGST)'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Cart Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6 w-full">
                <div className="w-full space-y-2">
                  <Input 
                    list="products-list"
                    placeholder="Search Product by Name or SKU..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    ref={productInputRef}
                    className="text-lg font-medium"
                  />
                  <datalist id="products-list">
                    {products.map(p => <option key={p._id} value={p.sku ? `${p.name} (${p.sku})` : p.name} />)}
                  </datalist>
                </div>
                <Button 
                  onClick={() => setIsSerialsDialogOpen(true)}
                  disabled={!selectedProductId || availableSerials.length === 0}
                  variant="secondary"
                  className="h-10 w-full sm:w-auto"
                >
                  Serials ({selectedSerials.length})
                </Button>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right w-16">Qty</TableHead>
                      <TableHead className="text-right w-32">Unit Price (Inc. Tax)</TableHead>
                      <TableHead className="text-right w-32">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Cart is empty. Scan a product to begin.</TableCell></TableRow>
                    ) : (
                      cart.map((item) => (
                        <TableRow key={item.productId} className="hover:bg-slate-50">
                          <TableCell className="font-medium">
                            {item.name}
                            <div className="text-xs font-mono text-slate-500 mt-1 truncate max-w-[250px]">
                              {item.serialNumbers.join(', ')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <Input 
                              type="number" 
                              min="0" 
                              className="w-full h-8 text-right font-medium" 
                              value={item.unitPrice || ''} 
                              onChange={e => updateItemPrice(item.productId, Number(e.target.value))}
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg text-primary">₹{item.totalPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeFromCart(item.productId)}>
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
          <Card className="shadow-lg border-primary/20 sticky top-6">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle>Billing Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal (Inc. Tax)</span>
                <span className="font-semibold text-lg">₹{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Discount</span>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                  <Input 
                    type="number" 
                    min="0" 
                    className="pl-7 text-right font-medium" 
                    value={discount} 
                    onChange={e => setDiscount(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-600">GST Rate (%)</span>
                <select 
                  className="w-32 h-10 rounded-md border border-input bg-background px-3 text-right font-medium"
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value)}
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm border">
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxable Value</span>
                  <span className="font-medium">₹{taxableAmount.toFixed(2)}</span>
                </div>
                {isInterState ? (
                  <div className="flex justify-between text-indigo-600">
                    <span>IGST ({taxRate}%)</span>
                    <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-indigo-600">
                      <span>CGST ({Number(taxRate)/2}%)</span>
                      <span className="font-medium">₹{cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-600">
                      <span>SGST ({Number(taxRate)/2}%)</span>
                      <span className="font-medium">₹{sgstAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-xl font-bold">Grand Total</span>
                <span className="text-3xl font-black text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>

              <div className="border-t-2 border-dashed pt-5 mt-5">
                <label className="text-sm font-bold text-slate-700 mb-2 block">Payment Received</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                    <Input 
                      type="number" 
                      min="0" 
                      ref={amountPaidRef}
                      className="pl-7 h-12 text-xl font-bold text-green-700" 
                      placeholder="0.00"
                      value={amountPaid} 
                      onChange={e => setAmountPaid(e.target.value)} 
                    />
                  </div>
                  <select 
                    className="w-28 h-12 rounded-md border border-input bg-background px-3 font-medium"
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK">BANK</option>
                  </select>
                </div>
                {Number(amountPaid) > 0 && (
                  <div className="mt-2 text-right text-sm">
                    {Number(amountPaid) > grandTotal ? (
                      <span className="text-orange-600 font-medium">Return Change: ₹{(Number(amountPaid) - grandTotal).toFixed(2)}</span>
                    ) : (
                      <span className="text-red-600 font-medium">Due Balance: ₹{(grandTotal - Number(amountPaid)).toFixed(2)}</span>
                    )}
                  </div>
                )}
              </div>

              <Button 
                ref={submitBtnRef}
                className="w-full h-14 text-lg font-bold mt-4 shadow-md" 
                onClick={handleGenerateInvoice}
                disabled={isSubmitting || cart.length === 0 || !selectedCustomerId}
              >
                <Receipt className="mr-2 h-6 w-6" />
                Complete Sale (F9)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isSerialsDialogOpen} onOpenChange={setIsSerialsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Serial Numbers</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <BarcodeScanner 
              onScan={(decodedText) => {
                const found = availableSerials.find(s => s.serialNumber === decodedText);
                if (found) toggleSerialSelection(decodedText);
              }}
              buttonText="Scan Serial Number (Camera)"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4 max-h-[60vh] overflow-y-auto p-2">
            {availableSerials.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground py-8">No serial numbers in stock</p>
            ) : (
              availableSerials.map(s => {
                const inCart = cart.find(c => c.productId === selectedProductId)?.serialNumbers.includes(s.serialNumber);
                if (inCart) return null;

                const isSelected = selectedSerials.includes(s.serialNumber);
                return (
                  <div 
                    key={s._id}
                    onClick={() => toggleSerialSelection(s.serialNumber)}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all text-sm font-mono text-center select-none ${
                      isSelected 
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-[0.98]' 
                      : 'hover:border-primary/50 hover:bg-slate-50 bg-white'
                    }`}
                  >
                    {s.serialNumber}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter className="mt-6 flex justify-between items-center border-t pt-4">
            <span className="text-lg font-bold text-primary">Selected: {selectedSerials.length}</span>
            <Button onClick={addToCart} size="lg" className="px-8">Confirm & Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
