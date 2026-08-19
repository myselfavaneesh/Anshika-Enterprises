import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Edit, Search, X, Trash2, Copy, Download, Phone } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', gstNumber: '', state: '', stateCode: '' });
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
    } catch (error: any) {
      console.error('Error saving customer', error);
      alert(error.response?.data?.error || 'Failed to save customer');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', phone: '', email: '', address: '', gstNumber: '', state: '', stateCode: '' });
  };

  const handleEdit = (customer: any) => {
    setEditingId(customer._id);
    setFormData({ 
      name: customer.name, 
      phone: customer.phone || '', 
      email: customer.email || '',
      address: customer.address || '',
      gstNumber: customer.gstNumber || '',
      state: customer.state || '',
      stateCode: customer.stateCode || ''
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        await api.delete(`/customers/${id}`);
        fetchCustomers();
      } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to delete customer');
      }
    }
  };

  const handleExportVCF = () => {
    const vcfData = customers.filter(c => c.phone).map(c => 
      `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name}\nTEL;TYPE=CELL:${c.phone}\nEND:VCARD`
    ).join('\n');
    
    if (!vcfData) {
      alert('No customers with phone numbers found.');
      return;
    }
    const blob = new Blob([vcfData], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers_contacts.vcf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyNumbers = () => {
    const numbers = customers.filter(c => c.phone).map(c => c.phone).join(', ');
    if (numbers) {
      navigator.clipboard.writeText(numbers);
      alert('Copied all phone numbers to clipboard!');
    } else {
      alert('No phone numbers found.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyNumbers} title="Copy comma separated numbers for WhatsApp Web Extensions">
            <Copy className="mr-2 h-4 w-4" /> Copy Numbers
          </Button>
          <Button variant="outline" onClick={handleExportVCF} title="Download Contacts for Phone Import to create WhatsApp Broadcast Lists">
            <Download className="mr-2 h-4 w-4" /> Export Contacts (VCF)
          </Button>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Optional" />
                </div>
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

      <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>GST</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center">No customers found.</TableCell></TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer._id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    {customer.phone ? (
                      <a
                        href={`tel:${customer.phone.replace(/[^0-9+]/g, '')}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-medium"
                        title="Click to direct call"
                      >
                        <Phone className="h-3.5 w-3.5 text-blue-500" />
                        {customer.phone}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>{customer.email || 'N/A'}</TableCell>
                  <TableCell>{customer.address || 'N/A'}</TableCell>
                  <TableCell>{customer.gstNumber || 'N/A'}</TableCell>
                  <TableCell>{customer.state ? `${customer.state} (${customer.stateCode})` : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 items-center">
                      {customer.phone && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            const cleanPhone = customer.phone.replace(/[^0-9+]/g, '');
                            window.location.href = `tel:${cleanPhone}`;
                          }}
                          title={`Call ${customer.phone}`}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)} title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(customer._id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
