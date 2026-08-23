import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import api from '../services/api';
import { format } from 'date-fns';

export default function SaleReturns() {
  const [returns, setReturns] = useState<any[]>([]);
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  
  // Process Return Form
  const [saleId, setSaleId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReturns = async () => {
    try {
      const res = await api.get('/returns');
      setReturns(res.data.data || res.data);
    } catch (error) {
      console.error('Error fetching returns', error);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleProcessReturn = async () => {
    if (!saleId || !serialNumber || !refundAmount) {
      toast.error('Please fill all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/returns', {
        saleId,
        serialNumber,
        refundAmount: Number(refundAmount),
        notes
      });
      setIsProcessOpen(false);
      fetchReturns();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error processing return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Sale Returns</h2>
        <Button onClick={() => setIsProcessOpen(true)}>Process Return</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Return No</TableHead>
                <TableHead>Original Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Refund Amount</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map(r => (
                <TableRow key={r._id || r.id}>
                  <TableCell>{format(new Date(r.createdAt), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="font-medium">{r.returnNumber}</TableCell>
                  <TableCell>{r.originalSale?.invoiceNumber || r.originalSaleId}</TableCell>
                  <TableCell>{r.customer?.name || r.customerId}</TableCell>
                  <TableCell className="font-bold text-red-600">₹{r.refundAmount}</TableCell>
                  <TableCell>{r.notes}</TableCell>
                </TableRow>
              ))}
              {returns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    No returns found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isProcessOpen} onOpenChange={setIsProcessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Item Return (Serialized)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sale / Invoice ID</label>
              <Input placeholder="Enter Sale ID" value={saleId} onChange={e => setSaleId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Serial Number to Return</label>
              <Input placeholder="Scan or Type Serial No" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Refund Amount (₹)</label>
              <Input type="number" min="0" placeholder="0.00" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes / Reason</label>
              <Input placeholder="Defective, etc." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcessOpen(false)}>Cancel</Button>
            <Button onClick={handleProcessReturn} disabled={isSubmitting}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

