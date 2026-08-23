import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, ShoppingCart, Eye } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  const fetchPOs = async () => {
    try {
      const res = await api.get('/purchase-orders');
      setPurchaseOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch POs', err);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/purchase-orders/${id}/status`, { status });
      fetchPOs();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create PO
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Recent Purchase Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Expected By</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No purchase orders found.
                  </TableCell>
                </TableRow>
              )}
              {purchaseOrders.map(po => (
                <TableRow key={po.id}>
                  <TableCell className="font-semibold">{po.poNumber}</TableCell>
                  <TableCell>{format(new Date(po.createdAt), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{po.supplier?.name}</TableCell>
                  <TableCell>{po.expectedDate ? format(new Date(po.expectedDate), 'dd MMM yyyy') : '-'}</TableCell>
                  <TableCell className="text-right font-bold">₹{po.grandTotal.toFixed(2)}</TableCell>
                  <TableCell>
                    <select 
                      className="border rounded text-xs px-2 py-1"
                      value={po.status}
                      onChange={(e) => updateStatus(po.id, e.target.value)}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SENT">Sent</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4 text-slate-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
