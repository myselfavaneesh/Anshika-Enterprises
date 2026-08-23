import toast from 'react-hot-toast';
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Trash2, Receipt, PenTool, Loader2, Search, X, ChevronDown } from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import SignatureCanvas from 'react-signature-canvas';

const SHOP_STATE_CODE = '09'; // Uttar Pradesh

export default function NewSale() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quotationId = searchParams.get('quotationId');
  
  // Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // POS State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  
  const [cart, setCart] = useState<any[]>([]);
  
  const [availableSerials, setAvailableSerials] = useState<any[]>([]);
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [isSerialsDialogOpen, setIsSerialsDialogOpen] = useState(false);
  
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState('1');
  
  const [discount, setDiscount] = useState('0');
  const [invoiceType, setInvoiceType] = useState('GST');
  const [documentType, setDocumentType] = useState('TAX_INVOICE');
  
  // Dynamic Services selected
  const [selectedServices, setSelectedServices] = useState<{name: string, amount: string, gstRate: string, isGstInclusive: boolean}[]>([]);

  // Multiple Payments
  const [payments, setPayments] = useState([{ paymentMode: 'CASH', amount: '', emiProvider: '', emiReferenceNumber: '', referenceNumber: '' }]);
  
  // Compliance
  const [eInvoiceAckNo, setEInvoiceAckNo] = useState('');
  const [eWayBillNo, setEWayBillNo] = useState('');
  const signatureRef = useRef<SignatureCanvas>(null);
  
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

        if (quotationId) {
          const quotRes = await api.get(`/quotations/${quotationId}`);
          const q = quotRes.data;
          
          setSelectedCustomerId(q.customerId?._id || q.customerId?.id || q.customerId);
          setCustomerSearch(q.customerId?.name ? `${q.customerId.name} (${q.customerId.phone})` : '');
          setDiscount(q.discount.toString());
          if (q.invoiceType) {
            setInvoiceType(q.invoiceType);
          }
          if (q.services && q.services.length > 0) {
            setSelectedServices(q.services.map((s: any) => ({
              name: s.name,
              amount: s.amount.toString(),
              gstRate: s.gstRate?.toString() || '0',
              isGstInclusive: s.isGstInclusive !== undefined ? s.isGstInclusive : true
            })));
          }
          setCart(q.items.map((item: any) => ({
            productId: item.productId?._id || item.productId?.id || item.productId,
            name: item.productId?.name,
            sku: item.productId?.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            serialNumbers: [],
            gstRate: item.gstRate || item.productId?.gstRate || 0,
            isGstInclusive: item.productId?.isGstInclusive !== undefined ? item.productId.isGstInclusive : true,
            wattage: item.wattage || item.productId?.wattage || 0
          })));
        }
      } catch (error) {
        console.error('Error fetching data', error);
      }
    };
    fetchData();
  }, [quotationId]);

  // Handle Customer Selection from search input (only when user is typing, not on quotation load)
  useEffect(() => {
    if (!customerSearch) {
      // Only clear if nothing is typed — don't clear ID set by quotation load
      setSelectedCustomerId('');
      return;
    }
    const c = customers.find(c =>
      `${c.name} (${c.phone})` === customerSearch ||
      `${c.name} (${c.phone || 'No Phone'})` === customerSearch
    );
    if (c) setSelectedCustomerId(c._id);
    // If no exact match found, do NOT clear selectedCustomerId — 
    // it may have been set directly from quotation load (by _id)
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
      if (p.trackSerials === false) {
        setIsQuantityDialogOpen(true);
        setSelectedQuantity('1');
      } else {
        fetchSerials(p._id);
      }
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
    if (!selectedProductId) return;
    
    const product = products.find(p => p._id === selectedProductId);
    if (!product) return;
    
    if (product.trackSerials !== false && selectedSerials.length === 0) return;
    
    const qty = product.trackSerials === false ? Number(selectedQuantity) : selectedSerials.length;
    if (qty <= 0) return;

    const existingItemIndex = cart.findIndex(item => item.productId === product._id);
    if (existingItemIndex >= 0) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += qty;
      const calcQty = (newCart[existingItemIndex].wattage || 0) > 0 ? newCart[existingItemIndex].quantity * newCart[existingItemIndex].wattage : newCart[existingItemIndex].quantity;
      newCart[existingItemIndex].totalPrice = calcQty * newCart[existingItemIndex].unitPrice;
      newCart[existingItemIndex].serialNumbers = Array.from(new Set([...newCart[existingItemIndex].serialNumbers, ...selectedSerials]));
      setCart(newCart);
    } else {
      const wattage = product.wattage || 0;
      const calcQty = wattage > 0 ? qty * wattage : qty;
      setCart([...cart, {
        productId: product._id,
        name: product.name,
        sku: product.sku,
        quantity: qty,
        unitPrice: product.sellingPrice || 0,
        totalPrice: calcQty * (product.sellingPrice || 0),
        serialNumbers: selectedSerials,
        gstRate: product.gstRate || 0,
        isGstInclusive: product.isGstInclusive !== undefined ? product.isGstInclusive : true,
        wattage: wattage
      }]);
    }
    
    // Reset product selection
    setProductSearch('');
    setSelectedProductId('');
    setSelectedSerials([]);
    setAvailableSerials([]);
    setIsSerialsDialogOpen(false);
    setIsQuantityDialogOpen(false);
    setSelectedQuantity('1');
    
    // Focus back to product search for next item
    setTimeout(() => productInputRef.current?.focus(), 100);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const updateItemPrice = (productId: string, price: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const calcQty = (item.wattage || 0) > 0 ? item.quantity * item.wattage : item.quantity;
        return {
          ...item,
          unitPrice: price,
          totalPrice: calcQty * price
        };
      }
      return item;
    }));
  };

  // Math
  const selectedCustomer = customers.find(c => c._id === selectedCustomerId);
  const isInterState = selectedCustomer?.stateCode && selectedCustomer.stateCode !== SHOP_STATE_CODE;

  let subtotal = 0;
  let taxableAmount = 0;
  let taxAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;

  // Process items
  const processedCart = cart.map(item => {
    let trueGstRate = item.gstRate || 0;
    if (invoiceType === 'NON_GST') trueGstRate = 0;

    const lineTotal = item.totalPrice;
    subtotal += lineTotal;

    let lineTaxable = lineTotal;
    let lineTax = 0;

    if (trueGstRate > 0) {
      if (item.isGstInclusive) {
        lineTaxable = lineTotal / (1 + (trueGstRate / 100));
        lineTax = lineTotal - lineTaxable;
      } else {
        lineTaxable = lineTotal;
        lineTax = lineTotal * (trueGstRate / 100);
      }
    }

    taxableAmount += lineTaxable;
    taxAmount += lineTax;

    let lineCgst = 0, lineSgst = 0;
    if (!isInterState) {
      lineCgst = lineTax / 2;
      lineSgst = lineTax / 2;
    }
    cgstAmount += lineCgst;
    sgstAmount += lineSgst;

    return {
      ...item,
      taxableUnitPrice: lineTaxable / item.quantity,
      taxableTotalPrice: lineTaxable,
      cgstAmount: lineCgst,
      sgstAmount: lineSgst
    };
  });

  const discountAmount = Number(discount) || 0;
  
  let servicesTotal = 0;
  const processedServices = selectedServices.map(s => {
    const sAmount = Number(s.amount) || 0;
    servicesTotal += sAmount;
    
    let sGstRate = Number(s.gstRate) || 0;
    if (invoiceType === 'NON_GST') sGstRate = 0;

    let sTaxable = sAmount;
    let sTax = 0;

    if (sGstRate > 0) {
      if (s.isGstInclusive) {
        sTaxable = sAmount / (1 + (sGstRate / 100));
        sTax = sAmount - sTaxable;
      } else {
        sTaxable = sAmount;
        sTax = sAmount * (sGstRate / 100);
      }
    }

    taxableAmount += sTaxable;
    taxAmount += sTax;

    let sCgst = 0, sSgst = 0;
    if (!isInterState) {
      sCgst = sTax / 2;
      sSgst = sTax / 2;
    }
    cgstAmount += sCgst;
    sgstAmount += sSgst;

    return {
      ...s,
      taxableAmount: sTaxable,
      cgstAmount: sCgst,
      sgstAmount: sSgst
    };
  });
  
  const grandTotal = subtotal - discountAmount + servicesTotal;

  const handleGenerateInvoice = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Validate serial numbers for serial-tracked products
    for (const item of cart) {
      const product = products.find(p => p._id === item.productId);
      if (product?.trackSerials !== false) {
        // This product tracks serials
        if (!item.serialNumbers || item.serialNumbers.length !== item.quantity) {
          toast.error(
            `Please select ${item.quantity} serial number(s) for "${item.name}" before generating invoice. Click the "Serials" button next to the product search.`,
            { duration: 6000 }
          );
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        invoiceType,
        items: processedCart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxableUnitPrice: item.taxableUnitPrice,
          taxableTotalPrice: item.taxableTotalPrice,
          gstRate: item.gstRate,
          cgstAmount: item.cgstAmount,
          sgstAmount: item.sgstAmount,
          serialNumbers: item.serialNumbers,
          wattage: item.wattage || 0
        })),
        subtotal,
        discount: discountAmount,
        taxableAmount,
        taxRate: 0,
        taxAmount,
        cgstAmount,
        sgstAmount,
        services: processedServices.map(s => ({
          name: s.name,
          amount: Number(s.amount) || 0,
          gstRate: Number(s.gstRate) || 0,
          cgstAmount: s.cgstAmount,
          sgstAmount: s.sgstAmount,
          taxableAmount: s.taxableAmount,
          isGstInclusive: Boolean(s.isGstInclusive)
        })),
        grandTotal,
        documentType,
        eInvoiceAckNo,
        eWayBillNo,
        customerSignatureUrl: signatureRef.current && !signatureRef.current.isEmpty() 
          ? signatureRef.current.toDataURL() 
          : undefined,
        payments: payments.map(p => ({
          paymentMode: p.paymentMode,
          amount: Number(p.amount) || 0,
          referenceNumber: p.referenceNumber,
          emiProvider: p.emiProvider,
          emiReferenceNumber: p.emiReferenceNumber
        }))
      };

      let response;
      if (quotationId) {
        response = await api.post(`/quotations/${quotationId}/convert`, payload);
      } else {
        response = await api.post('/sales', payload);
      }
      const saleId = response.data._id;
      
      navigate('/sales');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error creating sale');
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">POS / New Sale</h2>
        
        <div className="flex items-center gap-6">
            <select 
              className="h-9 px-3 rounded-md border text-sm font-medium bg-white shadow-sm"
              value={documentType}
              onChange={e => setDocumentType(e.target.value)}
            >
              <option value="TAX_INVOICE">Tax Invoice</option>
              <option value="PROFORMA">Proforma Invoice</option>
              <option value="CHALLAN">Delivery Challan</option>
            </select>
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border">
            <Button 
              size="sm" 
              variant={invoiceType === 'GST' ? 'default' : 'ghost'} 
              className={invoiceType === 'GST' ? 'shadow-sm' : ''}
              onClick={() => setInvoiceType('GST')}
            >
              GST Invoice
            </Button>
            <Button 
              size="sm" 
              variant={invoiceType === 'NON_GST' ? 'default' : 'ghost'}
              className={invoiceType === 'NON_GST' ? 'shadow-sm' : ''}
              onClick={() => setInvoiceType('NON_GST')}
            >
              Non-GST Invoice
            </Button>
          </div>
          
          <div className="text-sm text-slate-500 hidden md:block">
            <kbd className="px-2 py-1 bg-slate-100 border rounded mr-2">F8</kbd> Jump to Payment
            <kbd className="px-2 py-1 bg-slate-100 border rounded ml-4 mr-2">F9</kbd> Submit
          </div>
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
              {selectedCustomer && (() => {
                const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const projectedBalance = selectedCustomer.outstandingBalance + grandTotal - totalPaid;
                const creditLimit = selectedCustomer.creditLimit;
                const isExceeded = creditLimit !== null && creditLimit !== undefined && projectedBalance > creditLimit;

                return (
                  <div className={`mt-3 p-3 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm ${isExceeded ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800'}`}>
                    <div>
                      <span className="font-semibold">{selectedCustomer.name}</span> • {selectedCustomer.phone}
                      {selectedCustomer.gstNumber && ` • GST: ${selectedCustomer.gstNumber}`}
                      <div className="mt-1 font-medium text-xs opacity-90">
                        State Code: {selectedCustomer.stateCode || '-'} {isInterState ? '(IGST)' : '(CGST/SGST)'}
                      </div>
                    </div>
                    <div className="font-medium text-right mt-2 sm:mt-0">
                      <div>Current Bal: ₹{selectedCustomer.outstandingBalance.toFixed(2)}</div>
                      {creditLimit !== null && creditLimit !== undefined && (
                        <div className="text-xs mt-0.5">Credit Limit: ₹{creditLimit.toFixed(2)}</div>
                      )}
                      {isExceeded && (
                        <div className="font-bold text-red-600 flex items-center mt-1">
                          ⚠️ Credit Limit Exceeded
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-lg">Cart Items</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Product Search & Select */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6 w-full">
                <div className="w-full relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      ref={productInputRef}
                      type="text"
                      placeholder="Search Product by Name or SKU..."
                      className="flex h-11 w-full rounded-md border border-input bg-background pl-9 pr-9 py-2 text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={productSearch}
                      onChange={e => {
                        setProductSearch(e.target.value);
                        setSelectedProductId('');
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
                      autoComplete="off"
                    />
                    {productSearch ? (
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onMouseDown={e => { e.preventDefault(); setProductSearch(''); setSelectedProductId(''); setShowProductDropdown(true); productInputRef.current?.focus(); }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : (
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    )}
                  </div>

                  {/* Dropdown */}
                  {showProductDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {(() => {
                        const q = productSearch.toLowerCase();
                        const filtered = products.filter(p =>
                          !q ||
                          p.name?.toLowerCase().includes(q) ||
                          p.sku?.toLowerCase().includes(q)
                        ).slice(0, 30);
                        if (filtered.length === 0) return <div className="px-4 py-3 text-sm text-slate-400">No products found</div>;
                        return filtered.map(p => (
                          <button
                            key={p._id}
                            type="button"
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-3 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                              selectedProductId === p._id ? 'bg-primary/5 text-primary font-semibold' : 'text-slate-700 dark:text-slate-200'
                            }`}
                            onMouseDown={e => {
                              e.preventDefault();
                              setSelectedProductId(p._id);
                              setProductSearch(p.sku ? `${p.name} (${p.sku})` : p.name);
                              setShowProductDropdown(false);
                              setAvailableSerials([]);
                              setSelectedSerials([]);
                              // Immediately trigger serial fetch or quantity dialog
                              if (p.trackSerials === false) {
                                setSelectedQuantity('1');
                                setIsQuantityDialogOpen(true);
                              } else {
                                fetchSerials(p._id);
                              }
                            }}
                          >
                            <div className="min-w-0">
                              <div className="font-medium truncate">{p.name}</div>
                              {p.sku && <div className="text-xs text-slate-400">SKU: {p.sku}</div>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs font-semibold text-primary">₹{p.sellingPrice?.toFixed(2) || '0.00'}</div>
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => {
                    const p = products.find(prod => prod._id === selectedProductId);
                    if (p?.trackSerials === false) {
                      setIsQuantityDialogOpen(true);
                    } else {
                      setIsSerialsDialogOpen(true);
                    }
                  }}
                  disabled={!selectedProductId || (products.find(p => p._id === selectedProductId)?.trackSerials !== false && availableSerials.length === 0)}
                  variant="secondary"
                  className="h-10 w-full sm:w-auto"
                >
                  {products.find(p => p._id === selectedProductId)?.trackSerials === false ? `Quantity (${selectedQuantity})` : `Serials (${selectedSerials.length})`}
                </Button>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right w-16">Qty</TableHead>
                      <TableHead className="text-right w-32">Rate / Price (Inc. Tax)</TableHead>
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
                            <div>{item.name}</div>
                            {item.serialNumbers.length > 0 && (
                              <div className="text-xs font-mono text-slate-500 mt-1 truncate max-w-[250px]">
                                {item.serialNumbers.join(', ')}
                              </div>
                            )}
                            {item.wattage > 0 && (
                              <div className="text-xs text-blue-600 font-semibold mt-1">
                                Panel Wattage: {item.wattage}W | Total: {item.wattage * item.quantity}W
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <Input 
                                type="number" 
                                min="0" 
                                className="w-full h-8 text-right font-medium" 
                                value={item.unitPrice || ''} 
                                onChange={e => updateItemPrice(item.productId, Number(e.target.value))}
                                placeholder="0.00"
                              />
                              {item.wattage > 0 && <span className="text-xs text-muted-foreground mt-1">Per Watt</span>}
                            </div>
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
              <div className="space-y-4">
              {selectedServices.map((service, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 bg-slate-50 rounded border">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Cost Name (e.g., Installation)"
                      value={service.name}
                      onChange={(e) => {
                        const newServices = [...selectedServices];
                        newServices[index].name = e.target.value;
                        setSelectedServices(newServices);
                      }}
                      className="font-medium text-sm"
                    />
                    <div className="flex gap-2">
                      <select 
                        className="w-1/2 rounded-md border border-input bg-background px-3 text-sm"
                        value={service.gstRate || "0"}
                        onChange={e => {
                          const newServices = [...selectedServices];
                          newServices[index].gstRate = e.target.value;
                          setSelectedServices(newServices);
                        }}
                      >
                        <option value="0">0% GST</option>
                        <option value="5">5% GST</option>
                        <option value="12">12% GST</option>
                        <option value="18">18% GST</option>
                        <option value="28">28% GST</option>
                      </select>
                      <select 
                        className="w-1/2 rounded-md border border-input bg-background px-3 text-sm"
                        value={service.isGstInclusive ? "true" : "false"}
                        onChange={e => {
                          const newServices = [...selectedServices];
                          newServices[index].isGstInclusive = e.target.value === "true";
                          setSelectedServices(newServices);
                        }}
                      >
                        <option value="true">Inclusive</option>
                        <option value="false">Exclusive</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                      <Input 
                        type="number" min="0" className="pl-7 text-right font-medium" 
                        value={service.amount} 
                        onChange={e => {
                          const newServices = [...selectedServices];
                          newServices[index].amount = e.target.value;
                          setSelectedServices(newServices);
                        }} 
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:text-red-600 h-10 w-10 shrink-0" 
                      onClick={() => {
                        const newServices = selectedServices.filter((_, i) => i !== index);
                        setSelectedServices(newServices);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-dashed mt-2"
                onClick={() => {
                  setSelectedServices([...selectedServices, { 
                    name: '', 
                    amount: '0',
                    gstRate: '18',
                    isGstInclusive: true
                  }]);
                }}
              >
                + Add Service / Extra Charge
              </Button>
              
              {invoiceType === 'GST' && (
              <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm border">
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxable Value</span>
                  <span className="font-medium">₹{taxableAmount.toFixed(2)}</span>
                </div>
                {isInterState ? (
                  <div className="flex justify-between text-indigo-600">
                    <span>IGST</span>
                    <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-indigo-600">
                      <span>CGST</span>
                      <span className="font-medium">₹{cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-600">
                      <span>SGST</span>
                      <span className="font-medium">₹{sgstAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              )}

              <div className="pt-2 flex justify-between items-center">
                <span className="text-xl font-bold">Grand Total</span>
                <span className="text-3xl font-black text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>

              <div className="border-t-2 border-dashed pt-5 mt-5 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-slate-700">Payment(s) Received</label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={() => setPayments([...payments, { paymentMode: 'CASH', amount: '', emiProvider: '', emiReferenceNumber: '', referenceNumber: '' }])}
                  >
                    + Add Payment
                  </Button>
                </div>
                
                {payments.map((p, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-lg border space-y-3 relative">
                    {payments.length > 1 && (
                      <button 
                        className="absolute right-2 top-2 text-red-500 hover:text-red-700"
                        onClick={() => {
                          const newP = [...payments];
                          newP.splice(idx, 1);
                          setPayments(newP);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <div className="flex gap-2 pr-6">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                        <Input 
                          type="number" 
                          min="0" 
                          className="pl-7 h-10 text-lg font-bold text-green-700 bg-white" 
                          placeholder="Amount"
                          value={p.amount} 
                          onChange={e => {
                            const newP = [...payments];
                            newP[idx].amount = e.target.value;
                            setPayments(newP);
                          }} 
                        />
                      </div>
                      <select 
                        className="w-32 h-10 rounded-md border border-input bg-white px-2 font-medium text-sm"
                        value={p.paymentMode}
                        onChange={e => {
                          const newP = [...payments];
                          newP[idx].paymentMode = e.target.value;
                          setPayments(newP);
                        }}
                      >
                        <option value="CASH">CASH</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK">BANK</option>
                        <option value="CHEQUE">CHEQUE</option>
                        <option value="CREDIT_CARD">CREDIT CARD</option>
                        <option value="BAJAJ_FINANCE">BAJAJ FINANCE</option>
                      </select>
                    </div>
                    {p.paymentMode === 'BAJAJ_FINANCE' && (
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Provider (e.g. Bajaj, HDFC)" 
                          className="h-9 bg-white text-sm"
                          value={p.emiProvider}
                          onChange={e => {
                            const newP = [...payments];
                            newP[idx].emiProvider = e.target.value;
                            setPayments(newP);
                          }}
                        />
                        <Input 
                          placeholder="EMI Ref / Loan No" 
                          className="h-9 bg-white text-sm"
                          value={p.emiReferenceNumber}
                          onChange={e => {
                            const newP = [...payments];
                            newP[idx].emiReferenceNumber = e.target.value;
                            setPayments(newP);
                          }}
                        />
                      </div>
                    )}
                    {['UPI', 'BANK', 'CHEQUE', 'CREDIT_CARD'].includes(p.paymentMode) && (
                       <Input 
                         placeholder="Transaction / Cheque No" 
                         className="h-9 bg-white text-sm w-full"
                         value={p.referenceNumber}
                         onChange={e => {
                           const newP = [...payments];
                           newP[idx].referenceNumber = e.target.value;
                           setPayments(newP);
                         }}
                       />
                    )}
                  </div>
                ))}

                {payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) > 0 && (
                  <div className="mt-2 text-right text-sm">
                    {payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) > grandTotal ? (
                      <span className="text-orange-600 font-medium">Return Change: ₹{(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) - grandTotal).toFixed(2)}</span>
                    ) : (
                      <span className="text-red-600 font-medium">Due Balance: ₹{(grandTotal - payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)).toFixed(2)}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t-2 border-dashed pt-5 mt-5 space-y-4">
                <label className="text-sm font-bold text-slate-700 block">Compliance & E-Way Bill (Optional)</label>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="E-Invoice Ack No" value={eInvoiceAckNo} onChange={e => setEInvoiceAckNo(e.target.value)} />
                  <Input placeholder="E-Way Bill No" value={eWayBillNo} onChange={e => setEWayBillNo(e.target.value)} />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-slate-600 flex items-center gap-1"><PenTool className="w-4 h-4" /> Customer Signature</label>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-500" onClick={() => signatureRef.current?.clear()}>Clear</Button>
                  </div>
                  <div className="border rounded-md bg-white overflow-hidden shadow-inner">
                    <SignatureCanvas 
                      ref={signatureRef}
                      canvasProps={{ width: 500, height: 120, className: 'w-full h-full cursor-crosshair' }} 
                    />
                  </div>
                </div>
              </div>

              <Button 
                ref={submitBtnRef}
                className="w-full h-14 text-lg font-bold mt-4 shadow-md" 
                onClick={handleGenerateInvoice}
                disabled={isSubmitting || cart.length === 0 || !selectedCustomerId}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Processing...</>
                ) : (
                  <><Receipt className="mr-2 h-6 w-6" /> Complete Sale (F9)</>
                )}
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

      <Dialog open={isQuantityDialogOpen} onOpenChange={setIsQuantityDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Quantity</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Quantity</label>
            <Input 
              type="number" 
              min="1"
              value={selectedQuantity}
              onChange={e => setSelectedQuantity(e.target.value)}
              className="text-lg"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addToCart();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button onClick={addToCart} size="lg" className="w-full">Confirm & Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
