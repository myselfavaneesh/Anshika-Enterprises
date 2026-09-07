import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Download, Trash2, Search, X, ChevronLeft, ChevronRight, MessageCircle, Edit, Mail } from 'lucide-react';

const Sales = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/sales', {
        params: { page, limit, q: searchTerm || undefined }
      });
      setSales(response.data.data || response.data);
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching sales', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, limit, searchTerm]);

  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [searchTerm, limit]);

  const handlePrintInvoice = (saleId: string) => {
    window.open(`/sales/${saleId}/print`, '_blank');
  };

  const handleSendWhatsapp = (sale: any) => {
    if (!sale.customerId?.phone) {
      toast.error('No phone number found for this customer.');
      return;
    }
    const docType = sale.invoiceType === 'NON_GST' ? 'Estimate' : 'Invoice';
    const message = `Hello ${sale.customerId.name},\n\nAapka ${docType} *${sale.invoiceNumber}* generate ho gaya hai.\nKul Raqam: *₹${sale.grandTotal.toFixed(2)}*\n\n- Anshika Enterprises`;

    if (navigator.share) {
      navigator.share({
        title: `${docType} ${sale.invoiceNumber}`,
        text: message,
      }).catch(() => {
        const encodedMessage = encodeURIComponent(message);
        const phone = sale.customerId.phone.replace(/\D/g, '');
        window.open(`https://wa.me/91${phone}?text=${encodedMessage}`, '_blank');
      });
    } else {
      const encodedMessage = encodeURIComponent(message);
      const phone = sale.customerId.phone.replace(/\D/g, '');
      window.open(`https://wa.me/91${phone}?text=${encodedMessage}`, '_blank');
    }
  };

  const handleSendEmail = async (sale: any) => {
    if (!sale.customerId?.email) {
      toast.error('No email address found for this customer. Please update customer details with an email first.');
      return;
    }
    try {
      await api.post(`/sales/${sale._id}/email`);
      toast.success(`Invoice email sent successfully to ${sale.customerId.email}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send email. Make sure SMTP settings in backend .env are correct.');
    }
  };

  const handleDelete = async (saleId: string) => {
    if (confirm('Are you sure you want to delete this invoice? This will restore inventory and reverse customer balances.')) {
      try {
        await api.delete(`/sales/${saleId}`);
        fetchSales();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete sale');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Sales History</h2>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/sales/new">
            <Plus className="mr-2 h-4 w-4" /> New Sale
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 w-full">
        <div className="flex flex-1 items-center gap-2 bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-1.5 shadow-sm max-w-lg w-full">
          <Search className="h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search sales by invoice # or customer name/phone..."
            className="flex-1 bg-transparent border-0 outline-none text-sm p-0.5 placeholder-slate-400 focus:ring-0 focus:ring-offset-0"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-x-auto">
        <Table className="min-w-[850px]">
          <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800">
            <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-transparent">
              <TableHead className="h-9 py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-32">Invoice #</TableHead>
              <TableHead className="h-9 py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-28">Date</TableHead>
              <TableHead className="h-9 py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Customer</TableHead>
              <TableHead className="h-9 py-2 px-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-24">Subtotal</TableHead>
              <TableHead className="h-9 py-2 px-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-20">Discount</TableHead>
              <TableHead className="h-9 py-2 px-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-20">Tax</TableHead>
              <TableHead className="h-9 py-2 px-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 w-28">Grand Total</TableHead>
              <TableHead className="h-9 py-2 px-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-24">Profit</TableHead>
              <TableHead className="h-9 py-2 px-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-36">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: limit }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-b border-slate-100 dark:border-slate-800/60">
                  <TableCell className="py-2 px-3"><div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                  <TableCell className="py-2 px-3"><div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                  <TableCell className="py-2 px-3"><div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                  <TableCell className="py-2 px-3"><div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell className="py-2 px-3"><div className="h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell className="py-2 px-3"><div className="h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell className="py-2 px-3"><div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell className="py-2 px-3"><div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell className="py-2 px-3"><div className="h-7 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800 mx-auto"></div></TableCell>
                </TableRow>
              ))
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-slate-400 text-xs">No sales recorded yet.</TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow 
                  key={sale._id}
                  className="group border-b border-slate-100 dark:border-slate-800/70 hover:bg-slate-50/90 dark:hover:bg-slate-900/60 transition-colors duration-150"
                >
                  <TableCell className="py-2 px-3 whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/40 inline-block">
                      {sale.invoiceNumber}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-3 whitespace-nowrap">
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                      {new Date(sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-3">
                    <div>
                      <span className="font-medium text-xs text-slate-800 dark:text-slate-200 block truncate max-w-[180px]">
                        {sale.customerId?.name || 'Walk-in Customer'}
                      </span>
                      {sale.customerId?.phone && (
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 block">
                          {sale.customerId.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
                    ₹{sale.subtotal.toFixed(2)}
                  </TableCell>
                  <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-xs text-slate-500">
                    {sale.discount > 0 ? `₹${sale.discount.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-xs text-slate-500">
                    ₹{((sale.cgstAmount || 0) + (sale.sgstAmount || 0) + (sale.igstAmount || 0) || sale.taxAmount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-white">
                    ₹{sale.grandTotal.toFixed(2)}
                  </TableCell>
                  <TableCell className="py-2 px-3 text-right whitespace-nowrap">
                    <span className={`inline-block font-mono tabular-nums text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                      (sale.profit || 0) > 0 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40' 
                        : (sale.profit || 0) < 0 
                        ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200/50 dark:border-red-800/40' 
                        : 'text-slate-400'
                    }`}>
                      {(sale.profit || 0) >= 0 ? '+' : ''}₹{(sale.profit || 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity duration-150">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Print Invoice" 
                        className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform duration-150 active:scale-90 hover:scale-105"
                        onClick={() => handlePrintInvoice(sale._id)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Edit Invoice" 
                        className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform duration-150 active:scale-90 hover:scale-105"
                        asChild
                      >
                        <Link to={`/sales/${sale._id}/edit`}>
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Send via WhatsApp" 
                        className="h-7 w-7 text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-950/50 transition-transform duration-150 active:scale-90 hover:scale-105" 
                        onClick={() => handleSendWhatsapp(sale)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Send via Email (Gmail)" 
                        className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-transform duration-150 active:scale-90 hover:scale-105" 
                        onClick={() => handleSendEmail(sale)}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Delete Invoice" 
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-transform duration-150 active:scale-90 hover:scale-105" 
                        onClick={() => handleDelete(sale._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
