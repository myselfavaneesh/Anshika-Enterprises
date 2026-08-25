import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Package, TrendingUp, AlertTriangle, Users, Calendar, ShoppingCart, ShieldCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalProducts: number;
  totalInventoryValue: number;
  totalSales: number;
  totalTaxableSales: number;
  todaysSales: number;
  monthlySales: number;
  totalCustomerOutstanding?: number;
  filteredRevenue: number;
  filteredProfit: number;
  chartData: any[];
  isFiltered: boolean;
  lowStockProducts: any[];
  recentSales: any[];
}

const DATE_FILTERS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7D' },
  { value: 'month', label: 'Month' },
  { value: '30days', label: '30D' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

const StatCard = ({
  title,
  value,
  icon: Icon,
  badgeText,
}: {
  title: string;
  value: string;
  icon?: any;
  badgeText?: string;
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">{value}</p>
      {badgeText && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{badgeText}</span>
        </div>
      )}
    </div>
  );
};

const SkeletonCard = () => (
  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-3 shadow-sm">
    <div className="h-3 w-24 shimmer rounded-full" />
    <div className="h-7 w-32 shimmer rounded-lg" />
  </div>
);

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

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Business Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Overview & key operational performance indicators</p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-1 shadow-sm flex-wrap">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDateRangeType(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  dateRangeType === f.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {dateRangeType === 'custom' && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border-0 outline-none text-xs bg-transparent text-slate-700 dark:text-slate-300 font-mono"
              />
              <span className="text-slate-400 text-xs">→</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border-0 outline-none text-xs bg-transparent text-slate-700 dark:text-slate-300 font-mono"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Filtered Active Banner */}
      {stats?.isFiltered && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Filtered Sales Revenue"
            value={`₹${stats.filteredRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingUp}
            badgeText="Period revenue"
          />
          <StatCard
            title="Filtered Gross Profit"
            value={`₹${stats.filteredProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingUp}
            badgeText="Period estimated profit"
          />
        </div>
      )}

      {/* Bento Grid Metrics */}
      {!stats ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total Revenue"
            value={`₹${stats.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={TrendingUp}
            badgeText="All-time gross sales"
          />
          <StatCard
            title="Taxable Sales"
            value={`₹${(stats.totalTaxableSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={ShieldCheck}
            badgeText="GST eligible volume"
          />
          <StatCard
            title="Today's Sales"
            value={`₹${stats.todaysSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={ShoppingCart}
            badgeText="Real-time daily tracker"
          />
          <StatCard
            title="Inventory SKUs"
            value={`${stats.totalProducts}`}
            icon={Package}
            badgeText="Catalog active items"
          />
          <StatCard
            title="Khata Balance Due"
            value={`₹${(stats.totalCustomerOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Users}
            badgeText="Customer receivables"
          />
        </div>
      )}

      {/* Chart Section */}
      <Card className="border border-slate-200/80 dark:border-slate-800 shadow-soft">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            <span>Revenue & Profit Performance</span>
            {dateRangeType !== 'all' && (
              <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">
                Filtered
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {!stats ? (
              <div className="h-full shimmer rounded-xl" />
            ) : stats.chartData && stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.chartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()}/${d.getMonth()+1}`;
                    }}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <RechartsTooltip 
                    formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, undefined]}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="sales" name="Sales" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 dark:text-slate-600 flex-col gap-2">
                <TrendingUp className="h-8 w-8 opacity-30" />
                <p className="text-xs font-medium">No sales recorded for the selected timeframe</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Grid: Low Stock & Recent Transactions */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Low Stock Card */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-soft">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
            {stats && stats.lowStockProducts.length > 0 && (
              <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-full px-2 py-0.5 font-bold border border-red-200/80 dark:border-red-900/40">
                {stats.lowStockProducts.length} items
              </span>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {!stats ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-11 shimmer rounded-xl" />)}
              </div>
            ) : stats.lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-emerald-600 dark:text-emerald-400">
                <Package className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs font-semibold">Inventory levels are healthy</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.lowStockProducts.map((item, index) => (
                  <div key={index} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 px-3.5 py-2.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-900">
                    <div>
                      <p className="font-semibold text-xs text-slate-800 dark:text-white">{item.product?.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">SKU: {item.product?.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-red-600 dark:text-red-400 font-mono">{item.currentStock} left</p>
                      <p className="text-[10px] text-slate-400 font-mono">Threshold: {item.product?.lowStockThreshold}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales Table */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-soft">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-indigo-500" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {!stats ? (
              <div className="space-y-3 pt-2">
                {[1,2,3].map(i => <div key={i} className="h-11 shimmer rounded-xl" />)}
              </div>
            ) : stats.recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs font-medium">No recent transactions recorded</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 dark:border-slate-800">
                      <TableHead className="text-[11px] font-bold uppercase text-slate-400">Invoice</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase text-slate-400">Customer</TableHead>
                      <TableHead className="text-right text-[11px] font-bold uppercase text-slate-400">Amount</TableHead>
                      <TableHead className="text-right text-[11px] font-bold uppercase text-slate-400">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentSales.map((sale) => (
                      <TableRow key={sale._id} className="border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <TableCell className="font-semibold text-indigo-600 dark:text-indigo-400 text-xs py-2.5 font-mono">{sale.invoiceNumber}</TableCell>
                        <TableCell className="text-xs py-2.5 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[120px]">{sale.customerId?.name || 'Walk-in'}</TableCell>
                        <TableCell className="text-right text-xs py-2.5 font-semibold font-mono tabular-nums">₹{sale.grandTotal.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-bold text-xs py-2.5 font-mono tabular-nums ${(sale.profit || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (sale.profit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                          {(sale.profit || 0) >= 0 ? '+' : ''}₹{(sale.profit || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
