import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Trash2, Receipt, Loader2, Search, X, ChevronDown, Plus, PackagePlus, AlertCircle } from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';

const SHOP_STATE_CODE = '09'; // Uttar Pradesh

export default function NewSale() {
  const { canViewProfit } = useAuth();
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

  // Quick Inward inside Serials & Quantity Dialogs
  const [quickSerialInput, setQuickSerialInput] = useState('');
  const [quickSerialCost, setQuickSerialCost] = useState('');
  const [isQuickInwardingSerial, setIsQuickInwardingSerial] = useState(false);
  const [quickQtyInput, setQuickQtyInput] = useState('');
  const [quickQtyCost, setQuickQtyCost] = useState('');
  const [isQuickInwardingQty, setIsQuickInwardingQty] = useState(false);

  // Dedicated Quick Inward Modal
  const [isQuickInwardModalOpen, setIsQuickInwardModalOpen] = useState(false);
  const [quickModalProductId, setQuickModalProductId] = useState('');
  const [quickModalSerialsText, setQuickModalSerialsText] = useState('');
  const [quickModalQuantity, setQuickModalQuantity] = useState('1');
  const [quickModalCost, setQuickModalCost] = useState('');
  const [quickModalSupplier, setQuickModalSupplier] = useState('');
  const [isQuickModalSubmitting, setIsQuickModalSubmitting] = useState(false);
  
  const [discount, setDiscount] = useState('0');
  const [invoiceType, setInvoiceType] = useState<'GST' | 'NON_GST' | 'COMPOSITION'>('COMPOSITION');
  const [documentType, setDocumentType] = useState('BILL_OF_SUPPLY');

  
  // Dynamic Services selected
  const [selectedServices, setSelectedServices] = useState<{name: string, amount: string, gstRate: string, isGstInclusive: boolean}[]>([]);

  // Combo Groups
  const [comboGroups, setComboGroups] = useState<{ internalId: string, name: string, totalPrice: number, isGstInclusive: boolean }[]>([]);
  const [isComboDialogOpen, setIsComboDialogOpen] = useState(false);
  const [newCombo, setNewCombo] = useState({ name: '', totalPrice: '', isGstInclusive: true });

  // Multiple Payments
  const [payments, setPayments] = useState([{ paymentMode: 'CASH', amount: '', emiProvider: '', emiReferenceNumber: '', referenceNumber: '' }]);
  
  // Compliance
  const [eInvoiceAckNo, setEInvoiceAckNo] = useState('');
  const [eWayBillNo, setEWayBillNo] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Customer State
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', email: '', address: '', gstNumber: '', state: '', stateCode: '' });
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCustomer(true);
    try {
      const response = await api.post('/customers', newCustomerData);
      const newCustomer = response.data;
      setCustomers([...customers, newCustomer]);
      setSelectedCustomerId(newCustomer._id);
      setCustomerSearch(`${newCustomer.name} (${newCustomer.phone})`);
      setIsAddCustomerModalOpen(false);
      setNewCustomerData({ name: '', phone: '', email: '', address: '', gstNumber: '', state: '', stateCode: '' });
      toast.success('Customer added successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add customer');
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

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

  const refreshProducts = async () => {
    try {
      const prodRes = await api.get('/products?limit=10000');
      setProducts(prodRes.data.data || prodRes.data);
    } catch (err) {
      console.error('Failed to refresh products', err);
    }
  };

  const fetchSerials = async (productId: string) => {
    const prod = products.find(p => p._id === productId);
    if (prod?.purchasePrice) {
      setQuickSerialCost(String(prod.purchasePrice));
    } else {
      setQuickSerialCost('');
    }
    try {
      const res = await api.get(`/inventory/serials/${productId}?status=IN_STOCK`);
      setAvailableSerials(res.data);
      setIsSerialsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching serials', error);
      setIsSerialsDialogOpen(true);
    }
  };

  const handleQuickInwardSerials = async () => {
    if (!selectedProductId || !quickSerialInput.trim()) return;
    const cleanSerials = quickSerialInput
      .split(/[\n,;\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);

    if (cleanSerials.length === 0) return;

    const prod = products.find(p => p._id === selectedProductId);
    const purchasePrice = quickSerialCost ? Number(quickSerialCost) : Number(prod?.purchasePrice || 0);

    setIsQuickInwardingSerial(true);
    try {
      await api.post('/inventory/stock-in', {
        productId: selectedProductId,
        serialNumbers: cleanSerials,
        purchasePrice,
        supplierName: 'POS Quick Inward'
      });

      const newItems = cleanSerials.map((s, idx) => ({ _id: `temp-${Date.now()}-${idx}`, serialNumber: s }));
      setAvailableSerials(prev => [...newItems, ...prev]);
      setSelectedSerials(prev => Array.from(new Set([...prev, ...cleanSerials])));
      setQuickSerialInput('');
      toast.success(`Inwarded & selected ${cleanSerials.length} serial(s)${canViewProfit ? ` @ ₹${purchasePrice}` : ''}!`);
      refreshProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to inward serials');
    } finally {
      setIsQuickInwardingSerial(false);
    }
  };

  const handleBarcodeScanInDialog = async (decodedText: string) => {
    const clean = decodedText.trim().toUpperCase();
    if (!clean) return;
    const found = availableSerials.find(s => s.serialNumber === clean);
    if (found) {
      toggleSerialSelection(clean);
      toast.success(`Selected serial: ${clean}`);
    } else {
      const prod = products.find(p => p._id === selectedProductId);
      const purchasePrice = quickSerialCost ? Number(quickSerialCost) : Number(prod?.purchasePrice || 0);
      try {
        await api.post('/inventory/stock-in', {
          productId: selectedProductId,
          serialNumbers: [clean],
          purchasePrice,
          supplierName: 'Scanned at POS'
        });
        setAvailableSerials(prev => [{ _id: 'scanned-' + Date.now(), serialNumber: clean }, ...prev]);
        setSelectedSerials(prev => Array.from(new Set([...prev, clean])));
        toast.success(`Scanned & inwarded new serial: ${clean}${canViewProfit ? ` (Cost: ₹${purchasePrice})` : ''}`);
        refreshProducts();
      } catch (err: any) {
        toast.error(err.response?.data?.error || `Failed to inward serial ${clean}`);
      }
    }
  };

  const handleQuickInwardQuantity = async () => {
    const qty = Number(quickQtyInput);
    if (!selectedProductId || !qty || qty <= 0) return;
    const prod = products.find(p => p._id === selectedProductId);
    const purchasePrice = quickQtyCost ? Number(quickQtyCost) : Number(prod?.purchasePrice || 0);
    setIsQuickInwardingQty(true);
    try {
      await api.post('/inventory/stock-in', {
        productId: selectedProductId,
        quantity: qty,
        purchasePrice,
        supplierName: 'POS Quick Inward'
      });
      toast.success(`Added ${qty} units to stock${canViewProfit ? ` @ ₹${purchasePrice}` : ''}!`);
      setSelectedQuantity(String(qty));
      setQuickQtyInput('');
      refreshProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to inward quantity');
    } finally {
      setIsQuickInwardingQty(false);
    }
  };

  const handleQuickModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickModalProductId) {
      toast.error('Please select a product');
      return;
    }
    const targetProduct = products.find(p => p._id === quickModalProductId);
    if (!targetProduct) return;

    setIsQuickModalSubmitting(true);
    try {
      if (targetProduct.trackSerials !== false) {
        const serials = quickModalSerialsText
          .split(/[\n,;\s]+/)
          .map(s => s.trim().toUpperCase())
          .filter(s => s.length > 0);

        if (serials.length === 0) {
          toast.error('Please enter at least one serial number');
          setIsQuickModalSubmitting(false);
          return;
        }

        await api.post('/inventory/stock-in', {
          productId: quickModalProductId,
          serialNumbers: serials,
          purchasePrice: quickModalCost ? Number(quickModalCost) : Number(targetProduct.purchasePrice || 0),
          supplierName: quickModalSupplier || 'POS Quick Inward'
        });

        toast.success(`Inwarded ${serials.length} serials for ${targetProduct.name}!`);
        
        if (selectedProductId === quickModalProductId) {
          const newUnits = serials.map((s, idx) => ({ _id: `temp-${Date.now()}-${idx}`, serialNumber: s }));
          setAvailableSerials(prev => [...newUnits, ...prev]);
          setSelectedSerials(prev => Array.from(new Set([...prev, ...serials])));
        }
      } else {
        const qty = Number(quickModalQuantity);
        if (!qty || qty <= 0) {
          toast.error('Please enter a valid quantity');
          setIsQuickModalSubmitting(false);
          return;
        }

        await api.post('/inventory/stock-in', {
          productId: quickModalProductId,
          quantity: qty,
          purchasePrice: quickModalCost ? Number(quickModalCost) : Number(targetProduct.purchasePrice || 0),
          supplierName: quickModalSupplier || 'POS Quick Inward'
        });

        toast.success(`Inwarded ${qty} units of ${targetProduct.name}!`);
        if (selectedProductId === quickModalProductId) {
          setSelectedQuantity(String(qty));
        }
      }

      setIsQuickInwardModalOpen(false);
      setQuickModalSerialsText('');
      setQuickModalQuantity('1');
      setQuickModalCost('');
      setQuickModalSupplier('');
      refreshProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to inward stock');
    } finally {
      setIsQuickModalSubmitting(false);
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
        wattage: wattage,
        hsnCode: product.hsnCode || '',
        unit: product.unit || 'PC',
        purchasePrice: quickSerialCost ? Number(quickSerialCost) : (quickQtyCost ? Number(quickQtyCost) : (product.purchasePrice || 0))
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
    setQuickSerialCost('');
    setQuickQtyCost('');
    
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

  const updateItemCombo = (productId: string, comboGroupId: string) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        return { ...item, comboGroupId: comboGroupId || undefined };
      }
      return item;
    }));
  };

  const getCartWithCombos = () => {
    const newCart = JSON.parse(JSON.stringify(cart));
    
    if (comboGroups && comboGroups.length > 0) {
      for (const combo of comboGroups) {
        const comboItems = newCart.filter((i: any) => i.comboGroupId === combo.internalId);
        if (comboItems.length === 0) continue;

        let totalBaseWeight = 0;
        const itemWeights: number[] = [];

        for (const item of comboItems) {
          const product = products.find(p => p._id === item.productId);
          const catalogPrice = product?.sellingPrice || item.unitPrice;
          const calculatedQty = (product?.wattage || 0) > 0 ? item.quantity * product!.wattage : item.quantity;
          const weight = calculatedQty * catalogPrice;
          itemWeights.push(weight);
          totalBaseWeight += weight;
        }

        let allocatedSum = 0;
        for (let i = 0; i < comboItems.length; i++) {
          const item = comboItems[i];
          let allocatedPrice = 0;
          if (i === comboItems.length - 1) {
             allocatedPrice = combo.totalPrice - allocatedSum;
          } else {
             allocatedPrice = totalBaseWeight > 0 
                 ? (combo.totalPrice * (itemWeights[i] / totalBaseWeight))
                 : (combo.totalPrice / comboItems.length);
             allocatedPrice = Number(allocatedPrice.toFixed(2));
          }
          allocatedSum += allocatedPrice;
          
          const product = products.find(p => p._id === item.productId);
          const calculatedQty = (product?.wattage || 0) > 0 ? item.quantity * product!.wattage : item.quantity;
          
          item.totalPrice = allocatedPrice;
          item.unitPrice = calculatedQty > 0 ? allocatedPrice / calculatedQty : 0;
          item.isComboItem = true;
          item.comboIsGstInclusive = combo.isGstInclusive;
        }
      }
    }
    return newCart;
  };

  // Math
  const selectedCustomer = customers.find(c => c._id === selectedCustomerId);
  const isInterState = selectedCustomer?.stateCode && selectedCustomer.stateCode !== SHOP_STATE_CODE;
  const isBillOfSupply = documentType === 'BILL_OF_SUPPLY' || invoiceType === 'COMPOSITION';
  const isTaxExempt = invoiceType === 'NON_GST' || isBillOfSupply;

  let subtotal = 0;
  let taxableAmount = 0;
  let taxAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;

  const cartWithCombos = getCartWithCombos();

  // Process items
  const processedCart = cartWithCombos.map((item: any) => {
    let trueGstRate = item.gstRate || 0;
    if (isTaxExempt) trueGstRate = 0;

    const lineTotal = item.totalPrice;
    subtotal += lineTotal;

    let lineTaxable = lineTotal;
    let lineTax = 0;

    const isGstInc = item.isComboItem ? item.comboIsGstInclusive : item.isGstInclusive;

    if (trueGstRate > 0) {
      if (isGstInc) {
        lineTaxable = lineTotal / (1 + (trueGstRate / 100));
        lineTax = lineTotal - lineTaxable;
      } else {
        lineTaxable = lineTotal;
        lineTax = lineTotal * (trueGstRate / 100);
      }
    }

    taxableAmount += lineTaxable;
    taxAmount += lineTax;

    let lineCgst = 0, lineSgst = 0, lineIgst = 0;
    if (isInterState) {
      lineIgst = lineTax;
    } else {
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
      sgstAmount: lineSgst,
      igstAmount: lineIgst
    };
  });
  const igstAmount = isInterState ? taxAmount : 0;

  const discountAmount = Number(discount) || 0;
  
  let servicesTotal = 0;
  const processedServices = selectedServices.map(s => {
    const sAmount = Number(s.amount) || 0;
    servicesTotal += sAmount;
    
    let sGstRate = Number(s.gstRate) || 0;
    if (isTaxExempt) sGstRate = 0;

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

    let sCgst = 0, sSgst = 0, sIgst = 0;
    if (isInterState) {
      sIgst = sTax;
    } else {
      sCgst = sTax / 2;
      sSgst = sTax / 2;
    }
    cgstAmount += sCgst;
    sgstAmount += sSgst;

    return {
      ...s,
      taxableAmount: sTaxable,
      cgstAmount: sCgst,
      sgstAmount: sSgst,
      igstAmount: sIgst
    };
  });
  
  const grandTotal = Math.round(subtotal - discountAmount + servicesTotal);
  const roundOff = grandTotal - (subtotal - discountAmount + servicesTotal);

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
        allowQuickInward: true,
        items: processedCart.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxableUnitPrice: item.taxableUnitPrice,
          taxableTotalPrice: item.taxableTotalPrice,
          gstRate: item.gstRate,
          cgstAmount: item.cgstAmount,
          sgstAmount: item.sgstAmount,
          igstAmount: item.igstAmount || 0,
          hsnCode: item.hsnCode || '',
          unit: item.unit || 'PC',
          serialNumbers: item.serialNumbers,
          wattage: item.wattage || 0,
          comboGroupId: item.comboGroupId,
          purchasePrice: item.purchasePrice
        })),
        comboGroups: comboGroups.map(c => ({
          internalId: c.internalId,
          name: c.name,
          totalPrice: Number(c.totalPrice),
          isGstInclusive: c.isGstInclusive
        })),
        subtotal,
        discount: discountAmount,
        taxableAmount,
        taxRate: 0,
        taxAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        roundOff,
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
        placeOfSupply: selectedCustomer?.state || 'Uttar Pradesh',
        placeOfSupplyCode: selectedCustomer?.stateCode || SHOP_STATE_CODE,
        eInvoiceAckNo,
        eWayBillNo,
        payments: payments.map(p => ({
          paymentMode: p.paymentMode,
          amount: Number(p.amount) || 0,
          referenceNumber: p.referenceNumber,
          emiProvider: p.emiProvider,
          emiReferenceNumber: p.emiReferenceNumber
        }))
      };

      if (quotationId) {
        await api.post(`/quotations/${quotationId}/convert`, payload);
      } else {
        await api.post('/sales', payload);
      }
      
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
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">POS / New Sale</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Create a point of sale invoice</p>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <select 
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={documentType}
            onChange={e => {
              const val = e.target.value;
              setDocumentType(val);
              if (val === 'BILL_OF_SUPPLY') {
                setInvoiceType('COMPOSITION');
              } else if (invoiceType === 'COMPOSITION') {
                setInvoiceType('GST');
              }
            }}
          >
            <option value="BILL_OF_SUPPLY">Bill of Supply (Composition)</option>
            <option value="TAX_INVOICE">Tax Invoice</option>
            <option value="PROFORMA">Proforma Invoice</option>
            <option value="CHALLAN">Delivery Challan</option>
          </select>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <Button 
              size="sm" 
              variant={invoiceType === 'COMPOSITION' ? 'default' : 'ghost'} 
              className={`rounded-lg text-xs font-semibold ${invoiceType === 'COMPOSITION' ? 'shadow-sm bg-amber-600 hover:bg-amber-700 text-white' : 'text-slate-600 dark:text-slate-400'}`}
              onClick={() => {
                setInvoiceType('COMPOSITION');
                setDocumentType('BILL_OF_SUPPLY');
              }}
            >
              Composition Bill
            </Button>
            <Button 
              size="sm" 
              variant={invoiceType === 'GST' ? 'default' : 'ghost'} 
              className={`rounded-lg text-xs font-semibold ${invoiceType === 'GST' ? 'shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              onClick={() => {
                setInvoiceType('GST');
                if (documentType === 'BILL_OF_SUPPLY') setDocumentType('TAX_INVOICE');
              }}
            >
              GST Invoice
            </Button>
            <Button 
              size="sm" 
              variant={invoiceType === 'NON_GST' ? 'default' : 'ghost'}
              className={`rounded-lg text-xs font-semibold ${invoiceType === 'NON_GST' ? 'shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              onClick={() => {
                setInvoiceType('NON_GST');
                if (documentType === 'BILL_OF_SUPPLY') setDocumentType('TAX_INVOICE');
              }}
            >
              Non-GST
            </Button>
          </div>
          
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden lg:flex items-center gap-2">
            <div><kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-mono text-[11px]">F8</kbd> Payment</div>
            <div><kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-mono text-[11px]">F9</kbd> Submit</div>
          </div>
        </div>
      </div>

      {isBillOfSupply && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-md">Composition Scheme</span>
            <span>Billing as <strong>Bill of Supply</strong> — Tax is not charged to customer.</span>
          </div>
          <span className="italic text-[11px] text-amber-700/80 dark:text-amber-400/80 hidden md:inline">"Composition taxable person, not eligible to collect tax on supplies"</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-t-4 border-t-primary shadow-soft">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Customer Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input 
                  list="customers-list"
                  placeholder="Search Customer by Name or Phone... (Press Tab to move)"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="text-base py-5 shadow-inner bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 flex-1"
                  autoFocus
                />
                <Button 
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  className="h-[42px] px-3 whitespace-nowrap self-center"
                  variant="outline"
                  type="button"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add New
                </Button>
              </div>
              <datalist id="customers-list">
                {customers.map(c => <option key={c._id} value={`${c.name} (${c.phone})`} />)}
              </datalist>
              {selectedCustomer && (() => {
                const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const projectedBalance = selectedCustomer.outstandingBalance + grandTotal - totalPaid;
                const creditLimit = selectedCustomer.creditLimit;
                const isExceeded = creditLimit !== null && creditLimit !== undefined && projectedBalance > creditLimit;

                return (
                  <div className={`mt-3 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-medium ${isExceeded ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'}`}>
                    <div>
                      <span className="font-bold text-sm">{selectedCustomer.name}</span> • {selectedCustomer.phone}
                      {selectedCustomer.gstNumber && ` • GST: ${selectedCustomer.gstNumber}`}
                      <div className="mt-1 font-medium opacity-90">
                        State Code: {selectedCustomer.stateCode || '-'} {isInterState ? '(IGST)' : '(CGST/SGST)'}
                      </div>
                    </div>
                    <div className="font-medium text-right mt-2 sm:mt-0 font-mono">
                      <div>Current Bal: ₹{selectedCustomer.outstandingBalance.toFixed(2)}</div>
                      {creditLimit !== null && creditLimit !== undefined && (
                        <div className="opacity-80 mt-0.5">Credit Limit: ₹{creditLimit.toFixed(2)}</div>
                      )}
                      {isExceeded && (
                        <div className="font-bold text-red-600 dark:text-red-400 flex items-center mt-1">
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
                                if (p.purchasePrice) setQuickQtyCost(String(p.purchasePrice));
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
                              <div className={`text-[10px] font-medium ${(p.stock || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                {(p.stock || 0) > 0 ? `Stock: ${p.stock}` : 'Out of stock'}
                              </div>
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const p = products.find(prod => prod._id === selectedProductId);
                    if (p?.trackSerials === false) {
                      if (p?.purchasePrice) setQuickQtyCost(String(p.purchasePrice));
                      setIsQuantityDialogOpen(true);
                    } else {
                      if (p?.purchasePrice) setQuickSerialCost(String(p.purchasePrice));
                      setIsSerialsDialogOpen(true);
                    }
                  }}
                  disabled={!selectedProductId}
                  variant="secondary"
                  className="h-10 w-full sm:w-auto font-semibold"
                >
                  {products.find(p => p._id === selectedProductId)?.trackSerials === false ? `Quantity (${selectedQuantity})` : `Serials (${selectedSerials.length})`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const activeP = selectedProductId || (products[0]?._id || '');
                    setQuickModalProductId(activeP);
                    const prod = products.find(p => p._id === activeP);
                    setQuickModalCost(prod?.purchasePrice ? String(prod.purchasePrice) : '');
                    setIsQuickInwardModalOpen(true);
                  }}
                  className="h-10 px-3 whitespace-nowrap text-xs font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                  title="Quick Inward stock on the fly"
                >
                  <PackagePlus className="h-4 w-4 mr-1.5 text-indigo-600 dark:text-indigo-400" />
                  Quick Inward
                </Button>
              </div>

              <div className="mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-dashed"
                  onClick={() => setIsComboDialogOpen(true)}
                >
                  + Create Combo Package
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
                    {cartWithCombos.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400 dark:text-slate-600 text-xs font-medium">Cart is empty. Scan or search a product to begin.</TableCell></TableRow>
                    ) : (
                      cartWithCombos.map((item: any) => (
                        <TableRow key={item.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
                          <TableCell className="font-medium">
                            <div className="text-slate-900 dark:text-white font-semibold text-xs">{item.name}</div>
                            {item.serialNumbers.length > 0 && (
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-[250px]">
                                {item.serialNumbers.join(', ')}
                              </div>
                            )}
                            {item.wattage > 0 && (
                              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 font-mono">
                                Panel Wattage: {item.wattage}W | Total: {item.wattage * item.quantity}W
                              </div>
                            )}
                            {comboGroups.length > 0 && (
                              <div className="mt-2">
                                <select 
                                  className="text-[11px] h-7 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                                  value={item.comboGroupId || ''}
                                  onChange={e => updateItemCombo(item.productId, e.target.value)}
                                >
                                  <option value="">No Combo Package</option>
                                  {comboGroups.map(c => <option key={c.internalId} value={c.internalId}>{c.name}</option>)}
                                </select>
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
                                disabled={item.isComboItem}
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

              {roundOff !== 0 && (
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Round Off</span>
                <span className="font-mono tabular-nums">{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
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
                onClick={handleGenerateInvoice}
                disabled={isSubmitting || cart.length === 0 || !selectedCustomerId}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <><Receipt className="mr-2 h-5 w-5" /> Complete Sale (F9)</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isSerialsDialogOpen} onOpenChange={setIsSerialsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Select Serial Numbers</span>
              <span className="text-xs font-normal text-muted-foreground">
                Product: <strong className="text-slate-800 dark:text-slate-200">{products.find(p => p._id === selectedProductId)?.name || 'Selected'}</strong>
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Quick Inward Bar */}
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
              <span className="flex items-center gap-1.5">
                <PackagePlus className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Quick Inward New Serial Numbers on the Fly
              </span>
              <span className="text-[11px] font-normal text-indigo-700/80 dark:text-indigo-300/80">
                Type or scan serials to inward & auto-select
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className={canViewProfit ? "sm:col-span-6" : "sm:col-span-9"}>
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Serial Number(s)
                </label>
                <Input
                  placeholder="Enter serial(s) (comma or space separated)..."
                  value={quickSerialInput}
                  onChange={e => setQuickSerialInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickInwardSerials();
                    }
                  }}
                  className="text-xs bg-white dark:bg-slate-900 font-mono h-9"
                />
              </div>
              {canViewProfit && (
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Purchase Price (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={products.find(p => p._id === selectedProductId)?.purchasePrice ? `₹${products.find(p => p._id === selectedProductId)?.purchasePrice}` : '0.00'}
                    value={quickSerialCost}
                    onChange={e => setQuickSerialCost(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-900 font-mono h-9"
                  />
                </div>
              )}
              <div className="sm:col-span-3 flex items-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleQuickInwardSerials}
                  disabled={isQuickInwardingSerial || !quickSerialInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full h-9 text-xs font-semibold px-2"
                >
                  {isQuickInwardingSerial ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                  Inward & Select
                </Button>
              </div>
            </div>
            {canViewProfit && (
              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                <span>Cost defaults to catalog purchase price if left blank.</span>
                <span>Barcodes scanned below will also use this purchase price.</span>
              </div>
            )}
          </div>

          <div className="mb-4">
            <BarcodeScanner 
              onScan={handleBarcodeScanInDialog}
              buttonText="Scan Serial Number (Camera)"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-4 max-h-[60vh] overflow-y-auto p-2">
            {availableSerials.length === 0 ? (
              <div className="col-span-full text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No serial numbers currently in stock</p>
                <p className="text-xs text-slate-500 mt-1">Use the quick inward box above or scan the barcode to inward and sell right now!</p>
              </div>
            ) : (
              availableSerials.map(s => {
                const inCart = cart.find(c => c.productId === selectedProductId)?.serialNumbers.includes(s.serialNumber);
                if (inCart) return null;

                const isSelected = selectedSerials.includes(s.serialNumber);
                return (
                  <div 
                    key={s._id}
                    onClick={() => toggleSerialSelection(s.serialNumber)}
                    className={`p-3 border-2 rounded-xl cursor-pointer transition-all text-xs font-mono text-center select-none ${
                      isSelected 
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-[0.98]' 
                      : 'hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
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
            <DialogTitle className="flex items-center justify-between">
              <span>Enter Quantity</span>
              <span className="text-xs font-normal text-muted-foreground">
                In Stock: <strong className="text-slate-800 dark:text-slate-200">{products.find(p => p._id === selectedProductId)?.stock ?? 0}</strong>
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Quantity for Sale</label>
              <Input 
                type="number" 
                min="1"
                value={selectedQuantity}
                onChange={e => setSelectedQuantity(e.target.value)}
                className="text-lg font-bold font-mono"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToCart();
                  }
                }}
              />
            </div>

            {/* Quick Inward Quantity Section */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Need more inventory stock right now?</span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Quick Inward</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className={canViewProfit ? "sm:col-span-6" : "sm:col-span-9"}>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Quantity to Add
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty to add (e.g. 10)"
                    value={quickQtyInput}
                    onChange={e => setQuickQtyInput(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-950 font-mono h-9"
                  />
                </div>
                {canViewProfit && (
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Purchase Price (₹)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={products.find(p => p._id === selectedProductId)?.purchasePrice ? `₹${products.find(p => p._id === selectedProductId)?.purchasePrice}` : '0.00'}
                      value={quickQtyCost}
                      onChange={e => setQuickQtyCost(e.target.value)}
                      className="text-xs bg-white dark:bg-slate-950 font-mono h-9"
                    />
                  </div>
                )}
                <div className="sm:col-span-3 flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleQuickInwardQuantity}
                    disabled={isQuickInwardingQty || !quickQtyInput || Number(quickQtyInput) <= 0}
                    className="w-full h-9 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                  >
                    {isQuickInwardingQty ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-0.5" />}
                    + Inward
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addToCart} size="lg" className="w-full">Confirm & Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isComboDialogOpen} onOpenChange={setIsComboDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Combo Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Combo Name</label>
              <Input 
                placeholder="e.g. 3kW Solar Package" 
                value={newCombo.name}
                onChange={e => setNewCombo({ ...newCombo, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Package Price</label>
              <Input 
                type="number"
                min="0"
                placeholder="Total amount" 
                value={newCombo.totalPrice}
                onChange={e => setNewCombo({ ...newCombo, totalPrice: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input 
                type="checkbox" 
                id="combo-gst" 
                checked={newCombo.isGstInclusive}
                onChange={e => setNewCombo({ ...newCombo, isGstInclusive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="combo-gst" className="text-sm font-medium">
                Price is GST Inclusive
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                if (!newCombo.name || !newCombo.totalPrice) {
                  toast.error("Please fill name and price");
                  return;
                }
                setComboGroups([...comboGroups, {
                  internalId: 'combo_' + Date.now().toString(),
                  name: newCombo.name,
                  totalPrice: Number(newCombo.totalPrice),
                  isGstInclusive: newCombo.isGstInclusive
                }]);
                setNewCombo({ name: '', totalPrice: '', isGstInclusive: true });
                setIsComboDialogOpen(false);
                toast.success("Combo Package created!");
              }} 
              size="lg" 
              className="w-full"
            >
              Create Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Quick Inward Modal */}
      <Dialog open={isQuickInwardModalOpen} onOpenChange={setIsQuickInwardModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <PackagePlus className="h-5 w-5" />
              Quick Inward Inventory (At POS)
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickModalSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select Product</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={quickModalProductId}
                onChange={e => {
                  const pid = e.target.value;
                  setQuickModalProductId(pid);
                  const p = products.find(prod => prod._id === pid);
                  if (p?.purchasePrice) setQuickModalCost(String(p.purchasePrice));
                }}
                required
              >
                <option value="">-- Choose Product to Inward --</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.sku ? `(${p.sku})` : ''} - [{p.trackSerials !== false ? 'Serialized' : `Stock: ${p.stock || 0}`}]
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const selectedP = products.find(p => p._id === quickModalProductId);
              const isSerialized = selectedP?.trackSerials !== false;
              return (
                <>
                  {isSerialized ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Serial Numbers (One per line or comma separated)
                        </label>
                        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                          Serialized Battery/Inverter
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        placeholder={"e.g.\nEXIDE-BT-9821\nEXIDE-BT-9822\nEXIDE-BT-9823"}
                        value={quickModalSerialsText}
                        onChange={e => setQuickModalSerialsText(e.target.value)}
                        className="w-full rounded-md border border-input bg-background p-2.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      />
                      <p className="text-[11px] text-slate-500">
                        Total serials detected: {quickModalSerialsText.split(/[\n,;\s]+/).map(s => s.trim()).filter(Boolean).length}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Quantity to Add
                        </label>
                        <span className="text-[11px] font-medium text-slate-500">
                          Current Stock: {selectedP?.stock || 0}
                        </span>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={quickModalQuantity}
                        onChange={e => setQuickModalQuantity(e.target.value)}
                        placeholder="Quantity to add"
                        required
                      />
                    </div>
                  )}

                  <div className={`grid grid-cols-1 ${canViewProfit ? 'sm:grid-cols-2' : ''} gap-3 pt-1`}>
                    {canViewProfit && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Purchase / Cost Price (₹)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={quickModalCost}
                          onChange={e => setQuickModalCost(e.target.value)}
                          placeholder={selectedP?.purchasePrice ? `Default: ₹${selectedP.purchasePrice}` : '0.00'}
                        />
                        <p className="text-[10px] text-slate-400">Leave blank to use catalog purchase price</p>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Supplier / Reference Note
                      </label>
                      <Input
                        type="text"
                        value={quickModalSupplier}
                        onChange={e => setQuickModalSupplier(e.target.value)}
                        placeholder="e.g. Local Delivery / Urgent Inward"
                      />
                    </div>
                  </div>
                </>
              );
            })()}

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuickInwardModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isQuickModalSubmitting || !quickModalProductId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {isQuickModalSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Inwarding...
                  </>
                ) : (
                  <>
                    <PackagePlus className="h-4 w-4 mr-1.5" />
                    Inward & Make Available
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Customer Modal */}
      <Dialog open={isAddCustomerModalOpen} onOpenChange={setIsAddCustomerModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCustomerSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input required value={newCustomerData.name} onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input required value={newCustomerData.phone} onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={newCustomerData.email} onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input value={newCustomerData.address} onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">GST Number</label>
              <Input value={newCustomerData.gstNumber} onChange={e => setNewCustomerData({...newCustomerData, gstNumber: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">State Name</label>
                <Input value={newCustomerData.state} onChange={e => setNewCustomerData({...newCustomerData, state: e.target.value})} placeholder="e.g. Uttar Pradesh" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State Code</label>
                <Input value={newCustomerData.stateCode} onChange={e => setNewCustomerData({...newCustomerData, stateCode: e.target.value})} placeholder="e.g. 09" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmittingCustomer}>
              {isSubmittingCustomer ? 'Saving...' : 'Save Customer'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
