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
import { FileText, IndianRupee, ArrowLeft, MessageCircle } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

export default function PartyLedger() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const isCustomer = type === 'customers';

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');

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

    try {
      await api.post('/payments', {
        entityType: isCustomer ? 'CUSTOMER' : 'SUPPLIER',
        entityId: party._id,
        // If customer, we are receiving money (MONEY_IN). If supplier, we are paying (MONEY_OUT)
        type: isCustomer ? 'MONEY_IN' : 'MONEY_OUT',
        amount: Number(paymentAmount),
        paymentMode,
      });

      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      
      // Refresh Data
      mutate();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    }
  };

  const handleSendReminder = () => {
    if (!party?.phone) {
      alert('No phone number found for this customer.');
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
          <p className="text-sm text-slate-500 mt-1">{party?.phone || 'No Phone'} • {party?.address || 'No Address'}</p>
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
          <div className="flex flex-col sm:flex-row justify-start sm:justify-end gap-2 mt-4 w-full">
            {isCustomer && (party?.outstandingBalance || 0) > 0 && (
              <Button variant="outline" onClick={handleSendReminder}>
                <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                Send Reminder
              </Button>
            )}
            <Button onClick={() => setIsPaymentModalOpen(true)} className="w-full sm:w-auto">
              <IndianRupee className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Ref No.</TableHead>
              <TableHead className="text-right">Bill Amount</TableHead>
              <TableHead className="text-right">Paid Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">No transactions found.</TableCell>
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
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input 
                type="number" 
                required 
                min="1" 
                value={paymentAmount} 
                onChange={(e) => setPaymentAmount(e.target.value)} 
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Mode</label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
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
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
