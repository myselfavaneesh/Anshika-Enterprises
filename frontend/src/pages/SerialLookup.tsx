import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { BarcodeScanner } from '../components/BarcodeScanner';
import {
  Search,
  Package,
  ShoppingCart,
  Truck,
  User,
  Calendar,
  FileText,
  MapPin,
  Hash,
  Phone,
  CircleDot,
  Warehouse,
  ScanBarcode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const SerialLookup = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (serial?: string) => {
    const searchQuery = serial || query.trim();
    if (!searchQuery) return;

    setLoading(true);
    setNotFound(false);
    setResult(null);
    setSearched(true);

    try {
      const response = await api.get('/inventory/serial-lookup', {
        params: { q: searchQuery }
      });
      setResult(response.data);
      setNotFound(false);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNotFound(true);
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleScanResult = (code: string) => {
    setQuery(code);
    setShowScanner(false);
    handleSearch(code);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '—';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return {
          label: 'In Stock',
          color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          bgGlow: 'from-emerald-500/10 to-transparent'
        };
      case 'SOLD':
        return {
          label: 'Sold',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          icon: ShoppingCart,
          iconColor: 'text-blue-600 dark:text-blue-400',
          bgGlow: 'from-blue-500/10 to-transparent'
        };
      case 'DEFECTIVE':
        return {
          label: 'Defective',
          color: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800',
          icon: XCircle,
          iconColor: 'text-red-600 dark:text-red-400',
          bgGlow: 'from-red-500/10 to-transparent'
        };
      case 'RETURNED':
        return {
          label: 'Returned',
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          icon: AlertTriangle,
          iconColor: 'text-amber-600 dark:text-amber-400',
          bgGlow: 'from-amber-500/10 to-transparent'
        };
      default:
        return {
          label: status,
          color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          icon: CircleDot,
          iconColor: 'text-slate-500',
          bgGlow: 'from-slate-500/10 to-transparent'
        };
    }
  };

  const statusConfig = result ? getStatusConfig(result.status) : null;
  const StatusIcon = statusConfig?.icon || CircleDot;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Serial Number Lookup
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Search any serial number to check status, purchase & sale details
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Enter serial number..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 h-11 text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowScanner(true)}
              variant="outline"
              className="h-11 px-4 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              <ScanBarcode className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Scan</span>
            </Button>
            <Button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-200 dark:shadow-indigo-950 transition-all active:scale-[0.97]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Search className="h-4 w-4 mr-1.5" />
              )}
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Dialog */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowScanner(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Scan Serial Number</h3>
            <BarcodeScanner
              onScan={handleScanResult}
            />
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Searching serial number...</p>
        </div>
      )}

      {/* Not Found State */}
      {!loading && notFound && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-10 sm:p-12 shadow-sm flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center mb-1">
            <XCircle className="h-7 w-7 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Serial Number Not Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">
            No product unit found with serial number "<span className="font-semibold text-slate-700 dark:text-slate-300">{query}</span>". 
            Please check and try again.
          </p>
        </div>
      )}

      {/* Empty / Initial State */}
      {!loading && !result && !notFound && !searched && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-10 sm:p-16 shadow-sm flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center mb-2 shadow-sm">
            <ScanBarcode className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Search a Serial Number</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
            Enter or scan a serial number to check if the product is in stock or sold. 
            View complete purchase and sale history.
          </p>
        </div>
      )}

      {/* Result */}
      {!loading && result && statusConfig && (
        <div className="space-y-4">
          {/* Status Banner */}
          <div className={`relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm`}>
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
              result.status === 'IN_STOCK' ? 'from-emerald-500 to-emerald-300' :
              result.status === 'SOLD' ? 'from-blue-500 to-blue-300' :
              result.status === 'DEFECTIVE' ? 'from-red-500 to-red-300' :
              'from-amber-500 to-amber-300'
            }`} />
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                result.status === 'IN_STOCK' ? 'bg-emerald-100 dark:bg-emerald-950/50' :
                result.status === 'SOLD' ? 'bg-blue-100 dark:bg-blue-950/50' :
                result.status === 'DEFECTIVE' ? 'bg-red-100 dark:bg-red-950/50' :
                'bg-amber-100 dark:bg-amber-950/50'
              }`}>
                <StatusIcon className={`h-7 w-7 ${statusConfig.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight font-mono">
                    {result.serialNumber}
                  </h2>
                  <Badge className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 border ${statusConfig.color}`}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {result.status === 'IN_STOCK' && 'This product is currently available in stock'}
                  {result.status === 'SOLD' && 'This product has been sold to a customer'}
                  {result.status === 'DEFECTIVE' && 'This product is marked as defective'}
                  {result.status === 'RETURNED' && 'This product has been returned'}
                </p>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Product Info */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
                  <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Product Details</h3>
              </div>
              <div className="space-y-3">
                <InfoRow icon={Package} label="Product" value={result.product?.name || '—'} />
                <InfoRow icon={Hash} label="SKU" value={result.product?.sku || '—'} mono />
                <InfoRow icon={FileText} label="HSN Code" value={result.product?.hsnCode || '—'} mono />
                <InfoRow icon={CircleDot} label="Category" value={result.product?.category?.name || '—'} />
                {result.warehouse && (
                  <InfoRow icon={Warehouse} label="Warehouse" value={result.warehouse.name} />
                )}
                {result.purchasePrice !== null && result.purchasePrice !== undefined && (
                  <InfoRow icon={FileText} label="Purchase Price" value={formatCurrency(result.purchasePrice)} highlight />
                )}
                {result.batchNumber && (
                  <InfoRow icon={Hash} label="Batch" value={result.batchNumber} mono />
                )}
              </div>
            </div>

            {/* Purchase Info */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Purchase Info</h3>
              </div>
              {result.purchaseInfo ? (
                <div className="space-y-3">
                  <InfoRow icon={Calendar} label="Purchase Date" value={formatDate(result.purchaseInfo.purchaseDate)} />
                  <InfoRow icon={FileText} label="Invoice No." value={result.purchaseInfo.invoiceNumber || '—'} mono />
                  {result.purchaseInfo.supplier && (
                    <>
                      <InfoRow icon={User} label="Supplier" value={result.purchaseInfo.supplier.name || '—'} />
                      {result.purchaseInfo.supplier.phone && (
                        <InfoRow icon={Phone} label="Phone" value={result.purchaseInfo.supplier.phone} />
                      )}
                    </>
                  )}
                  {result.purchaseInfo.grandTotal && (
                    <InfoRow icon={FileText} label="Invoice Total" value={formatCurrency(result.purchaseInfo.grandTotal)} highlight />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                    <Truck className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">No purchase info available</p>
                  <p className="text-[10px] text-slate-400/70 dark:text-slate-500/70 mt-0.5">
                    Added on {formatDate(result.createdAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Sale Info (or In-Stock info) */}
            <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm ${
              result.status === 'SOLD' 
                ? 'border-blue-200/80 dark:border-blue-900/60' 
                : 'border-slate-200/80 dark:border-slate-800/80'
            }`}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  result.status === 'SOLD' 
                    ? 'bg-blue-100 dark:bg-blue-950/50' 
                    : 'bg-emerald-100 dark:bg-emerald-950/50'
                }`}>
                  <ShoppingCart className={`h-4 w-4 ${
                    result.status === 'SOLD' 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {result.status === 'SOLD' ? 'Sale Details' : 'Stock Status'}
                </h3>
              </div>
              {result.saleInfo ? (
                <div className="space-y-3">
                  <InfoRow icon={Calendar} label="Sale Date" value={formatDate(result.saleInfo.saleDate)} />
                  <InfoRow icon={FileText} label="Invoice No." value={result.saleInfo.invoiceNumber || '—'} mono />
                  <InfoRow icon={FileText} label="Doc Type" value={
                    result.saleInfo.documentType === 'TAX_INVOICE' ? 'Tax Invoice' :
                    result.saleInfo.documentType === 'PROFORMA' ? 'Proforma' :
                    result.saleInfo.documentType === 'CHALLAN' ? 'Challan' :
                    result.saleInfo.documentType || '—'
                  } />
                  {result.saleInfo.customer && (
                    <>
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Customer</p>
                      </div>
                      <InfoRow icon={User} label="Name" value={result.saleInfo.customer.name || '—'} />
                      {result.saleInfo.customer.phone && (
                        <InfoRow icon={Phone} label="Phone" value={result.saleInfo.customer.phone} />
                      )}
                      {result.saleInfo.customer.address && (
                        <InfoRow icon={MapPin} label="Address" value={result.saleInfo.customer.address} />
                      )}
                    </>
                  )}
                  {result.saleInfo.grandTotal && (
                    <InfoRow icon={FileText} label="Invoice Total" value={formatCurrency(result.saleInfo.grandTotal)} highlight />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                    result.status === 'IN_STOCK' 
                      ? 'bg-emerald-100 dark:bg-emerald-950/50' 
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    {result.status === 'IN_STOCK' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <ShoppingCart className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                  <p className={`text-xs font-semibold ${
                    result.status === 'IN_STOCK' 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {result.status === 'IN_STOCK' ? 'Available in Stock' : 'Not Sold Yet'}
                  </p>
                  <p className="text-[10px] text-slate-400/70 dark:text-slate-500/70 mt-1">
                    {result.status === 'IN_STOCK' ? 'This unit is ready for sale' : 'No sale record found'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Timeline</h3>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-4">
                {/* Entry */}
                <TimelineItem
                  icon={Truck}
                  iconBg="bg-amber-100 dark:bg-amber-950/50"
                  iconColor="text-amber-600 dark:text-amber-400"
                  title="Purchased / Added to Stock"
                  date={formatDate(result.purchaseInfo?.purchaseDate || result.createdAt)}
                  subtitle={result.purchaseInfo?.supplier?.name ? `From ${result.purchaseInfo.supplier.name}` : undefined}
                  invoiceNo={result.purchaseInfo?.invoiceNumber}
                />

                {/* Sale (if sold) */}
                {result.saleInfo && (
                  <TimelineItem
                    icon={ShoppingCart}
                    iconBg="bg-blue-100 dark:bg-blue-950/50"
                    iconColor="text-blue-600 dark:text-blue-400"
                    title="Sold to Customer"
                    date={formatDate(result.saleInfo.saleDate)}
                    subtitle={result.saleInfo.customer?.name ? `To ${result.saleInfo.customer.name}` : undefined}
                    invoiceNo={result.saleInfo.invoiceNumber}
                  />
                )}

                {/* Current Status */}
                <TimelineItem
                  icon={StatusIcon}
                  iconBg={
                    result.status === 'IN_STOCK' ? 'bg-emerald-100 dark:bg-emerald-950/50' :
                    result.status === 'SOLD' ? 'bg-blue-100 dark:bg-blue-950/50' :
                    result.status === 'DEFECTIVE' ? 'bg-red-100 dark:bg-red-950/50' :
                    'bg-amber-100 dark:bg-amber-950/50'
                  }
                  iconColor={statusConfig.iconColor}
                  title={`Current Status: ${statusConfig.label}`}
                  date={formatDate(result.updatedAt)}
                  isLast
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Sub-components ───────────────────────────────────────── */

const InfoRow = ({ icon: Icon, label, value, mono, highlight }: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) => (
  <div className="flex items-start gap-2.5">
    <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xs mt-0.5 truncate ${
        highlight 
          ? 'font-bold text-indigo-600 dark:text-indigo-400' 
          : mono 
            ? 'font-mono font-semibold text-slate-700 dark:text-slate-300' 
            : 'font-semibold text-slate-800 dark:text-slate-200'
      }`}>
        {value}
      </p>
    </div>
  </div>
);

const TimelineItem = ({ icon: Icon, iconBg, iconColor, title, date, subtitle, invoiceNo, isLast }: {
  icon: any;
  iconBg: string;
  iconColor: string;
  title: string;
  date: string;
  subtitle?: string;
  invoiceNo?: string;
  isLast?: boolean;
}) => (
  <div className="relative flex items-start gap-3 pl-0.5">
    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-white dark:ring-slate-900`}>
      <Icon className={`h-4 w-4 ${iconColor}`} />
    </div>
    <div className={`flex-1 min-w-0 ${!isLast ? 'pb-2' : ''}`}>
      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</p>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{date}</p>
      {subtitle && (
        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
      )}
      {invoiceNo && (
        <p className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 mt-0.5">#{invoiceNo}</p>
      )}
    </div>
  </div>
);

export default SerialLookup;
