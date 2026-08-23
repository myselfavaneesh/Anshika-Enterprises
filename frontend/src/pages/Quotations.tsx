import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Download, Trash2, Edit, Search, X, ChevronLeft, ChevronRight, MessageCircle, FileOutput, Mail } from 'lucide-react';

const Quotations = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/quotations', {
        params: { page, limit, q: searchTerm || undefined, status: statusFilter || undefined, expiringSoon: expiringSoon ? 'true' : undefined }
      });
      setQuotations(response.data.data || response.data);
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching quotations', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuotations();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, limit, searchTerm, statusFilter, expiringSoon]);

  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [searchTerm, limit, statusFilter, expiringSoon]);

  const handleUpdateStatus = async (quotationId: string, newStatus: string) => {
    try {
      await api.patch(`/quotations/${quotationId}/status`, { status: newStatus });
      setQuotations(quotations.map(q => q._id === quotationId ? { ...q, status: newStatus } : q));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handlePrintQuotation = (quotationId: string) => {
    window.open(`/quotations/${quotationId}/print`, '_blank');
  };

  const handleSendWhatsapp = (quotation: any) => {
    if (!quotation.customerId?.phone) {
      alert('No phone number found for this customer.');
      return;
    }
    const docType = quotation.invoiceType === 'NON_GST' ? 'Estimate' : 'Quotation';
    const message = `Hello ${quotation.customerId.name},\n\nAapka ${docType} *${quotation.quotationNumber}* generate ho gaya hai.\nKul Raqam: *₹${quotation.grandTotal.toFixed(2)}*\n\n- Anshika Enterprises`;

    if (navigator.share) {
      navigator.share({
        title: `${docType} ${quotation.quotationNumber}`,
        text: message,
      }).catch(() => {
        const encodedMessage = encodeURIComponent(message);
        const phone = quotation.customerId.phone.replace(/\D/g, '');
        window.open(`https://wa.me/91${phone}?text=${encodedMessage}`, '_blank');
      });
    } else {
      const encodedMessage = encodeURIComponent(message);
      const phone = quotation.customerId.phone.replace(/\D/g, '');
      window.open(`https://wa.me/91${phone}?text=${encodedMessage}`, '_blank');
    }
  };

  const handleSendEmail = async (quotation: any) => {
    if (!quotation.customerId?.email) {
      alert('No email address found for this customer. Please update customer details with an email first.');
      return;
    }
    try {
      await api.post(`/quotations/${quotation._id}/email`);
      alert(`Quotation/Estimate email sent successfully to ${quotation.customerId.email}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send email. Make sure SMTP settings in backend .env are correct.');
    }
  };

  const handleDelete = async (quotationId: string) => {
    if (confirm('Are you sure you want to delete this quotation?')) {
      try {
        await api.delete(`/quotations/${quotationId}`);
        fetchQuotations();
      } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to delete quotation');
      }
    }
  };

  const handleConvertToInvoice = (quotationId: string) => {
    navigate(`/sales/new?quotationId=${quotationId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Quotations</h2>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/quotations/new">
            <Plus className="mr-2 h-4 w-4" /> New Quotation
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 w-full">
        <div className="flex flex-1 items-center gap-2 bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-1.5 shadow-sm max-w-lg w-full">
          <Search className="h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search quotations by # or customer name/phone..."
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
        <select
          className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm shadow-sm outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-orange-50 px-3 py-1.5 rounded-md border border-orange-200 cursor-pointer">
          <input type="checkbox" checked={expiringSoon} onChange={e => setExpiringSoon(e.target.checked)} className="rounded border-orange-400 text-orange-600 focus:ring-orange-500" />
          Expiring Soon
        </label>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950 overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Quotation #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Status</TableHead>
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
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                  <TableCell><div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                  <TableCell><div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                  <TableCell><div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                  <TableCell><div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell><div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell><div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell><div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                  <TableCell><div className="h-8 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800 ml-auto"></div></TableCell>
                </TableRow>
              ))
            ) : quotations.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center">No quotations found.</TableCell></TableRow>
            ) : (
              quotations.map((quotation) => (
                <TableRow key={quotation._id}>
                  <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                  <TableCell>{new Date(quotation.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{quotation.customerId ? `${quotation.customerId.name} (${quotation.customerId.phone || 'No Phone'})` : 'Unknown'}</TableCell>
                  <TableCell>
                    {quotation.validUntil ? (
                      <span className={new Date(quotation.validUntil) < new Date() ? 'text-red-600 font-medium' : 'text-slate-600'}>
                        {new Date(quotation.validUntil).toLocaleDateString()}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <select
                      className={`text-xs font-semibold px-2 py-1 rounded-full border outline-none ${
                        quotation.status === 'ACCEPTED' ? 'bg-green-100 text-green-800 border-green-200' :
                        quotation.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                        quotation.status === 'SENT' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        'bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                      value={quotation.status || 'DRAFT'}
                      onChange={(e) => handleUpdateStatus(quotation._id, e.target.value)}
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="SENT">SENT</option>
                      <option value="ACCEPTED">ACCEPTED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right">₹{quotation.subtotal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{quotation.discount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{((quotation.cgstAmount || 0) + (quotation.sgstAmount || 0) + (quotation.igstAmount || 0) || quotation.taxAmount || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-primary">₹{quotation.grandTotal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Print Quotation" onClick={() => handlePrintQuotation(quotation._id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Convert to Invoice" className="text-purple-600 hover:text-purple-800" onClick={() => handleConvertToInvoice(quotation._id)}>
                        <FileOutput className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Send via WhatsApp" className="text-green-600 hover:text-green-800" onClick={() => handleSendWhatsapp(quotation)}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Send via Email (Gmail)" className="text-blue-600 hover:text-blue-800" onClick={() => handleSendEmail(quotation)}>
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit Quotation" asChild>
                        <Link to={`/quotations/${quotation._id}/edit`}>
                          <Edit className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete Quotation" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(quotation._id)}>
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

export default Quotations;
