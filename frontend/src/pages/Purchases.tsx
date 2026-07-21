import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Trash2, Search, X, ChevronLeft, ChevronRight, Edit } from 'lucide-react';

const Purchases = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/purchases', {
        params: { page, limit, q: searchTerm || undefined }
      });
      setPurchases(response.data.data || response.data);
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching purchases', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchases();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, limit, searchTerm]);

  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [searchTerm, limit]);

  const handleDelete = async (purchaseId: string) => {
    if (confirm('Are you sure you want to delete this purchase? This will remove inventory and reverse supplier balances.')) {
      try {
        await api.delete(`/purchases/${purchaseId}`);
        fetchPurchases();
      } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to delete purchase');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Purchase History</h2>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/purchases/new">
            <Plus className="mr-2 h-4 w-4" /> New Purchase
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 w-full">
        <div className="flex flex-1 items-center gap-2 bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-1.5 shadow-sm max-w-lg w-full">
          <Search className="h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search purchases by invoice # or supplier name..."
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
              <TableHead>Supplier</TableHead>
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
            ) : purchases.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center">No purchases found.</TableCell></TableRow>
            ) : (
              purchases.map((purchase) => (
                <TableRow key={purchase._id}>
                  <TableCell className="font-medium">{purchase.purchaseInvoiceNumber}</TableCell>
                  <TableCell>{new Date(purchase.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{purchase.supplierId ? `${purchase.supplierId.name} (${purchase.supplierId.phone || 'No Phone'})` : 'Unknown'}</TableCell>
                  <TableCell className="text-right">₹{purchase.subtotal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{purchase.discount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{((purchase.cgstAmount || 0) + (purchase.sgstAmount || 0) + (purchase.igstAmount || 0) || purchase.taxAmount || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-primary">₹{purchase.grandTotal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Edit Purchase" className="text-slate-500 hover:text-slate-700">
                        <Link to={`/purchases/${purchase.id || purchase._id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete Purchase" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(purchase._id)}>
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

export default Purchases;
