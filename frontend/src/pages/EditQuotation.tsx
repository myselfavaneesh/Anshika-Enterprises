import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

import { Trash2, Plus, Receipt } from 'lucide-react';

const SHOP_STATE_CODE = '09'; // Uttar Pradesh

const EditQuotation = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  
  // Serial numbers are not needed for quotations since inventory isn't deducted
  const [quantityInput, setQuantityInput] = useState('1');
  
  const [discount, setDiscount] = useState('0');
  const [invoiceType, setInvoiceType] = useState('GST'); 
  
  // Dynamic Services selected
  const [selectedServices, setSelectedServices] = useState<{name: string, amount: string, gstRate: string, isGstInclusive: boolean}[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, prodRes, quotRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products?limit=10000'),
          api.get(`/quotations/${id}`)
        ]);
        setCustomers(custRes.data.data || custRes.data);
        setProducts(prodRes.data.data || prodRes.data);
        
        const q = quotRes.data;
        setSelectedCustomerId(q.customerId?._id || q.customerId?.id || q.customerId);
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
          gstRate: item.gstRate || item.productId.gstRate || 0,
          isGstInclusive: item.productId.isGstInclusive !== undefined ? item.productId.isGstInclusive : true,
          wattage: item.wattage || item.productId.wattage || 0
        })));
      } catch (error) {
        console.error('Error fetching data', error);
      }
    };
    fetchData();
  }, [id]);

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setQuantityInput('1');
  };

  const addToCart = () => {
    if (!selectedProductId || Number(quantityInput) <= 0) {
      alert("Please select a product and valid quantity");
      return;
    }
    const product = products.find(p => p._id === selectedProductId);
    if (!product) return;
    
    const qty = Number(quantityInput);

    const existingItemIndex = cart.findIndex(item => item.productId === product._id);
    if (existingItemIndex >= 0) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += qty;
      const calcQty = (newCart[existingItemIndex].wattage || 0) > 0 ? newCart[existingItemIndex].quantity * newCart[existingItemIndex].wattage : newCart[existingItemIndex].quantity;
      newCart[existingItemIndex].totalPrice = calcQty * newCart[existingItemIndex].unitPrice;
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
        gstRate: product.gstRate || 0,
        isGstInclusive: product.isGstInclusive !== undefined ? product.isGstInclusive : true,
        wattage: wattage
      }]);
    }
    
    setSelectedProductId('');
    setQuantityInput('1');
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

  const handleUpdateQuotation = async () => {
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
          wattage: item.wattage || 0,
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
        grandTotal
      };

      await api.put(`/quotations/${id}`, payload);
      
      window.open(`/quotations/${id}/print`, '_blank');
      navigate('/quotations');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error updating quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Edit Quotation</h2>
        
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border">
          <Button 
            size="sm" 
            variant={invoiceType === 'GST' ? 'default' : 'ghost'} 
            className={invoiceType === 'GST' ? 'shadow-sm' : ''}
            onClick={() => setInvoiceType('GST')}
          >
            GST Quotation
          </Button>
          <Button 
            size="sm" 
            variant={invoiceType === 'NON_GST' ? 'default' : 'ghost'}
            className={invoiceType === 'NON_GST' ? 'shadow-sm' : ''}
            onClick={() => setInvoiceType('NON_GST')}
          >
            Non-GST Quotation
          </Button>
        </div>
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
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end w-full">
                <div className="w-full space-y-2">
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
                <div className="w-24 space-y-2">
                  <label className="text-sm font-medium">Qty</label>
                  <Input type="number" min="1" value={quantityInput} onChange={e => setQuantityInput(e.target.value)} />
                </div>
                
                <Button onClick={addToCart} disabled={!selectedProductId} className="w-full sm:w-auto mt-2 sm:mt-0"><Plus className="mr-2 h-4 w-4" /> Add</Button>
              </div>

              <div className="mt-6 overflow-x-auto rounded-md border">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate / Price</TableHead>
                      <TableHead className="text-right">GST %</TableHead>
                      <TableHead className="text-right">GST Inclusive Amount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Cart is empty</TableCell></TableRow>
                    ) : (
                      cart.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium">
                            <div>{item.name} <span className="text-xs text-muted-foreground ml-2">({item.sku})</span></div>
                            {item.wattage > 0 && (
                              <div className="text-xs text-blue-600 font-semibold mt-1">
                                Panel Wattage: {item.wattage}W | Total: {item.wattage * item.quantity}W
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                className="w-24 h-8 text-right ml-auto" 
                                value={item.unitPrice} 
                                onChange={e => updateItemPrice(item.productId, Number(e.target.value))} 
                              />
                              {item.wattage > 0 && <span className="text-xs text-muted-foreground mt-1">Per Watt</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {invoiceType === 'GST' ? `${item.gstRate || 0}%` : '0%'}
                          </TableCell>
                          <TableCell className="text-right">₹{item.totalPrice.toFixed(2)}</TableCell>
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
                <>
                  <div className="border-t pt-4 flex justify-between text-sm">
                    <span className="text-slate-500">Taxable Value</span>
                    <span className="font-medium">₹{taxableAmount.toFixed(2)}</span>
                  </div>
                  {isInterState ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">IGST</span>
                      <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">CGST</span>
                        <span className="font-medium">₹{cgstAmount.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">SGST</span>
                        <span className="font-medium">₹{sgstAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="border-t pt-4 flex justify-between items-center">
                <span className="text-lg font-bold">Grand Total</span>
                <span className="text-xl font-bold text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>

              <Button 
                className="w-full mt-6" 
                size="lg" 
                onClick={handleUpdateQuotation}
                disabled={isSubmitting || cart.length === 0 || !selectedCustomerId}
              >
                <Receipt className="mr-2 h-5 w-5" />
                Update Quotation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>


    </div>
  );
};

export default EditQuotation;
