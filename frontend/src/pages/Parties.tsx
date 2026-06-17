import React, { useState } from 'react';
import useSWR from 'swr';
import api from '../services/api';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, IndianRupee } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

export default function Parties() {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [selectedParty, setSelectedParty] = useState<any | null>(null);
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');

  // Fetch lists
  const { data: customers = [], mutate: mutateCustomers } = useSWR('/customers', fetcher);
  const { data: suppliers = [], mutate: mutateSuppliers } = useSWR('/suppliers', fetcher); // Note: /suppliers API must exist

  // Fetch Ledger for selected party
  const { data: ledger = [], mutate: mutateLedger } = useSWR(
    selectedParty ? `/payments/ledger?entityId=${selectedParty._id}&entityType=${activeTab === 'customers' ? 'CUSTOMER' : 'SUPPLIER'}` : null,
    fetcher
  );

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;

    try {
      await api.post('/payments', {
        entityType: activeTab === 'customers' ? 'CUSTOMER' : 'SUPPLIER',
        entityId: selectedParty._id,
        // If customer, we are receiving money (MONEY_IN). If supplier, we are paying (MONEY_OUT)
        type: activeTab === 'customers' ? 'MONEY_IN' : 'MONEY_OUT',
        amount: Number(paymentAmount),
        paymentMode,
      });

      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      
      // Refresh Data
      mutateLedger();
      if (activeTab === 'customers') mutateCustomers();
      else mutateSuppliers();
      
      // Update selected party balance locally for immediate UI feedback
      setSelectedParty({
        ...selectedParty,
        outstandingBalance: selectedParty.outstandingBalance - Number(paymentAmount)
      });
      
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    }
  };

  const renderTable = (data: any[], type: 'customers' | 'suppliers') => {
    return (
      <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>GST Number</TableHead>
              <TableHead className="text-right">Outstanding Balance</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No {type} found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((party) => {
                const bal = party.outstandingBalance || 0;
                let balColor = "text-slate-700 dark:text-slate-300";
                let balLabel = "";
                
                if (type === 'customers') {
                  if (bal > 0) { balColor = "text-green-600 font-medium"; balLabel = "(You Get)"; }
                  if (bal < 0) { balColor = "text-red-600 font-medium"; balLabel = "(You Give)"; }
                } else {
                  if (bal > 0) { balColor = "text-red-600 font-medium"; balLabel = "(You Give)"; }
                  if (bal < 0) { balColor = "text-green-600 font-medium"; balLabel = "(You Get)"; }
                }

                return (
                  <TableRow key={party._id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedParty(party)}>
                    <TableCell className="font-medium">{party.name}</TableCell>
                    <TableCell>{party.phone || '-'}</TableCell>
                    <TableCell>{party.gstNumber || '-'}</TableCell>
                    <TableCell className={`text-right ${balColor}`}>
                      {formatCurrency(Math.abs(bal))} <span className="text-xs opacity-80">{bal !== 0 && balLabel}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedParty(party); }}>
                        View Statement
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Parties (Khata)</h2>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
        <TabsContent value="customers">
          {renderTable(customers, 'customers')}
        </TabsContent>
        <TabsContent value="suppliers">
          {renderTable(suppliers, 'suppliers')}
        </TabsContent>
      </Tabs>

      {/* Party Statement Dialog */}
      <Dialog open={!!selectedParty && !isPaymentModalOpen} onOpenChange={(open) => !open && setSelectedParty(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex justify-between items-start pr-6">
              <div>
                <DialogTitle className="text-2xl">{selectedParty?.name}</DialogTitle>
                <p className="text-sm text-slate-500 mt-1">{selectedParty?.phone} • {selectedParty?.address}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-500">Total Outstanding</p>
                <p className={`text-2xl font-bold ${
                  activeTab === 'customers' 
                    ? (selectedParty?.outstandingBalance > 0 ? 'text-green-600' : selectedParty?.outstandingBalance < 0 ? 'text-red-600' : '')
                    : (selectedParty?.outstandingBalance > 0 ? 'text-red-600' : selectedParty?.outstandingBalance < 0 ? 'text-green-600' : '')
                }`}>
                  {formatCurrency(Math.abs(selectedParty?.outstandingBalance || 0))}
                  <span className="text-sm ml-2 font-normal">
                    {selectedParty?.outstandingBalance !== 0 && (
                      activeTab === 'customers' 
                        ? (selectedParty?.outstandingBalance > 0 ? '(You Get)' : '(You Give)')
                        : (selectedParty?.outstandingBalance > 0 ? '(You Give)' : '(You Get)')
                    )}
                  </span>
                </p>
                <Button className="mt-3" onClick={() => setIsPaymentModalOpen(true)}>
                  <IndianRupee className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto mt-4 border rounded-md">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Ref No.</TableHead>
                  <TableHead className="text-right">Debit (Dr)</TableHead>
                  <TableHead className="text-right">Credit (Cr)</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">No transactions found.</TableCell>
                  </TableRow>
                ) : (
                  ledger.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(entry.date), 'dd MMM yyyy, hh:mm a')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {entry.type === 'PAYMENT' ? <IndianRupee className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-slate-500" />}
                          {entry.description}
                        </div>
                      </TableCell>
                      <TableCell>{entry.reference}</TableCell>
                      <TableCell className="text-right text-red-600">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</TableCell>
                      <TableCell className="text-right text-green-600">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(entry.balance)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

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
