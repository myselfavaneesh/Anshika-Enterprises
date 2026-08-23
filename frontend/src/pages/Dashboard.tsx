import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Package, IndianRupee, TrendingUp, AlertTriangle, Users, Calendar, ShoppingCart } from 'lucide-react';

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
  { value: 'week', label: '7 Days' },
  { value: 'month', label: 'Month' },
  { value: '30days', label: '30 Days' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

const StatCard = ({
  title,
  value,
  icon: Icon,
  colorClass,
  iconBg,
  subtext,
}: {
  title: string;
  value: string;
  icon: any;
  colorClass: string;
  iconBg: string;
  subtext?: string;
}) => (
  <Card className={`relative overflow-hidden border-0 shadow-sm ${colorClass}`}>
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{title}</p>
          <p className="text-2xl font-extrabold tracking-tight">{value}</p>
          {subtext && <p className="text-xs opacity-60 mt-0.5">{subtext}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className="h-5 w-5 opacity-90" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SkeletonCard = () => (
  <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-3 shadow-sm">
    <div className="flex justify-between items-center">
      <div className="h-3 w-28 shimmer rounded-full" />
      <div className="h-8 w-8 shimmer rounded-xl" />
    </div>
    <div className="h-7 w-36 shimmer rounded-full" />
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Business overview & analytics</p>
        </div>

        {/* Pill Date Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm flex-wrap">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDateRangeType(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  dateRangeType === f.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {dateRangeType === 'custom' && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border-0 outline-none text-xs bg-transparent text-slate-700 dark:text-slate-300"
              />
              <span className="text-slate-400 text-xs">→</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border-0 outline-none text-xs bg-transparent text-slate-700 dark:text-slate-300"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Filtered Stats Banner */}
      {stats?.isFiltered && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Filtered Sales Revenue"
            value={`₹${stats.filteredRevenue.toFixed(2)}`}
            icon={IndianRupee}
            colorClass="bg-gradient-to-br from-blue-500 to-blue-600 text-white"
            iconBg="bg-white/20"
          />
          <StatCard
            title="Filtered Gross Profit"
            value={`₹${stats.filteredProfit.toFixed(2)}`}
            icon={TrendingUp}
            colorClass="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
            iconBg="bg-white/20"
          />
        </div>
      )}

      {/* Global Stats */}
      {!stats ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="All Time Revenue"
            value={`₹${stats.totalSales.toFixed(2)}`}
            icon={IndianRupee}
            colorClass="bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
            iconBg="bg-white/20"
          />
          <StatCard
            title="Taxable Revenue"
            value={`₹${(stats.totalTaxableSales || 0).toFixed(2)}`}
            icon={IndianRupee}
            colorClass="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            iconBg="bg-slate-100 dark:bg-slate-700 text-slate-500"
          />
          <StatCard
            title="Today's Sales"
            value={`₹${stats.todaysSales.toFixed(2)}`}
            icon={ShoppingCart}
            colorClass="bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-200 dark:shadow-sky-900/30"
            iconBg="bg-white/20"
          />
          <StatCard
            title="Total Products"
            value={`${stats.totalProducts}`}
            icon={Package}
            colorClass="bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/30"
            iconBg="bg-white/20"
          />
          <StatCard
            title="Outstanding"
            value={`₹${(stats.totalCustomerOutstanding || 0).toFixed(2)}`}
            icon={Users}
            colorClass="bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30"
            iconBg="bg-white/20"
            subtext="Customer balance due"
          />
        </div>
      )}

      {/* Chart */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Sales & Profit Trend {dateRangeType !== 'all' ? <span className="text-xs font-normal text-slate-400 ml-1">(filtered)</span> : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            {!stats ? (
              <div className="h-full shimmer rounded-xl" />
            ) : stats.chartData && stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.chartData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()}/${d.getMonth()+1}`;
                    }}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `₹${val}`} />
                  <RechartsTooltip 
                    formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, undefined]}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="sales" name="Sales" stroke="#6366f1" activeDot={{ r: 6 }} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 dark:text-slate-600 flex-col gap-2">
                <TrendingUp className="h-10 w-10 opacity-30" />
                <p className="text-sm">No data for selected period</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Low Stock */}
        <Card className="border border-red-200 dark:border-red-900/40 shadow-sm">
          <CardHeader className="bg-red-50 dark:bg-red-900/20 rounded-t-xl pb-3">
            <CardTitle className="flex items-center text-sm font-semibold text-red-700 dark:text-red-400">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Low Stock Alerts
              {stats && stats.lowStockProducts.length > 0 && (
                <span className="ml-auto text-xs bg-red-600 text-white rounded-full px-2 py-0.5 font-bold">
                  {stats.lowStockProducts.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {!stats ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 shimmer rounded-lg" />)}
              </div>
            ) : stats.lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-emerald-600 dark:text-emerald-400">
                <Package className="h-8 w-8 mb-2 opacity-60" />
                <p className="text-sm font-medium">All products adequately stocked</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.lowStockProducts.map((item, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 px-3 py-2">
                    <div>
                      <p className="font-semibold text-sm text-slate-800 dark:text-white">{item.product?.name}</p>
                      <p className="text-xs text-slate-400">SKU: {item.product?.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">{item.currentStock} left</p>
                      <p className="text-xs text-slate-400">Min: {item.product?.lowStockThreshold}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-indigo-500" />
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 shimmer rounded-lg" />)}
              </div>
            ) : stats.recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No recent sales</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 dark:border-slate-800">
                      <TableHead className="text-xs font-semibold">Invoice</TableHead>
                      <TableHead className="text-xs font-semibold">Customer</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Amount</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentSales.map((sale) => (
                      <TableRow key={sale._id} className="border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <TableCell className="font-semibold text-indigo-600 dark:text-indigo-400 text-sm py-2.5">{sale.invoiceNumber}</TableCell>
                        <TableCell className="text-sm py-2.5 text-slate-600 dark:text-slate-300">{sale.customerId?.name || 'Unknown'}</TableCell>
                        <TableCell className="text-right text-sm py-2.5 font-medium">₹{sale.grandTotal.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-bold text-sm py-2.5 ${(sale.profit || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : (sale.profit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
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
