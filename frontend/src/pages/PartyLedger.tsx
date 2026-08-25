import toast from 'react-hot-toast';
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import api from '../services/api';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, IndianRupee, ArrowLeft, MessageCircle, Pencil, Trash2, Phone, Download, Plus, Loader2 } from 'lucide-react';
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

  const handleExportPDF = () => {
    const element = document.getElementById('ledger-table-container');
    if (!element) return;
    const opt = {
      margin: 0.5,
      filename: `${party?.name}_Ledger.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt as any).from(element).save();
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
          <div className="flex flex-wrap sm:flex-row justify-start sm:justify-end gap-2 mt-4 w-full">
            {party?.phone && (
              <Button 
                variant="outline" 
                onClick={handleCall}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                title={`Call ${party.phone}`}
              >
                <Phone className="w-4 h-4 mr-2 text-blue-600" />
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

      <div id="ledger-table-container" className="rounded-md border bg-white dark:bg-slate-950 shadow-sm overflow-x-auto">
        <Table className="min-w-[650px]">
          <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
            <TableRow className="border-slate-200 dark:border-slate-800">
              <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Date</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Ref No.</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">Bill Amount</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">Paid Amount</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-700 dark:text-slate-300">Balance</TableHead>
              <TableHead className="text-center w-24 text-xs font-bold text-slate-700 dark:text-slate-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">No transactions found.</TableCell>
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
                  description = `Payment ${entry.paymentType === 'MONEY_IN' ? 'Received' : 'Sent'} (${entry.paymentMode})`;
                } else {
                  const itemNames = entry.items?.map((item: any) => {
                    const sn = item.serialNumbers?.length ? ` [SN: ${item.serialNumbers.join(', ')}]` : '';
                    return `${item.productId?.name || 'Product'}${sn}`;
                  }).join(', ');
                  description = `Invoice: ${itemNames}`;
                }

                return (
                  <TableRow key={entry._id || entry.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(entry.date), 'dd MMM yyyy, hh:mm a')}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 font-medium">
                          {isPayment ? <IndianRupee className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-slate-500" />}
                          {isPayment ? 'Payment' : (isCustomer ? 'Sale' : 'Purchase')}
                        </div>
                        <span className="text-sm text-slate-500 mt-1 max-w-md truncate" title={description}>
                          {description}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{entry.invoiceNumber || entry.referenceId || '-'}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {billAmount > 0 ? formatCurrency(billAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {paidAmount > 0 ? formatCurrency(paidAmount) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(entry.runningBalance)}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {isPayment ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit Payment"
                            className="h-8 w-8 text-blue-600 hover:text-blue-800"
                            onClick={() => handleOpenEditPayment(entry)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete Payment"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleDeletePayment(entry._id || entry.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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

