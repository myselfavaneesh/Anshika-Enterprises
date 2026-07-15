import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Package, IndianRupee, TrendingUp, AlertTriangle } from 'lucide-react';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalProducts: number;
  totalInventoryValue: number;
  totalSales: number;
  totalTaxableSales: number;
  todaysSales: number;
  monthlySales: number;
  filteredRevenue: number;
  filteredProfit: number;
  chartData: any[];
  isFiltered: boolean;
  lowStockProducts: any[];
  recentSales: any[];
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Date filtering state
  const [dateRangeType, setDateRangeType] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let url = '/dashboard';
        let queryParams = new URLSearchParams();

        if (dateRangeType !== 'all' && dateRangeType !== 'custom') {
          const today = new Date();
          let start = new Date();
          if (dateRangeType === 'today') {
            start.setHours(0, 0, 0, 0);
          } else if (dateRangeType === 'week') {
            start.setDate(today.getDate() - 7);
          } else if (dateRangeType === 'month') {
            start.setMonth(today.getMonth() - 1);
          } else if (dateRangeType === '30days') {
            start.setDate(today.getDate() - 30);
          }
          queryParams.append('startDate', start.toISOString());
          queryParams.append('endDate', today.toISOString());
        } else if (dateRangeType === 'custom') {
          if (customStartDate) queryParams.append('startDate', new Date(customStartDate).toISOString());
          if (customEndDate) queryParams.append('endDate', new Date(customEndDate).toISOString());
        }

        if (queryParams.toString()) {
          url += '?' + queryParams.toString();
        }

        const response = await api.get(url);
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      }
    };
    fetchStats();
  }, [dateRangeType, customStartDate, customEndDate]);

  if (!stats) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <select 
            value={dateRangeType} 
            onChange={(e) => setDateRangeType(e.target.value)}
            className="border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRangeType === 'custom' && (
            <div className="flex items-center space-x-2">
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-900"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Dynamic Filtered Stats */}
      {stats.isFiltered && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-6">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Filtered Sales Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-100">₹{stats.filteredRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Filtered Gross Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-100">₹{stats.filteredProfit.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Global Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Time Gross Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">₹{stats.totalSales.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Time Taxable Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-700 dark:text-slate-300">₹{(stats.totalTaxableSales || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.todaysSales.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        
      </div>

      {/* Sales and Profit Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales & Profit Trend {dateRangeType !== 'all' ? '(Filtered)' : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            {stats.chartData && stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()}/${d.getMonth()+1}`;
                    }}
                    className="text-xs text-muted-foreground"
                  />
                  <YAxis className="text-xs text-muted-foreground" tickFormatter={(val) => `₹${val}`} />
                  <RechartsTooltip 
                    formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, undefined]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="sales" name="Sales" stroke="#3b82f6" activeDot={{ r: 8 }} strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No data available for the selected period
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1 border-red-200 dark:border-red-900">
          <CardHeader className="bg-red-50 dark:bg-red-900/20 rounded-t-lg">
            <CardTitle className="flex items-center text-red-600 dark:text-red-400">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {stats.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products are adequately stocked.</p>
            ) : (
              <div className="space-y-4">
                {stats.lowStockProducts.map((item, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{item.product?.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.product?.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{item.currentStock} left</p>
                      <p className="text-xs text-muted-foreground">Threshold: {item.product?.lowStockThreshold}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent sales.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentSales.map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                      <TableCell>{sale.customerId?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right">₹{sale.grandTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
