import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Papa from 'papaparse';
import { Download, Calculator, BarChart3, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

export default function Reports() {
  const { canViewProfit } = useAuth();
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(1)).toISOString().split('T')[0] // First of current month
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  // Data states
  const [gstSummary, setGstSummary] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [salesByCategory, setSalesByCategory] = useState<any[]>([]);
  const [salesByProduct, setSalesByProduct] = useState<any[]>([]);
  const [salesRegister, setSalesRegister] = useState<any[]>([]);
  const [valuation, setValuation] = useState<any>(null);
  const [aging, setAging] = useState<any>(null);
  const [partyProfitability, setPartyProfitability] = useState<any[]>([]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = { startDate, endDate };
      const requests: Promise<any>[] = [
        api.get('/reports/gst-summary', { params }),
        api.get('/reports/sales-by-category', { params }),
        api.get('/reports/sales-by-product', { params }),
        api.get('/reports/sales-register', { params }),
        api.get('/reports/stock-aging')
      ];

      if (canViewProfit) {
        requests.push(api.get('/reports/profit-and-loss', { params }));
        requests.push(api.get('/reports/inventory-valuation'));
        requests.push(api.get('/reports/party-profitability', { params }));
      }

      const results = await Promise.all(requests);
      setGstSummary(results[0].data);
      setSalesByCategory(results[1].data);
      setSalesByProduct(results[2].data);
      setSalesRegister(results[3].data);
      setAging(results[4].data);

      if (canViewProfit && results.length >= 8) {
        setPnl(results[5].data);
        setValuation(results[6].data);
        setPartyProfitability(results[7].data);
      }
    } catch (err) {
      console.error('Failed to fetch reports', err);
      toast.error('Failed to generate reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const exportCSV = (data: any[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSalesRegister = () => {
    const data = salesRegister.map(s => ({
      Date: format(new Date(s.date), 'dd/MM/yyyy'),
      'Invoice No': s.invoiceNumber,
      Customer: s.customerName,
      GSTIN: s.gstin,
      'Payment Mode': s.paymentMode,
      'Taxable Amt': Number(s.taxableAmount || 0).toFixed(2),
      CGST: Number(s.cgst || 0).toFixed(2),
      SGST: Number(s.sgst || 0).toFixed(2),
      IGST: Number(s.igst || 0).toFixed(2),
      Discount: Number(s.discount || 0).toFixed(2),
      'Grand Total': Number(s.grandTotal || 0).toFixed(2)
    }));
    exportCSV(data, 'Sales_Register');
  };

  const handleExportProductSales = () => {
    exportCSV(salesByProduct.map(p => ({
      SKU: p.sku,
      Product: p.name,
      'Qty Sold': p.quantity,
      Revenue: Number(p.revenue || 0).toFixed(2)
    })), 'Product_Sales');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics Center</h1>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border shadow-sm">
          <Filter className="w-4 h-4 text-slate-500 ml-2" />
          <Input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className="w-auto border-0 focus-visible:ring-0"
          />
          <span className="text-sm text-slate-500">to</span>
          <Input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className="w-auto border-0 focus-visible:ring-0"
          />
          <Button onClick={fetchReports} disabled={loading} size="sm" className="ml-2">
            Generate
          </Button>
        </div>
      </div>

      <Tabs defaultValue={canViewProfit ? "financials" : "sales"} className="w-full">
        <TabsList className={`grid w-full ${canViewProfit ? 'grid-cols-6' : 'grid-cols-3'} max-w-5xl`}>
          {canViewProfit && <TabsTrigger value="financials">Financials</TabsTrigger>}
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
          {canViewProfit && <TabsTrigger value="valuation">Valuation</TabsTrigger>}
          <TabsTrigger value="aging">Aging</TabsTrigger>
          {canViewProfit && <TabsTrigger value="profitability">Profitability</TabsTrigger>}
        </TabsList>

        {canViewProfit && (
          <TabsContent value="financials" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profit and Loss */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-emerald-700">
                  <Calculator className="w-5 h-5 mr-2" />
                  Profit & Loss Statement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pnl ? (
                  <>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-600">Total Sales Revenue</span>
                      <span className="font-semibold">₹{Number(pnl.totalRevenue || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2 text-red-600">
                      <span>Less: Cost of Goods Sold</span>
                      <span>- ₹{Number(pnl.totalCOGS || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2 font-bold text-lg">
                      <span>Gross Profit</span>
                      <span className="text-emerald-600">₹{Number(pnl.grossProfit || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2 text-red-600">
                      <span>Less: Operational Expenses</span>
                      <span>- ₹{Number(pnl.totalExpenses || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 font-bold text-xl">
                      <span>NET PROFIT</span>
                      <span className={Number(pnl.netProfit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}>
                        ₹{Number(pnl.netProfit || 0).toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : <p>Loading...</p>}
              </CardContent>
            </Card>

            {/* GST Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-blue-700">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  GST Summary Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gstSummary ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-50 p-3 rounded border">
                        <p className="text-sm text-slate-500">B2B Sales (Registered)</p>
                        <p className="font-bold text-lg">₹{Number(gstSummary.b2bSales || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border">
                        <p className="text-sm text-slate-500">B2C Sales (Unregistered)</p>
                        <p className="font-bold text-lg">₹{Number(gstSummary.b2cSales || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-600">Total Taxable Value</span>
                      <span className="font-semibold">₹{Number(gstSummary.totalTaxable || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-600">CGST</span>
                      <span>₹{Number(gstSummary.totalCGST || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-600">SGST</span>
                      <span>₹{Number(gstSummary.totalSGST || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-600">IGST</span>
                      <span>₹{Number(gstSummary.totalIGST || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 font-bold text-lg">
                      <span>Total Output Tax Liability</span>
                      <span className="text-blue-600">₹{Number(gstSummary.totalTax || 0).toFixed(2)}</span>
                    </div>
                  </>
                ) : <p>Loading...</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        )}

        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Product-wise Sales</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportProductSales}>
                  <Download className="w-4 h-4 mr-2" /> Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesByProduct.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.sku}</p>
                          </TableCell>
                          <TableCell className="text-right">{p.quantity}</TableCell>
                          <TableCell className="text-right font-semibold">₹{Number(p.revenue || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Category-wise Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesByCategory.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right font-semibold">₹{Number(c.revenue || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Date-wise Sales Register</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Detailed list of all sales for accounting</p>
              </div>
              <Button onClick={handleExportSalesRegister} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                Export to CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>GSTIN</TableHead>
                      <TableHead className="text-right">Taxable</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesRegister.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap">{format(new Date(s.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{s.invoiceNumber}</TableCell>
                        <TableCell>{s.customerName}</TableCell>
                        <TableCell className="text-xs">{s.gstin || '-'}</TableCell>
                        <TableCell className="text-right">₹{Number(s.taxableAmount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs">
                          C: {Number(s.cgst || 0).toFixed(2)}<br/>
                          S: {Number(s.sgst || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold">₹{Number(s.grandTotal || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {salesRegister.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          No sales found in this date range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewProfit && (
          <TabsContent value="valuation">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Valuation</CardTitle>
              </CardHeader>
              <CardContent>
                {valuation ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                      <p className="text-sm text-emerald-800">Total Inventory Value (FIFO / Purchase Price)</p>
                      <p className="text-2xl font-bold text-emerald-900">₹{Number(valuation.totalValuation || 0).toFixed(2)}</p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Qty in Stock</TableHead>
                          <TableHead className="text-right">Total Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {valuation.valuationBreakdown.map((item: any) => (
                          <TableRow key={item.productId}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell>{item.sku}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right font-semibold">₹{Number(item.totalValue || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : <p>Loading...</p>}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="aging">
          <Card>
            <CardHeader>
              <CardTitle>Stock Aging Report</CardTitle>
              <p className="text-sm text-slate-500">How long has stock been sitting in the warehouse?</p>
            </CardHeader>
            <CardContent>
              {aging ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(aging).map(([key, data]: [string, any]) => (
                    <div key={key} className={`p-4 rounded-lg border ${
                      key === '90_plus' ? 'bg-red-50 border-red-200' :
                      key === '61_90' ? 'bg-orange-50 border-orange-200' :
                      key === '31_60' ? 'bg-amber-50 border-amber-200' :
                      'bg-emerald-50 border-emerald-200'
                    }`}>
                      <p className="font-semibold">{data.label}</p>
                      <p className="text-2xl font-bold my-2">{data.count} items</p>
                      <p className="text-sm text-slate-600">Value: ₹{Number(data.value || 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : <p>Loading...</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {canViewProfit && (
          <TabsContent value="profitability">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Party-wise Profitability Report</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Analysis of profit earned per party</p>
                </div>
                <Button onClick={() => exportCSV(partyProfitability.map(p => ({
                  Customer: p.name,
                  Phone: p.phone,
                  Group: p.group,
                  Orders: p.orderCount,
                  Revenue: Number(p.revenue || 0).toFixed(2),
                  Profit: Number(p.profit || 0).toFixed(2)
                })), 'Party_Profitability')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Export to CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partyProfitability.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.phone}</TableCell>
                          <TableCell>{p.group}</TableCell>
                          <TableCell className="text-right">{p.orderCount}</TableCell>
                          <TableCell className="text-right font-medium text-slate-700">₹{Number(p.revenue || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">₹{Number(p.profit || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {partyProfitability.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                            No data found in this date range.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

