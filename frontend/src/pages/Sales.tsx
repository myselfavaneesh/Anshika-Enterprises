import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Download } from 'lucide-react';

const Sales = () => {
  const [sales, setSales] = useState<any[]>([]);

  const fetchSales = async () => {
    try {
      const response = await api.get('/sales');
      setSales(response.data);
    } catch (error) {
      console.error('Error fetching sales', error);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleDownloadInvoice = (saleId: string) => {
    const token = localStorage.getItem('token');
    window.open(`http://localhost:5000/api/sales/${saleId}/invoice?token=${token}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Sales History</h2>
        <Button asChild>
          <Link to="/sales/new">
            <Plus className="mr-2 h-4 w-4" /> New Sale
          </Link>
        </Button>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Grand Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center">No sales found.</TableCell></TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale._id}>
                  <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                  <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{sale.customerId?.name || 'Unknown'}</TableCell>
                  <TableCell className="text-right">₹{sale.subtotal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{sale.discount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{sale.taxAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-primary">₹{sale.grandTotal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title="Download Invoice" onClick={() => handleDownloadInvoice(sale._id)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Sales;
