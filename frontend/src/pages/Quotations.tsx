import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Download } from 'lucide-react';

const Quotations = () => {
  const [quotations, setQuotations] = useState<any[]>([]);

  const fetchQuotations = async () => {
    try {
      const response = await api.get('/quotations');
      setQuotations(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching quotations', error);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handlePrintQuotation = (quotationId: string) => {
    window.open(`/quotations/${quotationId}/print`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Quotations</h2>
        <Button asChild>
          <Link to="/quotations/new">
            <Plus className="mr-2 h-4 w-4" /> New Quotation
          </Link>
        </Button>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quotation #</TableHead>
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
            {quotations.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center">No quotations found.</TableCell></TableRow>
            ) : (
              quotations.map((quotation) => (
                <TableRow key={quotation._id}>
                  <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                  <TableCell>{new Date(quotation.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{quotation.customerId?.name || 'Unknown'}</TableCell>
                  <TableCell className="text-right">₹{quotation.subtotal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{quotation.discount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{quotation.taxAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-primary">₹{quotation.grandTotal.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title="Print Quotation" onClick={() => handlePrintQuotation(quotation._id)}>
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

export default Quotations;
