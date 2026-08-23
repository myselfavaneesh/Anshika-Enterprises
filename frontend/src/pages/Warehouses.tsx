import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Building, ArrowRightLeft, Edit, Trash2 } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', location: '', isActive: true });

  const fetchData = async () => {
    try {
      const [whRes, trfRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/warehouses/transfers')
      ]);
      setWarehouses(whRes.data);
      setTransfers(trfRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await api.put(`/warehouses/${editingWarehouse.id}`, formData);
      } else {
        await api.post('/warehouses', formData);
      }
      setIsWarehouseModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save warehouse');
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!window.confirm('Delete this warehouse?')) return;
    try {
      await api.delete(`/warehouses/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete warehouse');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Warehouse Management</h1>
        <Button onClick={() => {
          setEditingWarehouse(null);
          setFormData({ name: '', location: '', isActive: true });
          setIsWarehouseModalOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Warehouses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Stock Count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">
                      {w.name} {!w.isActive && <span className="text-xs text-red-500 ml-2">(Inactive)</span>}
                    </TableCell>
                    <TableCell>{w.location || '-'}</TableCell>
                    <TableCell>{w._count?.productUnits || 0} items</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingWarehouse(w);
                        setFormData({ name: w.name, location: w.location || '', isActive: w.isActive });
                        setIsWarehouseModalOpen(true);
                      }}>
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteWarehouse(w.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowRightLeft className="w-5 h-5 mr-2" />
              Recent Transfers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>TRF #</TableHead>
                  <TableHead>From ➔ To</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.slice(0, 10).map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{format(new Date(t.createdAt), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-xs">{t.transferNumber}</TableCell>
                    <TableCell className="text-xs">
                      {t.fromWarehouse?.name} ➔ {t.toWarehouse?.name}
                    </TableCell>
                    <TableCell className="text-right">{t._count?.items || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isWarehouseModalOpen} onOpenChange={setIsWarehouseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveWarehouse} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
              <label className="text-sm">Is Active</label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsWarehouseModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
