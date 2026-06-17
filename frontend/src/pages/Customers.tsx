import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit, Search, X } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', gstNumber: '', state: '', stateCode: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.address && customer.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setIsOpen(false);
      fetchCustomers();
      resetForm();
    } catch (error) {
      console.error('Error saving customer', error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', phone: '', address: '', gstNumber: '', state: '', stateCode: '' });
  };

  const handleEdit = (customer: any) => {
    setEditingId(customer._id);
    setFormData({ 
      name: customer.name, 
      phone: customer.phone || '', 
      address: customer.address || '',
      gstNumber: customer.gstNumber || '',
      state: customer.state || '',
      stateCode: customer.stateCode || ''
    });
    setIsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">GST Number</label>
                <Input value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">State Name</label>
                  <Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} placeholder="e.g. Uttar Pradesh" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">State Code</label>
                  <Input value={formData.stateCode} onChange={e => setFormData({...formData, stateCode: e.target.value})} placeholder="e.g. 09" />
                </div>
              </div>
              <Button type="submit" className="w-full">{editingId ? 'Update' : 'Save'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-2 max-w-sm bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-1.5 shadow-sm">
        <Search className="h-4 w-4 text-slate-400" />
        <input 
          type="text"
          placeholder="Search customers..."
          className="flex-1 bg-transparent border-0 outline-none text-sm p-0.5 placeholder-slate-400 focus:ring-0 focus:ring-offset-0"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>GST</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center">No customers found.</TableCell></TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer._id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.phone || 'N/A'}</TableCell>
                  <TableCell>{customer.address || 'N/A'}</TableCell>
                  <TableCell>{customer.gstNumber || 'N/A'}</TableCell>
                  <TableCell>{customer.state ? `${customer.state} (${customer.stateCode})` : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                      <Edit className="h-4 w-4" />
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

export default Customers;
