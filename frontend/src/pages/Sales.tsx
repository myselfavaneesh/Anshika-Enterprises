import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Download, Trash2, Search, X, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';

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
      alert('No phone number found for this customer.');
      return;
    }
    const message = `Hello ${sale.customerId.name},\n\nYour invoice ${sale.invoiceNumber} for ₹${sale.grandTotal.toFixed(2)} has been generated.\n\nPlease find the details attached (or contact us if you haven't received the PDF).`;
    const encodedMessage = encodeURIComponent(message);
    const phone = sale.customerId.phone.replace(/\D/g, '');
    window.open(`https://wa.me/91${phone}?text=${encodedMessage}`, '_blank');
  };

  const handleDelete = async (saleId: string) => {
    if (confirm('Are you sure you want to delete this invoice? This will restore inventory and reverse customer balances.')) {
      try {
        await api.delete(`/sales/${saleId}`);
        fetchSales();
      } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to delete sale');
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

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Grand Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: limit }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                  <TableCell><div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                  <TableCell><div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell><div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell><div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell><div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell><div className="h-8 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                </TableRow>
              ))
            ) : sales.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center">No sales found.</TableCell></TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale._id}>
                  <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                  <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{sale.customerId ? `${sale.customerId.name} (${sale.customerId.phone || 'No Phone'})` : 'Unknown'}</TableCell>
                  <TableCell className="text-right">₹{sale.subtotal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{sale.discount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{((sale.cgstAmount || 0) + (sale.sgstAmount || 0) + (sale.igstAmount || 0) || sale.taxAmount || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-primary">₹{sale.grandTotal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Print Invoice" onClick={() => handlePrintInvoice(sale._id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Send via WhatsApp" className="text-green-600 hover:text-green-800" onClick={() => handleSendWhatsapp(sale)}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete Invoice" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(sale._id)}>
                        <Trash2 className="h-4 w-4" />
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
