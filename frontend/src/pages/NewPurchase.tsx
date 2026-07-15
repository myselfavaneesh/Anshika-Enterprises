import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Trash2, Receipt, X } from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';

const SHOP_STATE_CODE = '09'; // Uttar Pradesh

export default function NewPurchase() {
  const navigate = useNavigate();
  
  // Data
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // POS State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  
  const [cart, setCart] = useState<any[]>([]);
  
  // Serial Numbers Entry State
  const [serialInput, setSerialInput] = useState('');
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [isSerialsDialogOpen, setIsSerialsDialogOpen] = useState(false);
  
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState('');
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
        const [supRes, prodRes] = await Promise.all([
          api.get('/suppliers'),
          api.get('/products')
        ]);
        setSuppliers(supRes.data.data || supRes.data);
        setProducts(prodRes.data.data || prodRes.data);
      } catch (error) {
        console.error('Error fetching data', error);
      }
    };
    fetchData();
  }, []);

  // Handle Supplier Selection
  useEffect(() => {
    const s = suppliers.find(sup => `${sup.name} (${sup.phone})` === supplierSearch);
    if (s) setSelectedSupplierId(s.id || s._id);
    else setSelectedSupplierId('');
  }, [supplierSearch, suppliers]);

  // Handle Product Selection
  useEffect(() => {
    const p = products.find(prod => prod.name === productSearch || prod.sku === productSearch);
    if (p && p._id !== selectedProductId) {
      setSelectedProductId(p._id);
      setIsSerialsDialogOpen(true);
    } else if (!p) {
      setSelectedProductId('');
    }
  }, [productSearch, products]);

  const handleSerialScan = (code: string) => {
    if (code && !selectedSerials.includes(code)) {
      setSelectedSerials([...selectedSerials, code]);
    }
  };

  const handleManualSerialAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && serialInput.trim()) {
      e.preventDefault();
      const newSerials = serialInput.split(/[\n,]/).map(s => s.trim()).filter(s => s);
      const uniqueNew = newSerials.filter(s => !selectedSerials.includes(s));
      if (uniqueNew.length > 0) {
        setSelectedSerials([...selectedSerials, ...uniqueNew]);
      }
      setSerialInput('');
    }
  };

  const removeSerial = (serial: string) => {
    setSelectedSerials(selectedSerials.filter(s => s !== serial));
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
      newCart[existingItemIndex].serialNumbers = Array.from(new Set([...newCart[existingItemIndex].serialNumbers, ...selectedSerials]));
      newCart[existingItemIndex].totalPrice = newCart[existingItemIndex].quantity * newCart[existingItemIndex].unitPrice;
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
    setSerialInput('');
    setIsSerialsDialogOpen(false);
    
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

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountVal = parseFloat(discount) || 0;
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const taxRateVal = parseFloat(taxRate) || 0;
  
  // Tax split logic
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let taxAmount = 0;

  const supplier = suppliers.find(s => (s.id || s._id) === selectedSupplierId);
  const supplierState = supplier?.gstStateCode || SHOP_STATE_CODE; 

  taxAmount = (taxableAmount * taxRateVal) / 100;

  if (supplierState === SHOP_STATE_CODE) {
    cgstAmount = taxAmount / 2;
    sgstAmount = taxAmount / 2;
  } else {
    igstAmount = taxAmount;
  }

  const grandTotal = taxableAmount + taxAmount;

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      alert('Please select a supplier');
      return;
    }
    if (!purchaseInvoiceNumber) {
      alert('Please enter the purchase invoice number');
      return;
    }
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }
    if (cart.some(item => item.unitPrice <= 0)) {
      alert('Please enter a valid unit price for all items');
      return;
    }

    setIsSubmitting(true);
    try {
      // Map cart to api payload
      const items = cart.map(item => {
        // Calculate per item taxable amounts (simplified relative to total discount)
        // If there's a global discount, we should ideally distribute it. 
        // For simplicity, if no item-level discount is required, taxableUnitPrice = unitPrice.
        const itemProportion = subtotal > 0 ? (item.totalPrice / subtotal) : 0;
        const itemDiscount = discountVal * itemProportion;
        const itemTaxableTotalPrice = item.totalPrice - itemDiscount;
        const itemTaxableUnitPrice = item.quantity > 0 ? (itemTaxableTotalPrice / item.quantity) : 0;

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxableUnitPrice: itemTaxableUnitPrice,
          taxableTotalPrice: itemTaxableTotalPrice,
          serialNumbers: item.serialNumbers
        };
      });

      const payload = {
        purchaseInvoiceNumber,
        supplierId: selectedSupplierId,
        items,
        subtotal,
        discount: discountVal,
        taxableAmount,
        taxRate: taxRateVal,
        taxAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        grandTotal,
        amountPaid: parseFloat(amountPaid) || 0,
        paymentMode: paymentMode
      };

      await api.post('/purchases', payload);
      
      if (confirm('Purchase recorded successfully. Go to Purchases list?')) {
        navigate('/purchases');
      } else {
        // Reset form
        setCart([]);
        setSelectedSupplierId('');
        setSupplierSearch('');
        setDiscount('0');
        setAmountPaid('');
        setPurchaseInvoiceNumber('');
      }
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.error || 'Failed to record purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">New Purchase</h2>
        <Button variant="outline" onClick={() => navigate('/purchases')}>Cancel</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: POS Entry */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Supplier & Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Supplier</label>
                  <input
                    type="text"
                    list="suppliers-list"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Search supplier..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                  />
                  <datalist id="suppliers-list">
                    {suppliers.map(s => (
                      <option key={s.id || s._id} value={`${s.name} (${s.phone})`} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Purchase Invoice Number</label>
                  <Input 
                    placeholder="e.g. INV-1024"
                    value={purchaseInvoiceNumber}
                    onChange={(e) => setPurchaseInvoiceNumber(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Add Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scan or Search Product</label>
                <input
                  ref={productInputRef}
                  type="text"
                  list="products-list"
                  className="flex h-12 w-full rounded-md border-2 border-primary/20 bg-background px-3 py-2 text-lg focus-visible:border-primary focus-visible:outline-none"
                  placeholder="Barcode or Product Name..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // Attempt select if unique match
                    }
                  }}
                  autoFocus
                />
                <datalist id="products-list">
                  {products.map(p => (
                    <option key={p._id} value={p.name} />
                  ))}
                </datalist>
              </div>

              {/* Cart Table */}
              <div className="rounded-md border mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price (₹)</TableHead>
                      <TableHead className="text-right">Total (₹)</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-6">No items added yet</TableCell></TableRow>
                    ) : (
                      cart.map(item => (
                        <TableRow key={item.productId}>
                          <TableCell>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-slate-500">SN: {item.serialNumbers.length} items</div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              className="w-24 h-8" 
                              value={item.unitPrice || ''}
                              onChange={(e) => updateItemPrice(item.productId, parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.totalPrice.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeFromCart(item.productId)}>
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

        {/* Right Column: Totals & Payment */}
        <div className="space-y-6">
          <Card className="bg-slate-50 dark:bg-slate-900 border-primary/20">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xl flex items-center"><Receipt className="mr-2" /> Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center gap-4">
                <span className="text-sm text-slate-500">Discount (₹)</span>
                <Input 
                  type="number" 
                  className="w-24 text-right h-8" 
                  value={discount} 
                  onChange={(e) => setDiscount(e.target.value)}
                  onFocus={e => e.target.select()}
                />
              </div>

              <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed">
                <span className="text-slate-500">Taxable Amount</span>
                <span className="font-medium">₹{taxableAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center gap-4">
                <span className="text-sm text-slate-500">GST Rate (%)</span>
                <select 
                  className="flex h-8 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm text-right"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
              
              <div className="flex justify-between items-center text-sm text-slate-500">
                <span>Tax Amount</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-lg font-bold">Grand Total</span>
                <span className="text-2xl font-black text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Payment Made</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount Paid (₹)</label>
                <Input 
                  ref={amountPaidRef}
                  type="number" 
                  placeholder="0.00" 
                  className="text-lg"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitBtnRef.current?.focus();
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Mode</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div className="pt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Balance Due</span>
                  <span className="font-bold text-red-500">₹{Math.max(0, grandTotal - (parseFloat(amountPaid) || 0)).toFixed(2)}</span>
                </div>
                <Button 
                  ref={submitBtnRef}
                  className="w-full h-12 text-lg" 
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting || cart.length === 0 || !selectedSupplierId || !purchaseInvoiceNumber}
                >
                  {isSubmitting ? 'Processing...' : 'Complete Purchase'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Serial Number Dialog */}
      <Dialog open={isSerialsDialogOpen} onOpenChange={setIsSerialsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan/Enter Incoming Serial Numbers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-slate-500">
              Product: <span className="font-semibold text-slate-900 dark:text-slate-100">{products.find(p => p._id === selectedProductId)?.name}</span>
            </div>
            
            <BarcodeScanner onScan={handleSerialScan} />
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Or type serial and press Enter</label>
              <Input 
                value={serialInput} 
                onChange={(e) => setSerialInput(e.target.value)}
                onKeyDown={handleManualSerialAdd}
                placeholder="Serial number..." 
              />
            </div>
            
            <div className="border rounded-md p-3 min-h-[100px] max-h-[200px] overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-900">
              {selectedSerials.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-4">No serials added yet</div>
              ) : (
                selectedSerials.map((serial) => (
                  <div key={serial} className="flex items-center justify-between bg-white dark:bg-slate-950 p-2 rounded border text-sm">
                    <span className="font-mono">{serial}</span>
                    <button onClick={() => removeSerial(serial)} className="text-red-500 hover:text-red-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="text-sm font-medium flex justify-between">
              <span>Total Quantity:</span>
              <span className="text-primary">{selectedSerials.length}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSerialsDialogOpen(false)}>Cancel</Button>
            <Button onClick={addToCart} disabled={selectedSerials.length === 0}>Add to Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
