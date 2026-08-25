import toast from 'react-hot-toast';
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Trash2, Receipt, Loader2 } from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';

const SHOP_STATE_CODE = '09'; // Uttar Pradesh

export default function EditSale() {
  const navigate = useNavigate();
  const { id } = useParams();
  
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for keyboard navigation
  const productInputRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, prodRes, saleRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products?limit=10000'),
          api.get(`/sales/${id}`)
        ]);
        setCustomers(custRes.data.data || custRes.data);
        setProducts(prodRes.data.data || prodRes.data);
        
        const s = saleRes.data;
        setSelectedCustomerId(s.customerId?._id || s.customerId?.id || s.customerId);
        setCustomerSearch(s.customerId?.name ? `${s.customerId.name} (${s.customerId.phone})` : '');
        setDiscount(s.discount.toString());
        if (s.invoiceType) {
          setInvoiceType(s.invoiceType);
        }
        if (s.services && s.services.length > 0) {
          setSelectedServices(s.services.map((serv: any) => ({
            name: serv.name,
            amount: serv.amount.toString(),
            gstRate: serv.gstRate?.toString() || '0',
            isGstInclusive: serv.isGstInclusive !== undefined ? serv.isGstInclusive : true
          })));
        }
        setCart(s.items.map((item: any) => ({
          productId: item.productId?._id || item.productId?.id || item.productId,
          name: item.productId?.name,
          sku: item.productId?.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          serialNumbers: item.serialNumbers,
          gstRate: item.gstRate || item.productId.gstRate || 0,
          isGstInclusive: item.productId.isGstInclusive !== undefined ? item.productId.isGstInclusive : true,
          wattage: item.wattage || item.productId.wattage || 0
        })));

        if (s.documentType) {
          setDocumentType(s.documentType);
        }
        if (s.eInvoiceAckNo) setEInvoiceAckNo(s.eInvoiceAckNo);
        if (s.eWayBillNo) setEWayBillNo(s.eWayBillNo);

        if (s.payments && s.payments.length > 0) {
          setPayments(s.payments.map((p: any) => ({
            paymentMode: p.paymentMode || 'CASH',
            amount: p.amount?.toString() || '',
            emiProvider: p.emiProvider || '',
            emiReferenceNumber: p.emiReferenceNumber || '',
            referenceNumber: p.referenceNumber || ''
          })));
        } else if (s.salePayments && s.salePayments.length > 0) {
          setPayments(s.salePayments.map((p: any) => ({
            paymentMode: p.paymentMode || 'CASH',
            amount: p.amount?.toString() || '',
            emiProvider: p.emiProvider || '',
            emiReferenceNumber: p.emiReferenceNumber || '',
            referenceNumber: p.referenceNumber || ''
          })));
        } else if (s.amountPaid) {
          setPayments([{
            paymentMode: s.paymentMode || 'CASH',
            amount: s.amountPaid.toString(),
            emiProvider: '',
            emiReferenceNumber: '',
            referenceNumber: ''
          }]);
        }
      } catch (error) {
        console.error('Error fetching data', error);
      }
    };
    fetchData();
  }, []);

  // Handle Customer Selection
  useEffect(() => {
    if (!customerSearch) return; // don't override on initial load if we manually set it above
    const c = customers.find(c => `${c.name} (${c.phone})` === customerSearch);
    if (c) setSelectedCustomerId(c._id);
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
      if (product.trackSerials !== false) {
        newCart[existingItemIndex].serialNumbers = Array.from(new Set([...newCart[existingItemIndex].serialNumbers, ...selectedSerials]));
      }
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
        serialNumbers: product.trackSerials === false ? [] : selectedSerials,
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

  const handleUpdateSale = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        invoiceType,
        documentType,
        eInvoiceAckNo,
        eWayBillNo,
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
        payments: payments.map(p => ({
          paymentMode: p.paymentMode,
          amount: Number(p.amount) || 0,
          referenceNumber: p.referenceNumber,
          emiProvider: p.emiProvider,
          emiReferenceNumber: p.emiReferenceNumber
        }))
      };

      const response = await api.put(`/sales/${id}`, payload);
      const saleId = response.data._id;
      
      window.open(`/sales/${saleId}/print`, '_blank');
      navigate('/sales');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error updating sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
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
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">POS / Edit Sale</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Modify sale invoice</p>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <select 
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={documentType}
            onChange={e => setDocumentType(e.target.value)}
          >
            <option value="TAX_INVOICE">Tax Invoice</option>
            <option value="PROFORMA">Proforma Invoice</option>
            <option value="CHALLAN">Delivery Challan</option>
          </select>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <Button 
              size="sm" 
              variant={invoiceType === 'GST' ? 'default' : 'ghost'} 
              className={`rounded-lg text-xs font-semibold ${invoiceType === 'GST' ? 'shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              onClick={() => setInvoiceType('GST')}
            >
              GST Invoice
            </Button>
            <Button 
              size="sm" 
              variant={invoiceType === 'NON_GST' ? 'default' : 'ghost'}
              className={`rounded-lg text-xs font-semibold ${invoiceType === 'NON_GST' ? 'shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              onClick={() => setInvoiceType('NON_GST')}
            >
              Non-GST Invoice
            </Button>
          </div>
          
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden lg:flex items-center gap-2">
            <div><kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-mono text-[11px]">F9</kbd> Update</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-t-4 border-t-primary shadow-soft">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Customer Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <Input 
                list="customers-list"
                placeholder="Search Customer by Name or Phone... (Press Tab to move)"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="text-base py-5 shadow-inner bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                autoFocus
              />
              <datalist id="customers-list">
                {customers.map(c => <option key={c._id} value={`${c.name} (${c.phone})`} />)}
              </datalist>
              {selectedCustomer && (
                <div className="mt-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-xl flex justify-between items-center text-xs font-medium">
                  <div>
                    <span className="font-bold text-sm">{selectedCustomer.name}</span> • {selectedCustomer.phone}
                    {selectedCustomer.gstNumber && ` • GST: ${selectedCustomer.gstNumber}`}
                  </div>
                  <div className="font-medium font-mono">
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

              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                    <TableRow className="border-slate-200 dark:border-slate-800">
                      <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Product</TableHead>
                      <TableHead className="text-right w-16 text-xs font-bold text-slate-700 dark:text-slate-300">Qty</TableHead>
                      <TableHead className="text-right w-36 text-xs font-bold text-slate-700 dark:text-slate-300">Rate (Inc. Tax)</TableHead>
                      <TableHead className="text-right w-32 text-xs font-bold text-slate-700 dark:text-slate-300">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400 dark:text-slate-600 text-xs font-medium">Cart is empty. Scan a product to begin.</TableCell></TableRow>
                    ) : (
                      cart.map((item) => (
                        <TableRow key={item.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
                          <TableCell className="font-medium">
                            <div className="text-slate-900 dark:text-white font-semibold text-xs">{item.name}</div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-[250px]">
                              {item.serialNumbers.join(', ')}
                            </div>
                            {item.wattage > 0 && (
                              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 font-mono">
                                Panel Wattage: {item.wattage}W | Total: {item.wattage * item.quantity}W
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-base font-mono">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <Input 
                                type="number" 
                                min="0" 
                                className="w-full h-8 text-right font-medium font-mono text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" 
                                value={item.unitPrice || ''} 
                                onChange={e => updateItemPrice(item.productId, Number(e.target.value))}
                                placeholder="0.00"
                              />
                              {item.wattage > 0 && <span className="text-[10px] text-slate-400 mt-0.5">Per Watt</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">₹{item.totalPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg h-8 w-8" onClick={() => removeFromCart(item.productId)}>
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
          <Card className="shadow-soft border-slate-200/80 dark:border-slate-800 sticky top-6">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Billing Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 text-xs font-semibold">
                <span>Subtotal (Inc. Tax)</span>
                <span className="font-bold text-base font-mono tabular-nums text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Discount</span>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">₹</span>
                  <Input 
                    type="number" 
                    min="0" 
                    className="pl-7 text-right font-bold font-mono text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" 
                    value={discount} 
                    onChange={e => setDiscount(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="space-y-3">
              {selectedServices.map((service, index) => (
                <div key={index} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Charge Name (e.g. Installation)"
                      value={service.name}
                      onChange={(e) => {
                        const newServices = [...selectedServices];
                        newServices[index].name = e.target.value;
                        setSelectedServices(newServices);
                      }}
                      className="font-medium text-xs bg-white dark:bg-slate-950"
                    />
                    <div className="flex gap-2">
                      <select 
                        className="w-1/2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-900 dark:text-white"
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
                        className="w-1/2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-900 dark:text-white"
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

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">₹</span>
                      <Input 
                        type="number" min="0" className="pl-7 text-right font-bold font-mono text-xs bg-white dark:bg-slate-950" 
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
                      className="text-red-400 hover:text-red-600 rounded-lg h-8 w-8 shrink-0" 
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
                className="w-full border-dashed text-xs rounded-xl"
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
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl space-y-2 text-xs border border-slate-200/80 dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Taxable Value</span>
                  <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-white">₹{taxableAmount.toFixed(2)}</span>
                </div>
                {isInterState ? (
                  <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                    <span>IGST</span>
                    <span>₹{taxAmount.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                      <span>CGST</span>
                      <span>₹{cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                      <span>SGST</span>
                      <span>₹{sgstAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              )}

              <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                <span className="text-sm font-bold uppercase text-slate-900 dark:text-white">Grand Total</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">₹{grandTotal.toFixed(2)}</span>
              </div>

              <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4 space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Payment(s) Received</label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[11px] rounded-lg"
                    onClick={() => setPayments([...payments, { paymentMode: 'CASH', amount: '', emiProvider: '', emiReferenceNumber: '', referenceNumber: '' }])}
                  >
                    + Add Payment
                  </Button>
                </div>
                
                {payments.map((p, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 relative">
                    {payments.length > 1 && (
                      <button 
                        className="absolute right-2 top-2 text-red-500 hover:text-red-700 p-1"
                        onClick={() => {
                          const newP = [...payments];
                          newP.splice(idx, 1);
                          setPayments(newP);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="flex gap-2 pr-5">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">₹</span>
                        <Input 
                          type="number" 
                          min="0" 
                          className="pl-7 h-9 text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" 
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
                        className="w-32 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-2 font-medium text-xs"
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
                          className="h-8 bg-white dark:bg-slate-950 text-xs"
                          value={p.emiProvider}
                          onChange={e => {
                            const newP = [...payments];
                            newP[idx].emiProvider = e.target.value;
                            setPayments(newP);
                          }}
                        />
                        <Input 
                          placeholder="EMI Ref / Loan No" 
                          className="h-8 bg-white dark:bg-slate-950 text-xs"
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
                         className="h-8 bg-white dark:bg-slate-950 text-xs w-full"
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
                  <div className="mt-1 text-right text-xs font-mono font-bold">
                    {payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) > grandTotal ? (
                      <span className="text-amber-600 dark:text-amber-400">Return Change: ₹{(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) - grandTotal).toFixed(2)}</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">Due Balance: ₹{(grandTotal - payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)).toFixed(2)}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">Compliance & E-Way Bill (Optional)</label>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="E-Invoice Ack No" value={eInvoiceAckNo} onChange={e => setEInvoiceAckNo(e.target.value)} className="text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
                  <Input placeholder="E-Way Bill No" value={eWayBillNo} onChange={e => setEWayBillNo(e.target.value)} className="text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
                </div>
              </div>

              <Button 
                ref={submitBtnRef}
                className="w-full h-12 text-base font-bold mt-3 shadow-md rounded-xl" 
                onClick={handleUpdateSale}
                disabled={isSubmitting || cart.length === 0 || !selectedCustomerId}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Updating...</>
                ) : (
                  <><Receipt className="mr-2 h-5 w-5" /> Update Sale (F9)</>
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
