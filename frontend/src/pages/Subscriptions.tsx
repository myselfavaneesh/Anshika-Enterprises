import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import api from '../services/api';
import { format } from 'date-fns';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Form State
  const [customerId, setCustomerId] = useState('');
  const [planName, setPlanName] = useState('');
  const [billingInterval, setBillingInterval] = useState('MONTHLY');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [subRes, custRes] = await Promise.all([
        api.get('/subscriptions'),
        api.get('/customers')
      ]);
      setSubscriptions(subRes.data.data || subRes.data);
      setCustomers(custRes.data.data || custRes.data);
    } catch (error) {
      console.error('Error fetching subscriptions', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!customerId || !planName || !amount || !startDate) {
      alert('Please fill all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/subscriptions', {
        customerId,
        planName,
        billingInterval,
        amount: Number(amount),
        startDate
      });
      setIsOpen(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error creating subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    try {
      await api.post(`/subscriptions/${id}/cancel`);
      fetchData();
    } catch (error) {
      console.error('Error cancelling subscription', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Recurring Sales / Subscriptions</h2>
        <Button onClick={() => setIsOpen(true)}>Create Subscription</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Next Billing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map(s => (
                <TableRow key={s._id || s.id}>
                  <TableCell className="font-medium">{s.customer?.name}</TableCell>
                  <TableCell>{s.planName}</TableCell>
                  <TableCell>{s.billingInterval}</TableCell>
                  <TableCell className="font-bold">₹{s.amount}</TableCell>
                  <TableCell>{format(new Date(s.startDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{s.nextBillingDate ? format(new Date(s.nextBillingDate), 'dd MMM yyyy') : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {s.status === 'ACTIVE' && (
                      <Button variant="destructive" size="sm" onClick={() => handleCancel(s._id || s.id)}>
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {subscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                    No subscriptions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <select 
                className="w-full h-10 px-3 rounded-md border"
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
              >
                <option value="">Select Customer...</option>
                {customers.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Plan Name (e.g. AMC, SaaS Fee)</label>
              <Input placeholder="Enter Plan Name" value={planName} onChange={e => setPlanName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Billing Interval</label>
              <select 
                className="w-full h-10 px-3 rounded-md border"
                value={billingInterval}
                onChange={e => setBillingInterval(e.target.value)}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount per Billing Cycle (₹)</label>
              <Input type="number" min="0" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

