import toast from 'react-hot-toast';
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import api from '../services/api';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  FileText, IndianRupee, ArrowLeft, MessageCircle, Pencil, Trash2, 
  Phone, Download, Plus, Loader2, ArrowDownLeft, ArrowUpRight, 
  ShoppingBag, Receipt, Calendar, Search, Printer, 
  FileSpreadsheet, RotateCcw, CheckCircle2, AlertCircle
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

type PresetType = 'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'FY' | 'CUSTOM';
type FilterType = 'ALL' | 'INVOICE' | 'PAYMENT';

export default function PartyLedger() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const isCustomer = type === 'customers';

  // Date Filtering State
  const [activePreset, setActivePreset] = useState<PresetType>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Transaction Filters State
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Statement Print / Export Preview Dialog
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Record Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [bulkPayments, setBulkPayments] = useState([{ amount: '', paymentMode: 'CASH', referenceId: '', notes: '' }]);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Edit Payment Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState('CASH');

  // Business Profile for Statement Header & Bank Details
  const { data: businessProfile } = useSWR('/settings/business-profile?decrypt=true', fetcher);

  // Construct Query String for Date-Filtered Ledger
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  const queryString = queryParams.toString();

  // Fetch Ledger Data
  const { data, mutate, isLoading } = useSWR(
    id && type ? `/${type}/${id}/ledger${queryString ? `?${queryString}` : ''}` : null,
    fetcher
  );

  const party = data ? (isCustomer ? data.customer : data.supplier) : null;
  const rawLedger = data?.ledger || [];
  const openingBalance = Number(data?.openingBalance || 0);
  const closingBalance = Number(data?.closingBalance || 0);
  const totalDebit = Number(data?.totalDebit || 0);
  const totalCredit = Number(data?.totalCredit || 0);

  // Preset Date Range Handler
  const handleSelectPreset = (preset: PresetType) => {
    setActivePreset(preset);
    const now = new Date();

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      const todayStr = format(now, 'yyyy-MM-dd');
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (preset === 'LAST_MONTH') {
      const lastMonth = subMonths(now, 1);
      setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
    } else if (preset === 'FY') {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed (April is 3)
      const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      const fyEndYear = fyStartYear + 1;
      setStartDate(`${fyStartYear}-04-01`);
      setEndDate(`${fyEndYear}-03-31`);
    }
  };

  // Filtered Ledger Rows based on Search and Type Filter
  const filteredLedger = useMemo(() => {
    return rawLedger.filter((entry: any) => {
      // Type Filter
      if (typeFilter === 'INVOICE' && entry.type === 'PAYMENT') return false;
      if (typeFilter === 'PAYMENT' && entry.type !== 'PAYMENT') return false;

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const voucher = (entry.invoiceNumber || entry.referenceId || '').toLowerCase();
        const mode = (entry.paymentMode || '').toLowerCase();
        const notes = (entry.notes || '').toLowerCase();
        const items = entry.items?.map((it: any) => `${it.productId?.name || ''} ${it.serialNumbers?.join(' ') || ''}`).join(' ').toLowerCase() || '';

        return voucher.includes(q) || mode.includes(q) || notes.includes(q) || items.includes(q);
      }

      return true;
    });
  }, [rawLedger, typeFilter, searchQuery]);

  // Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!party) return;

    const validPayments = bulkPayments.filter(p => Number(p.amount) > 0);
    if (validPayments.length === 0) {
      toast.error('Please enter at least one valid payment amount.');
      return;
    }

    setIsSubmittingBulk(true);
    try {
      const payload = validPayments.map(p => ({
        entityType: isCustomer ? 'CUSTOMER' : 'SUPPLIER',
        entityId: party._id,
        type: isCustomer ? 'MONEY_IN' : 'MONEY_OUT',
        amount: Number(p.amount),
        paymentMode: p.paymentMode,
        referenceId: p.referenceId || undefined,
        notes: p.notes || undefined,
      }));

      await api.post('/payments/bulk', payload);
      toast.success('Payments recorded successfully');
      setIsPaymentModalOpen(false);
      setBulkPayments([{ amount: '', paymentMode: 'CASH', referenceId: '', notes: '' }]);
      mutate();
    } catch (error: any) {
      console.error('Error recording payments:', error);
      toast.error(error.response?.data?.error || 'Failed to record payments');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Edit Payment
  const handleOpenEditPayment = (entry: any) => {
    setEditingPaymentId(entry._id || entry.id);
    setEditAmount(entry.amount ? entry.amount.toString() : '');
    setEditPaymentMode(entry.paymentMode || 'CASH');
    setIsEditModalOpen(true);
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentId) return;

    setIsSubmittingEdit(true);
    try {
      await api.put(`/payments/${editingPaymentId}`, {
        amount: Number(editAmount),
        paymentMode: editPaymentMode,
      });
      toast.success('Payment updated successfully');
      setIsEditModalOpen(false);
      setEditingPaymentId(null);
      setEditAmount('');
      mutate();
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast.error(error.response?.data?.error || 'Failed to update payment');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Payment
  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment record? The running balance will be automatically recalculated.')) {
      return;
    }

    try {
      await api.delete(`/payments/${paymentId}`);
      toast.success('Payment deleted successfully');
      mutate();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast.error(error.response?.data?.error || 'Failed to delete payment');
    }
  };

  // Direct Phone Call
  const handleCall = () => {
    if (!party?.phone) {
      toast.error('No phone number found for this party.');
      return;
    }
    const cleanPhone = party.phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };

  // Direct WhatsApp Reminder / Statement
  const handleSendWhatsAppStatement = () => {
    if (!party?.phone) {
      toast.error('No phone number found for this party.');
      return;
    }
    const cleanPhone = party.phone.replace(/\D/g, '');
    const compName = businessProfile?.businessName || 'Anshika Enterprises';
    
    let periodText = 'All Time';
    if (startDate && endDate) {
      periodText = `${format(new Date(startDate), 'dd MMM yyyy')} to ${format(new Date(endDate), 'dd MMM yyyy')}`;
    } else if (startDate) {
      periodText = `From ${format(new Date(startDate), 'dd MMM yyyy')}`;
    } else if (endDate) {
      periodText = `Up to ${format(new Date(endDate), 'dd MMM yyyy')}`;
    }

    const netAmountFormatted = formatCurrency(Math.abs(closingBalance));
    const statusNote = isCustomer
      ? (closingBalance > 0 ? 'Due to Pay (लेना बाकी है)' : closingBalance < 0 ? 'Advance Credit (एडवांस जमा)' : 'All Settled (हिसाब चुकता)')
      : (closingBalance > 0 ? 'Due to Pay (देना बाकी है)' : closingBalance < 0 ? 'Advance Paid (एडवांस दिया)' : 'All Settled (हिसाब चुकता)');

    let msg = `*ACCOUNT STATEMENT / खाता विवरण*\n`;
    msg += `*${compName.toUpperCase()}*\n`;
    msg += `─────────────────────────\n`;
    msg += `*Party Name:* ${party.name}\n`;
    msg += `*Period:* ${periodText}\n\n`;
    msg += `• *Opening Balance:* ${formatCurrency(Math.abs(openingBalance))}\n`;
    msg += `• *Total Invoiced (+):* ${formatCurrency(totalDebit)}\n`;
    msg += `• *Total Paid (-):* ${formatCurrency(totalCredit)}\n`;
    msg += `─────────────────────────\n`;
    msg += `*Net Balance:* *${netAmountFormatted}* (${statusNote})\n`;
    msg += `─────────────────────────\n`;

    if (isCustomer && closingBalance > 0) {
      msg += `\n*Bank & UPI Payment Details:*\n`;
      if (businessProfile?.upiId) msg += `UPI ID: *${businessProfile.upiId}*\n`;
      if (businessProfile?.bankName && businessProfile?.accountNumber) {
        msg += `Bank: ${businessProfile.bankName}\n`;
        msg += `A/C: ${businessProfile.accountNumber} | IFSC: ${businessProfile.ifscCode || ''}\n`;
      }
      msg += `\nPlease clear the balance at your earliest convenience. Thank you!`;
    } else {
      msg += `\nThank you for your business and partnership!`;
    }

    const encodedMessage = encodeURIComponent(msg);
    window.open(`https://wa.me/91${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  // CSV / Excel Statement Export
  const handleExportCSV = () => {
    if (!party) return;
    const compName = businessProfile?.businessName || 'ANSHIKA ENTERPRISES';
    const compGstin = businessProfile?.gstin || '09BZOPK7723E1Z1';
    const compPhone = businessProfile?.phone || '8840527476';

    const periodStr = (startDate && endDate)
      ? `${startDate} to ${endDate}`
      : (startDate ? `From ${startDate}` : (endDate ? `Up to ${endDate}` : 'All Time'));

    const csvMeta = [
      `"${compName} - ACCOUNT STATEMENT"`,
      `"GSTIN: ${compGstin} | Phone: ${compPhone}"`,
      `"Party: ${party.name} | Phone: ${party.phone || '-'} | GSTIN: ${party.gstNumber || '-'}"`,
      `"Period: ${periodStr}"`,
      `"Opening Balance: ₹${openingBalance.toFixed(2)}"`,
      `"Total Debit (Dr): ₹${totalDebit.toFixed(2)}"`,
      `"Total Credit (Cr): ₹${totalCredit.toFixed(2)}"`,
      `"Closing Balance: ₹${closingBalance.toFixed(2)} (${closingBalance >= 0 ? 'Dr / You Get' : 'Cr / You Give'})"`,
      `""`,
    ];

    const headers = ['Date', 'Time', 'Type', 'Voucher / Ref', 'Particulars / Items', 'Payment Mode', 'Debit (Dr)', 'Credit (Cr)', 'Running Balance'];
    const rows: string[][] = [];

    // Opening balance entry
    if (openingBalance !== 0 || startDate) {
      rows.push([
        startDate || '-',
        '-',
        'OPENING_BALANCE',
        'OP-BAL',
        'Opening Balance b/f (पिछला बकाया)',
        '-',
        openingBalance > 0 ? openingBalance.toFixed(2) : '0.00',
        openingBalance < 0 ? Math.abs(openingBalance).toFixed(2) : '0.00',
        openingBalance.toFixed(2),
      ]);
    }

    // Ledger entries
    filteredLedger.forEach((entry: any) => {
      const isPayment = entry.type === 'PAYMENT';
      const dr = !isPayment ? (entry.grandTotal || 0).toFixed(2) : '0.00';
      const cr = isPayment ? (entry.amount || 0).toFixed(2) : '0.00';
      const dateFormatted = format(new Date(entry.date), 'dd/MM/yyyy');
      const timeFormatted = format(new Date(entry.date), 'hh:mm a');
      const typeLabel = isPayment ? (entry.paymentType === 'MONEY_IN' ? 'Payment In' : 'Payment Out') : (isCustomer ? 'Sales Invoice' : 'Purchase Bill');
      const voucher = entry.invoiceNumber || entry.referenceId || '-';
      let particular = '';
      if (isPayment) {
        const modeLabel = entry.paymentMode === 'SCRAP' ? 'Battery Scrap (पुराना बैटरी)' : (entry.paymentMode || 'Cash');
        particular = `Payment via ${modeLabel}${entry.notes ? ` - ${entry.notes}` : ''}`;
      } else {
        particular = entry.items?.map((it: any) => `${it.productId?.name || 'Product'} (x${it.quantity || 1})`).join('; ') || 'Invoice';
      }
      const mode = isPayment ? (entry.paymentMode || 'CASH') : '-';
      const bal = (entry.runningBalance ?? 0).toFixed(2);

      rows.push([dateFormatted, timeFormatted, typeLabel, voucher, particular, mode, dr, cr, bal]);
    });

    const escapeCell = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const csvContent = '\uFEFF' + [
      ...csvMeta,
      headers.map(escapeCell).join(','),
      ...rows.map(r => r.map(escapeCell).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${party.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Statement_${startDate || 'all'}_to_${endDate || 'today'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Excel / CSV statement exported successfully');
  };

  // Download PDF Statement from Printable Section
  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-account-statement');
    if (!element) {
      toast.error('Statement element not found');
      return;
    }

    setIsDownloadingPdf(true);
    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename: `${party?.name || 'Party'}_Account_Statement.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt as any).from(element).save();
      toast.success('PDF statement downloaded successfully');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF statement');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Browser Print Statement
  const handlePrintStatement = () => {
    window.print();
  };

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading ledger statement & running balance...</p>
      </div>
    );
  }

  // Business Profile Details with Fallbacks
  const compName = businessProfile?.businessName || 'ANSHIKA ENTERPRISES';
  const compAddress = businessProfile?.addressLine1 
    ? `${businessProfile.addressLine1}${businessProfile.addressLine2 ? `, ${businessProfile.addressLine2}` : ''}, ${businessProfile.city || ''}, ${businessProfile.state || 'Uttar Pradesh'}${businessProfile.pincode ? ` - ${businessProfile.pincode}` : ''}`
    : 'Phoolpur, Azamgarh, Uttar Pradesh - 276304';
  const compPhone = businessProfile?.phone || '8840527476';
  const compEmail = businessProfile?.email || 'anshikaenterprises@gmail.com';
  const compGstin = businessProfile?.gstin || '09BZOPK7723E1Z1';
  const compBankName = businessProfile?.bankName || 'Union Bank of India';
  const compAccountNo = businessProfile?.accountNumber || '359701010036291';
  const compIfsc = businessProfile?.ifscCode || 'UBIN0535974';
  const compUpi = businessProfile?.upiId || '';

  const periodLabel = (startDate && endDate)
    ? `${format(new Date(startDate), 'dd MMM yyyy')} to ${format(new Date(endDate), 'dd MMM yyyy')}`
    : (startDate ? `From ${format(new Date(startDate), 'dd MMM yyyy')}` : (endDate ? `Up to ${format(new Date(endDate), 'dd MMM yyyy')}` : 'All Historical Transactions'));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-account-statement, #printable-account-statement * {
            visibility: visible;
          }
          #printable-account-statement {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/parties')} className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{party?.name}</h2>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                isCustomer ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
              }`}>
                {isCustomer ? 'Customer Ledger' : 'Supplier Ledger'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              {party?.phone && <span>Phone: {party.phone}</span>}
              {party?.gstNumber && <span>• GSTIN: {party.gstNumber}</span>}
              <span>• Period: {periodLabel}</span>
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {party?.phone && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCall}
              className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              title={`Direct Call ${party.phone}`}
            >
              <Phone className="w-3.5 h-3.5 mr-1.5" /> Call
            </Button>
          )}

          {party?.phone && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSendWhatsAppStatement}
              className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              title="Send Statement directly on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> WhatsApp Statement
            </Button>
          )}

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportCSV}
            title="Download CSV for Excel / Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-green-600" /> Export CSV
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsStatementModalOpen(true)}
            className="border-slate-300 dark:border-slate-700 font-medium"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Statement (PDF/Print)
          </Button>

          <Button 
            size="sm"
            onClick={() => setIsPaymentModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <IndianRupee className="w-3.5 h-3.5 mr-1.5" /> Record Payment
          </Button>
        </div>
      </div>

      {/* Accounting Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Opening Balance */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Opening Balance b/f</span>
            <RotateCcw className="w-3.5 h-3.5 opacity-60" />
          </div>
          <p className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100 mt-2">
            {formatCurrency(Math.abs(openingBalance))}
          </p>
          <div className="mt-2 text-[11px] font-medium">
            {openingBalance === 0 ? (
              <span className="text-slate-400 font-mono">Nil / Zero Balance</span>
            ) : openingBalance > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">
                {isCustomer ? 'Previous Due (लेना बाकी)' : 'Previous Due (देना बाकी)'}
              </span>
            ) : (
              <span className="text-purple-600 dark:text-purple-400">
                {isCustomer ? 'Advance from Customer' : 'Advance to Supplier'}
              </span>
            )}
          </div>
        </div>

        {/* 2. Total Invoiced (Debit) */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>{isCustomer ? 'Total Sales Billed' : 'Total Purchases Billed'}</span>
            <FileText className="w-3.5 h-3.5 opacity-60 text-blue-500" />
          </div>
          <p className="text-xl font-bold font-mono tracking-tight text-red-600 dark:text-red-400 mt-2">
            {formatCurrency(totalDebit)}
          </p>
          <div className="mt-2 text-[11px] text-slate-500">
            <span>Period Debit (Dr) Total</span>
          </div>
        </div>

        {/* 3. Total Paid (Credit) */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>{isCustomer ? 'Total Received (Cr)' : 'Total Disbursed (Cr)'}</span>
            <IndianRupee className="w-3.5 h-3.5 opacity-60 text-emerald-500" />
          </div>
          <p className="text-xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(totalCredit)}
          </p>
          <div className="mt-2 text-[11px] text-slate-500">
            <span>Period Credit (Cr) Total</span>
          </div>
        </div>

        {/* 4. Closing / Outstanding Balance */}
        <div className={`p-4 rounded-xl border shadow-xs ${
          closingBalance === 0 
            ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
            : isCustomer 
              ? (closingBalance > 0 ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20' : 'border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20')
              : (closingBalance > 0 ? 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20' : 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20')
        }`}>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 text-xs font-medium">
            <span>Closing Net Balance</span>
            {closingBalance === 0 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            )}
          </div>
          <p className={`text-xl font-bold font-mono tracking-tight mt-2 ${
            closingBalance === 0
              ? 'text-slate-700 dark:text-slate-300'
              : isCustomer
                ? (closingBalance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-purple-700 dark:text-purple-400')
                : (closingBalance > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400')
          }`}>
            {formatCurrency(Math.abs(closingBalance))}
          </p>
          <div className="mt-2 text-[11px] font-semibold">
            {closingBalance === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">All Settled (हिसाब चुकता)</span>
            ) : isCustomer ? (
              closingBalance > 0 ? (
                <span className="text-amber-700 dark:text-amber-400 font-bold">You Get (लेना बाकी है)</span>
              ) : (
                <span className="text-purple-700 dark:text-purple-400 font-bold">Advance Credit (एडवांस जमा)</span>
              )
            ) : (
              closingBalance > 0 ? (
                <span className="text-red-700 dark:text-red-400 font-bold">You Give (देना बाकी है)</span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Advance Paid (एडवांस दिया)</span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Date Filter & Preset Controls */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Accounting Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Period:
            </span>
            <Button 
              variant={activePreset === 'ALL' ? 'default' : 'outline'} 
              size="sm" 
              className="h-7 text-xs px-2.5"
              onClick={() => handleSelectPreset('ALL')}
            >
              All Time
            </Button>
            <Button 
              variant={activePreset === 'TODAY' ? 'default' : 'outline'} 
              size="sm" 
              className="h-7 text-xs px-2.5"
              onClick={() => handleSelectPreset('TODAY')}
            >
              Today
            </Button>
            <Button 
              variant={activePreset === 'THIS_MONTH' ? 'default' : 'outline'} 
              size="sm" 
              className="h-7 text-xs px-2.5"
              onClick={() => handleSelectPreset('THIS_MONTH')}
            >
              This Month
            </Button>
            <Button 
              variant={activePreset === 'LAST_MONTH' ? 'default' : 'outline'} 
              size="sm" 
              className="h-7 text-xs px-2.5"
              onClick={() => handleSelectPreset('LAST_MONTH')}
            >
              Last Month
            </Button>
            <Button 
              variant={activePreset === 'FY' ? 'default' : 'outline'} 
              size="sm" 
              className="h-7 text-xs px-2.5"
              onClick={() => handleSelectPreset('FY')}
            >
              Financial Year
            </Button>
          </div>

          {/* Date Pickers for Custom Range */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">From:</span>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('CUSTOM');
                }} 
                className="h-7 text-xs w-36 px-2 py-0"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">To:</span>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('CUSTOM');
                }} 
                className="h-7 text-xs w-36 px-2 py-0"
              />
            </div>
            {(startDate || endDate) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs px-2 text-slate-500 hover:text-slate-800"
                onClick={() => handleSelectPreset('ALL')}
                title="Reset to All Time"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Secondary Filter: Search & Transaction Type */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-850">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input 
                type="text" 
                placeholder="Search invoice #, scrap, notes, product..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8 pr-3 w-full"
              />
            </div>
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs px-2"
                onClick={() => setSearchQuery('')}
              >
                Reset
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter By:</span>
            <Select value={typeFilter} onValueChange={(val: FilterType) => setTypeFilter(val)}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="All Entries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Transactions</SelectItem>
                <SelectItem value="INVOICE">{isCustomer ? 'Invoices Only' : 'Purchase Bills'}</SelectItem>
                <SelectItem value="PAYMENT">Payments Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Account Ledger Entries ({filteredLedger.length})
            </h3>
          </div>
          <div className="text-xs font-mono text-slate-500">
            Statement Period: <span className="font-semibold text-slate-800 dark:text-slate-200">{periodLabel}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-36">Date & Time</TableHead>
                <TableHead className="h-9 py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Particulars / Transaction Details</TableHead>
                <TableHead className="h-9 py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-32">Voucher / Ref</TableHead>
                <TableHead className="h-9 py-2 px-3 text-right text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 w-32">Debit (Dr)</TableHead>
                <TableHead className="h-9 py-2 px-3 text-right text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 w-32">Credit (Cr)</TableHead>
                <TableHead className="h-9 py-2 px-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 w-36">Net Balance</TableHead>
                <TableHead className="h-9 py-2 px-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Initial Opening Balance Row if date range or non-zero opening balance */}
              {(openingBalance !== 0 || startDate) && (
                <TableRow className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-dashed border-slate-200 dark:border-slate-800 font-medium">
                  <TableCell className="py-2.5 px-3 text-xs text-slate-500 font-mono">
                    {startDate ? format(new Date(startDate), 'dd MMM yyyy') : 'Prior'}
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Opening Balance b/f (पिछला बकाया)</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                    OP-BAL
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-red-600 dark:text-red-400">
                    {openingBalance > 0 ? formatCurrency(openingBalance) : '-'}
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {openingBalance < 0 ? formatCurrency(Math.abs(openingBalance)) : '-'}
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(openingBalance)}
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-center text-slate-400 text-xs">-</TableCell>
                </TableRow>
              )}

              {/* Transactions List */}
              {filteredLedger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    No transactions recorded for this selected period and filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLedger.map((entry: any) => {
                  const isPayment = entry.type === 'PAYMENT';
                  const billAmount = !isPayment ? (entry.grandTotal || 0) : 0;
                  const paidAmount = isPayment ? (entry.amount || 0) : 0;

                  // Format description
                  let description = '';
                  if (isPayment) {
                    const modeLabel = entry.paymentMode === 'SCRAP' ? 'Battery Scrap (कबाड़)' : (entry.paymentMode || 'Cash');
                    description = `Payment ${entry.paymentType === 'MONEY_IN' ? 'Received' : 'Disbursed'} via ${modeLabel}${entry.notes ? ` • ${entry.notes}` : ''}`;
                  } else {
                    const itemNames = entry.items?.map((item: any) => {
                      const sn = item.serialNumbers?.length ? ` [SN: ${item.serialNumbers.join(', ')}]` : '';
                      return `${item.productId?.name || 'Product'}${sn}`;
                    }).join(', ');
                    description = itemNames ? `Items: ${itemNames}` : 'Tax Invoice';
                  }

                  return (
                    <TableRow 
                      key={entry._id || entry.id}
                      className="group border-b border-slate-100 dark:border-slate-800/70 hover:bg-slate-50/90 dark:hover:bg-slate-900/60 transition-colors"
                    >
                      {/* Date & Time */}
                      <TableCell className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-medium text-xs text-slate-800 dark:text-slate-200 block">
                          {format(new Date(entry.date), 'dd MMM yyyy')}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 block">
                          {format(new Date(entry.date), 'hh:mm a')}
                        </span>
                      </TableCell>

                      {/* Particulars */}
                      <TableCell className="py-2.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isPayment ? (
                              entry.paymentType === 'MONEY_IN' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                                  <ArrowDownLeft className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  Payment In
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                                  <ArrowUpRight className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  Payment Out
                                </span>
                              )
                            ) : isCustomer ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
                                <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                Sales Invoice
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50">
                                <ShoppingBag className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                Purchase Bill
                              </span>
                            )}

                            {isPayment && entry.paymentMode && (
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium ${
                                entry.paymentMode === 'SCRAP' 
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}>
                                {entry.paymentMode === 'SCRAP' ? 'Battery Scrap (कबाड़)' : entry.paymentMode}
                              </span>
                            )}
                          </div>
                          <span 
                            className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-md block" 
                            title={description}
                          >
                            {description}
                          </span>
                        </div>
                      </TableCell>

                      {/* Voucher / Ref */}
                      <TableCell className="py-2.5 px-3 whitespace-nowrap">
                        {entry.invoiceNumber || entry.referenceId ? (
                          <span className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/50 inline-block">
                            {entry.invoiceNumber || entry.referenceId}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs font-mono">-</span>
                        )}
                      </TableCell>

                      {/* Debit (Dr) */}
                      <TableCell className="py-2.5 px-3 text-right font-mono tabular-nums text-xs font-semibold text-red-600 dark:text-red-400">
                        {billAmount > 0 ? formatCurrency(billAmount) : <span className="text-slate-300 dark:text-slate-600">-</span>}
                      </TableCell>

                      {/* Credit (Cr) */}
                      <TableCell className="py-2.5 px-3 text-right font-mono tabular-nums text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {paidAmount > 0 ? formatCurrency(paidAmount) : <span className="text-slate-300 dark:text-slate-600">-</span>}
                      </TableCell>

                      {/* Net Balance */}
                      <TableCell className="py-2.5 px-3 text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(entry.runningBalance)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                        {isPayment ? (
                          <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit Payment"
                              className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                              onClick={() => handleOpenEditPayment(entry)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Payment"
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                              onClick={() => handleDeletePayment(entry._id || entry.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>

            {/* Table Footer with Summary */}
            {filteredLedger.length > 0 && (
              <TableFooter className="bg-slate-50/90 dark:bg-slate-900/90 border-t-2 border-slate-200 dark:border-slate-800 font-medium">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="py-2.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Period Total Summary ({filteredLedger.length} entries)
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono tabular-nums text-xs font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(totalDebit)}
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalCredit)}
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono tabular-nums text-xs font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(closingBalance)}
                  </TableCell>
                  <TableCell className="py-2.5 px-3" />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          Full Professional Statement Preview & Print Dialog
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={isStatementModalOpen} onOpenChange={setIsStatementModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[92vh] overflow-y-auto p-0 border border-slate-200 dark:border-slate-800">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
            <div>
              <DialogTitle className="text-lg font-bold">Account Statement Preview</DialogTitle>
              <p className="text-xs text-slate-500">Official statement with business header, party details, and QR</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrintStatement}
                className="font-semibold text-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Statement
              </Button>
              <Button 
                size="sm" 
                onClick={handleDownloadPDF} 
                disabled={isDownloadingPdf}
                className="font-semibold text-xs"
              >
                {isDownloadingPdf ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="w-3.5 h-3.5 mr-1.5" /> Download PDF</>
                )}
              </Button>
            </div>
          </div>

          {/* Printable Statement Container (A4 Format) */}
          <div className="p-8 bg-white text-slate-900 font-sans" id="printable-account-statement">
            {/* Header: Company Details & Logo */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
              <div className="space-y-1 max-w-md">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">{compName}</h1>
                <p className="text-xs text-slate-600 leading-relaxed">{compAddress}</p>
                <p className="text-xs text-slate-700 font-medium">
                  Phone: <span className="font-bold">{compPhone}</span> | Email: {compEmail}
                </p>
                <p className="text-xs font-bold text-slate-900">GSTIN: {compGstin}</p>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-sm font-black tracking-wider uppercase">
                  STATEMENT OF ACCOUNT
                </div>
                <p className="text-xs text-slate-500 pt-1">
                  Statement Date: <span className="font-semibold text-slate-800">{format(new Date(), 'dd/MM/yyyy')}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Period: <span className="font-semibold text-slate-800">{periodLabel}</span>
                </p>
              </div>
            </div>

            {/* Party Profile Box */}
            <div className="my-5 p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-4 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Statement For (Party):</p>
                <p className="text-base font-bold text-slate-950 mt-0.5">{party?.name}</p>
                {party?.phone && <p className="text-slate-600 mt-0.5">Phone: <strong>{party.phone}</strong></p>}
                {party?.address && <p className="text-slate-600 mt-0.5 max-w-sm">{party.address}</p>}
                <p className="text-slate-600 mt-0.5">GSTIN: <strong>{party?.gstNumber || 'Unregistered / NA'}</strong></p>
              </div>

              <div className="bg-white p-3 rounded border border-slate-200 min-w-[220px] text-right space-y-1">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Opening Balance:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(openingBalance)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Total Billed (Dr):</span>
                  <span className="font-mono font-bold text-red-600">{formatCurrency(totalDebit)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Total Paid (Cr):</span>
                  <span className="font-mono font-bold text-emerald-600">{formatCurrency(totalCredit)}</span>
                </div>
                <div className="flex justify-between gap-4 pt-1 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-900">Net Due Balance:</span>
                  <span className="font-mono font-black text-slate-950">{formatCurrency(Math.abs(closingBalance))}</span>
                </div>
                <p className="text-[10px] font-semibold text-amber-700">
                  {closingBalance > 0 ? (isCustomer ? '(You Get / लेना है)' : '(You Give / देना है)') : '(Settled / चुकता)'}
                </p>
              </div>
            </div>

            {/* Statement Transaction Table */}
            <div className="border border-slate-300 rounded overflow-hidden mb-6 text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="py-2 px-2 text-left w-10">#</th>
                    <th className="py-2 px-2 text-left w-24">Date</th>
                    <th className="py-2 px-2 text-left w-24">Voucher #</th>
                    <th className="py-2 px-3 text-left">Particulars</th>
                    <th className="py-2 px-2 text-right w-24">Debit (₹)</th>
                    <th className="py-2 px-2 text-right w-24">Credit (₹)</th>
                    <th className="py-2 px-3 text-right w-28">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-normal">
                  {/* Opening Balance Row */}
                  {(openingBalance !== 0 || startDate) && (
                    <tr className="bg-slate-50/70 font-medium">
                      <td className="py-2 px-2 text-slate-400">1</td>
                      <td className="py-2 px-2 font-mono text-slate-600">{startDate ? format(new Date(startDate), 'dd/MM/yyyy') : 'Prior'}</td>
                      <td className="py-2 px-2 font-mono text-slate-500">OP-BAL</td>
                      <td className="py-2 px-3 font-semibold text-slate-700">Opening Balance b/f (पिछला बकाया)</td>
                      <td className="py-2 px-2 text-right font-mono text-red-600 font-semibold">{openingBalance > 0 ? openingBalance.toFixed(2) : '-'}</td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-600 font-semibold">{openingBalance < 0 ? Math.abs(openingBalance).toFixed(2) : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{openingBalance.toFixed(2)}</td>
                    </tr>
                  )}

                  {filteredLedger.map((entry: any, idx: number) => {
                    const isPayment = entry.type === 'PAYMENT';
                    const dr = !isPayment ? (entry.grandTotal || 0) : 0;
                    const cr = isPayment ? (entry.amount || 0) : 0;
                    const rowNumber = (openingBalance !== 0 || startDate) ? idx + 2 : idx + 1;

                    let description = '';
                    if (isPayment) {
                      const mode = entry.paymentMode === 'SCRAP' ? 'Battery Scrap (कबाड़)' : (entry.paymentMode || 'Cash');
                      description = `Payment via ${mode}${entry.notes ? ` • ${entry.notes}` : ''}`;
                    } else {
                      const items = entry.items?.map((it: any) => `${it.productId?.name || 'Product'} (x${it.quantity || 1})`).join(', ');
                      description = items ? `Items: ${items}` : (isCustomer ? 'Sales Invoice' : 'Purchase Bill');
                    }

                    return (
                      <tr key={entry._id || entry.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2 text-slate-400">{rowNumber}</td>
                        <td className="py-2 px-2 font-mono text-slate-700">{format(new Date(entry.date), 'dd/MM/yyyy')}</td>
                        <td className="py-2 px-2 font-mono font-medium text-slate-800">{entry.invoiceNumber || entry.referenceId || '-'}</td>
                        <td className="py-2 px-3 text-slate-700 leading-tight">
                          <span className="font-semibold block">{entry.type === 'PAYMENT' ? (entry.paymentType === 'MONEY_IN' ? 'Payment In' : 'Payment Out') : (isCustomer ? 'Sales Invoice' : 'Purchase Bill')}</span>
                          <span className="text-[11px] text-slate-500">{description}</span>
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-red-600 font-medium">{dr > 0 ? dr.toFixed(2) : '-'}</td>
                        <td className="py-2 px-2 text-right font-mono text-emerald-600 font-medium">{cr > 0 ? cr.toFixed(2) : '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{entry.runningBalance?.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                    <td colSpan={4} className="py-2.5 px-3 uppercase text-right">Statement Period Totals:</td>
                    <td className="py-2.5 px-2 text-right font-mono text-red-600 font-bold">₹{totalDebit.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-emerald-600 font-bold">₹{totalCredit.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-950 text-sm">₹{closingBalance.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom Footer: Bank/UPI Payment Details & Authorized Signature */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-xs">
              {/* Bank & UPI QR Payment Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Payment / Bank Transfer Info:</p>
                <p className="text-slate-700">Bank: <strong className="text-slate-900">{compBankName}</strong></p>
                <p className="text-slate-700">A/C No: <strong className="text-slate-900 font-mono">{compAccountNo}</strong></p>
                <p className="text-slate-700">IFSC Code: <strong className="text-slate-900 font-mono">{compIfsc}</strong></p>
                {compUpi && <p className="text-slate-700">UPI ID: <strong className="text-blue-700 font-mono">{compUpi}</strong></p>}
                <p className="text-[10px] text-slate-500 pt-1">
                  *Please mention voucher/invoice number in your payment remarks.
                </p>
              </div>

              {/* Authorized Signatory */}
              <div className="flex flex-col justify-between items-end text-right">
                <div>
                  <p className="font-bold text-slate-900 text-xs">For {compName.toUpperCase()}</p>
                </div>
                <div className="pt-12">
                  <div className="w-48 border-t border-slate-400 text-center">
                    <p className="text-[11px] font-semibold text-slate-700 mt-1">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment(s)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4 pt-4">
            {bulkPayments.map((p, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end border-b pb-4 mb-2">
                <div className="space-y-2 flex-1 w-full">
                  <label className="text-sm font-medium">Amount</label>
                  <Input 
                    type="number" 
                    required 
                    min="1" 
                    value={p.amount} 
                    onChange={(e) => {
                      const newB = [...bulkPayments];
                      newB[idx].amount = e.target.value;
                      setBulkPayments(newB);
                    }} 
                    placeholder="Amount"
                  />
                </div>
                <div className="space-y-2 flex-1 w-full">
                  <label className="text-sm font-medium">Mode</label>
                  <Select value={p.paymentMode} onValueChange={(val) => {
                    const newB = [...bulkPayments];
                    newB[idx].paymentMode = val;
                    setBulkPayments(newB);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="BANK">Bank Transfer</SelectItem>
                      <SelectItem value="SCRAP">Battery Scrap (कबाड़)</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-1 w-full">
                  <label className="text-sm font-medium">Ref No (Opt)</label>
                  <Input 
                    value={p.referenceId} 
                    onChange={(e) => {
                      const newB = [...bulkPayments];
                      newB[idx].referenceId = e.target.value;
                      setBulkPayments(newB);
                    }} 
                    placeholder="Ref No"
                  />
                </div>
                {bulkPayments.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="text-red-500 mb-0.5" onClick={() => setBulkPayments(bulkPayments.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => setBulkPayments([...bulkPayments, { amount: '', paymentMode: 'CASH', referenceId: '', notes: '' }])}>
              <Plus className="h-4 w-4 mr-2" /> Add Another Payment
            </Button>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)} disabled={isSubmittingBulk}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingBulk}>
                {isSubmittingBulk ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save All Payments'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Payment Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePayment} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input 
                type="number" 
                required 
                min="1" 
                value={editAmount} 
                onChange={(e) => setEditAmount(e.target.value)} 
                placeholder="Enter correct amount"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Mode</label>
              <Select value={editPaymentMode} onValueChange={setEditPaymentMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="BANK">Bank Transfer</SelectItem>
                  <SelectItem value="SCRAP">Battery Scrap (कबाड़)</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSubmittingEdit}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingEdit}>
                {isSubmittingEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Update Payment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
