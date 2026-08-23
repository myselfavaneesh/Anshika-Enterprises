import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ClipboardList, Plus } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function InventoryAudits() {
  const [audits, setAudits] = useState<any[]>([]);

  const fetchAudits = async () => {
    try {
      const res = await api.get('/inventory-audits');
      setAudits(res.data);
    } catch (err) {
      console.error('Failed to fetch audits', err);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Inventory Audits</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Audit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="w-5 h-5 mr-2" />
            Audit History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Conducted By</TableHead>
                <TableHead>Items Audited</TableHead>
                <TableHead>Discrepancies</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No audits performed yet.
                  </TableCell>
                </TableRow>
              )}
              {audits.map(audit => (
                <TableRow key={audit.id}>
                  <TableCell>{format(new Date(audit.auditDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{audit.warehouse?.name}</TableCell>
                  <TableCell>{audit.conductedBy || 'Unknown'}</TableCell>
                  <TableCell>{audit.items.length}</TableCell>
                  <TableCell className="text-red-500 font-medium">
                    {audit.items.filter((i: any) => i.discrepancy !== 0).length}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-semibold">
                      {audit.status}
                    </span>
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
