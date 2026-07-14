import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

import { Trash2, Plus, Receipt } from 'lucide-react';


const NewQuotation = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  
  // Serial numbers are not needed for quotations since inventory isn't deducted
  const [quantityInput, setQuantityInput] = useState('1');
  
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

  const handleGenerateQuotation = async () => {
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

      const response = await api.post('/quotations', payload);
      const quotationId = response.data._id;
      
      window.open(`/quotations/${quotationId}/print`, '_blank');
      navigate('/quotations');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error creating quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">New Quotation</h2>
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
                <div className="w-24 space-y-2">
                  <label className="text-sm font-medium">Qty</label>
                  <Input type="number" min="1" value={quantityInput} onChange={e => setQuantityInput(e.target.value)} />
                </div>
                
                <Button onClick={addToCart} disabled={!selectedProductId}><Plus className="mr-2 h-4 w-4" /> Add</Button>
              </div>

              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
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
                            {item.name} <span className="text-xs text-muted-foreground ml-2">({item.sku})</span>
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
                          <TableCell className="text-right">{taxRateNum}%</TableCell>
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
                onClick={handleGenerateQuotation}
                disabled={isSubmitting || cart.length === 0 || !selectedCustomerId}
              >
                <Receipt className="mr-2 h-5 w-5" />
                Generate Quotation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>


    </div>
  );
};

export default NewQuotation;
