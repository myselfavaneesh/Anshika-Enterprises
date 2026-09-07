import toast from 'react-hot-toast';
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import api from '../services/api';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, IndianRupee, ArrowLeft, MessageCircle, Pencil, Trash2, Phone, Download, Plus, Loader2, ArrowDownLeft, ArrowUpRight, ShoppingBag, Receipt } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

export default function PartyLedger() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const isCustomer = type === 'customers';

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

  // Fetch Ledger Data
  const { data, mutate } = useSWR(
    id && type ? `/${type}/${id}/ledger` : null,
    fetcher
  );

  const party = data ? (isCustomer ? data.customer : data.supplier) : null;
  const ledger = data ? data.ledger : [];

  const totalBilled = ledger.reduce((sum: number, entry: any) => sum + (entry.type !== 'PAYMENT' ? (entry.grandTotal || 0) : 0), 0);
  const totalPaid = ledger.reduce((sum: number, entry: any) => sum + (entry.type === 'PAYMENT' ? (entry.amount || 0) : 0), 0);

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

  const handleExportPDF = async () => {
    const element = document.getElementById('ledger-export-content');
    if (!element) return;

    // Temporarily disable dark mode for clean PDF
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
    }

    // Temporarily remove overflow-x-auto to prevent clipping
    const tableContainer = document.getElementById('ledger-table-container');
    if (tableContainer) {
      tableContainer.classList.remove('overflow-x-auto');
    }

    const opt = {
      margin: 0.5,
      filename: `${party?.name}_Ledger.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt as any).from(element).save();
    } finally {
      // Restore classes
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
      if (tableContainer) {
        tableContainer.classList.add('overflow-x-auto');
      }
    }
  };

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

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment record? The outstanding balance will be automatically adjusted.')) {
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

  const handleCall = () => {
    if (!party?.phone) {
      toast.error('No phone number found for this party.');
      return;
    }
    const cleanPhone = party.phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleSendReminder = () => {
    if (!party?.phone) {
      toast.error('No phone number found for this customer.');
      return;
    }
    const amount = formatCurrency(Math.abs(party.outstandingBalance));
    const message = `Hello ${party.name},\n\nThis is a gentle reminder that you have an outstanding balance of ${amount}.\n\nPlease arrange the payment at your earliest convenience. Thank you!`;
    const encodedMessage = encodeURIComponent(message);
    const phone = party.phone.replace(/\D/g, '');
    window.open(`https://wa.me/91${phone}?text=${encodedMessage}`, '_blank');
  };

  if (!data) {
    return <div className="p-8 text-center text-slate-500">Loading ledger...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/parties')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Ledger Statement</h2>
      </div>

      <div id="ledger-export-content" className="space-y-6">
        <div className="bg-white dark:bg-slate-950 p-6 rounded-md border shadow-sm flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h3 className="text-2xl font-semibold">{party?.name}</h3>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            {party?.phone ? (
              <a
                href={`tel:${party.phone.replace(/[^0-9+]/g, '')}`}
                className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-medium"
                title="Click to direct call"
              >
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                {party.phone}
              </a>
            ) : (
              'No Phone'
            )}
            <span>•</span>
            <span>{party?.address || 'No Address'}</span>
          </p>
          <p className="text-sm text-slate-500 mt-1">GSTIN: {party?.gstNumber || 'N/A'}</p>
        </div>
        <div className="w-full sm:w-auto text-left sm:text-right">
          <p className="text-sm font-medium text-slate-500">Total Outstanding</p>
          <p className={`text-2xl font-bold ${
            isCustomer 
              ? (party?.outstandingBalance > 0 ? 'text-green-600' : party?.outstandingBalance < 0 ? 'text-red-600' : '')
              : (party?.outstandingBalance > 0 ? 'text-red-600' : party?.outstandingBalance < 0 ? 'text-green-600' : '')
          }`}>
            {formatCurrency(Math.abs(party?.outstandingBalance || 0))}
            <span className="text-sm ml-2 font-normal">
              {party?.outstandingBalance !== 0 && (
                isCustomer 
                  ? (party?.outstandingBalance > 0 ? '(You Get)' : '(You Give)')
                  : (party?.outstandingBalance > 0 ? '(You Give)' : '(You Get)')
              )}
            </span>
          </p>
          <div className="flex flex-wrap sm:flex-row justify-start sm:justify-end gap-2 mt-4 w-full" data-html2canvas-ignore="true">
            {party?.phone && (
              <Button 
                variant="outline" 
                onClick={handleCall}
                className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300"
                title={`Call ${party.phone}`}
              >
                <Phone className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                Call
              </Button>
            )}
            {isCustomer && (party?.outstandingBalance || 0) > 0 && (
              <Button variant="outline" onClick={handleSendReminder}>
                <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                Send Reminder
              </Button>
            )}
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={() => setIsPaymentModalOpen(true)} className="w-full sm:w-auto">
              <IndianRupee className="w-4 h-4 mr-2" />
              Record Payment(s)
            </Button>
          </div>
        </div>
      </div>

        {/* Compact Table Toolbar & Ticker */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Transactions ({ledger.length})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/60 dark:border-red-900/40">
              Total Dr: <strong>{formatCurrency(totalBilled)}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
              Total Cr: <strong>{formatCurrency(totalPaid)}</strong>
            </span>
          </div>
        </div>

        <div id="ledger-table-container" className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800">
              <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-transparent">
                <TableHead className="h-9 py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-36">Date</TableHead>
                <TableHead className="h-9 py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Transaction Details</TableHead>
                <TableHead className="h-9 py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-32">Voucher / Ref</TableHead>
                <TableHead className="h-9 py-2 px-3 text-right text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 w-32">Debit (Dr)</TableHead>
                <TableHead className="h-9 py-2 px-3 text-right text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 w-32">Credit (Cr)</TableHead>
                <TableHead className="h-9 py-2 px-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 w-36">Net Balance</TableHead>
                <TableHead className="h-9 py-2 px-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-20" data-html2canvas-ignore="true">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    No transactions recorded for this account yet.
                  </TableCell>
                </TableRow>
              ) : (
                ledger.map((entry: any) => {
                  const isPayment = entry.type === 'PAYMENT';
                  let billAmount = 0;
                  let paidAmount = 0;

                  if (!isPayment) {
                    billAmount = entry.grandTotal || 0;
                  } else {
                    paidAmount = entry.amount || 0;
                  }

                  // Format description
                  let description = '';
                  if (isPayment) {
                    description = `Payment ${entry.paymentType === 'MONEY_IN' ? 'Received' : 'Disbursed'} via ${entry.paymentMode || 'Cash'}${entry.notes ? ` • ${entry.notes}` : ''}`;
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
                      className="group border-b border-slate-100 dark:border-slate-800/70 hover:bg-slate-50/90 dark:hover:bg-slate-900/60 transition-colors duration-150"
                    >
                      {/* Date & Time */}
                      <TableCell className="py-2 px-3 whitespace-nowrap">
                        <span className="font-medium text-xs text-slate-800 dark:text-slate-200 block">
                          {format(new Date(entry.date), 'dd MMM yyyy')}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 block">
                          {format(new Date(entry.date), 'hh:mm a')}
                        </span>
                      </TableCell>

                      {/* Type & Description */}
                      <TableCell className="py-2 px-3">
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
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                {entry.paymentMode}
                              </span>
                            )}
                          </div>
                          <span 
                            className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-sm block" 
                            title={description}
                          >
                            {description}
                          </span>
                        </div>
                      </TableCell>

                      {/* Ref / Voucher # */}
                      <TableCell className="py-2 px-3 whitespace-nowrap">
                        {entry.invoiceNumber || entry.referenceId ? (
                          <span className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/70 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/50 inline-block">
                            {entry.invoiceNumber || entry.referenceId}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs font-mono">-</span>
                        )}
                      </TableCell>

                      {/* Debit (Dr) */}
                      <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-xs font-semibold text-red-600 dark:text-red-400">
                        {billAmount > 0 ? formatCurrency(billAmount) : <span className="text-slate-300 dark:text-slate-600">-</span>}
                      </TableCell>

                      {/* Credit (Cr) */}
                      <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {paidAmount > 0 ? formatCurrency(paidAmount) : <span className="text-slate-300 dark:text-slate-600">-</span>}
                      </TableCell>

                      {/* Net Balance */}
                      <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-xs font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(entry.runningBalance)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2 px-3 text-center whitespace-nowrap" data-html2canvas-ignore="true">
                        {isPayment ? (
                          <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity duration-150">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit Payment"
                              className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-transform duration-150 active:scale-90 hover:scale-105"
                              onClick={() => handleOpenEditPayment(entry)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Payment"
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-transform duration-150 active:scale-90 hover:scale-105"
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
            {ledger.length > 0 && (
              <TableFooter className="bg-slate-50/90 dark:bg-slate-900/90 border-t-2 border-slate-200 dark:border-slate-800 font-medium">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="py-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Total Statement Summary ({ledger.length} entries)
                  </TableCell>
                  <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-xs font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(totalBilled)}
                  </TableCell>
                  <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalPaid)}
                  </TableCell>
                  <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-xs font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(party?.outstandingBalance || 0)}
                  </TableCell>
                  <TableCell className="py-2 px-3" data-html2canvas-ignore="true" />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>

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
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
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

