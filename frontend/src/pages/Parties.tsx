import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Edit, Trash2, Search, Copy, Download, MessageCircle } from 'lucide-react';

const INDIAN_STATES = [
  { name: 'Jammu and Kashmir', code: '01' }, { name: 'Himachal Pradesh', code: '02' },
  { name: 'Punjab', code: '03' }, { name: 'Chandigarh', code: '04' },
  { name: 'Uttarakhand', code: '05' }, { name: 'Haryana', code: '06' },
  { name: 'Delhi', code: '07' }, { name: 'Rajasthan', code: '08' },
  { name: 'Uttar Pradesh', code: '09' }, { name: 'Bihar', code: '10' },
  { name: 'Sikkim', code: '11' }, { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Nagaland', code: '13' }, { name: 'Manipur', code: '14' },
  { name: 'Mizoram', code: '15' }, { name: 'Tripura', code: '16' },
  { name: 'Meghalaya', code: '17' }, { name: 'Assam', code: '18' },
  { name: 'West Bengal', code: '19' }, { name: 'Jharkhand', code: '20' },
  { name: 'Odisha', code: '21' }, { name: 'Chhattisgarh', code: '22' },
  { name: 'Madhya Pradesh', code: '23' }, { name: 'Gujarat', code: '24' },
  { name: 'Daman and Diu', code: '25' }, { name: 'Dadra and Nagar Haveli', code: '26' },
  { name: 'Maharashtra', code: '27' }, { name: 'Karnataka', code: '29' },
  { name: 'Goa', code: '30' }, { name: 'Lakshadweep', code: '31' },
  { name: 'Kerala', code: '32' }, { name: 'Tamil Nadu', code: '33' },
  { name: 'Puducherry', code: '34' }, { name: 'Andaman and Nicobar Islands', code: '35' },
  { name: 'Telangana', code: '36' }, { name: 'Andhra Pradesh', code: '37' },
  { name: 'Ladakh', code: '38' }
];

const fetcher = (url: string) => api.get(url).then(res => res.data);

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

export default function Parties() {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const navigate = useNavigate();

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', phone: '', address: '', gstNumber: '', state: 'Uttar Pradesh', stateCode: '09', outstandingBalance: 0 
  });

  // Fetch lists
  const { data: customers = [], mutate: mutateCustomers } = useSWR('/customers', fetcher);
  const { data: suppliers = [], mutate: mutateSuppliers } = useSWR('/suppliers', fetcher);

  const [searchQuery, setSearchQuery] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'outstanding' | 'advance'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, balanceFilter]);

  const applyFilters = (party: any) => {
    const matchesSearch = party.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          party.phone?.includes(searchQuery);
    if (!matchesSearch) return false;

    const bal = party.outstandingBalance || 0;
    if (balanceFilter === 'outstanding') return bal > 0;
    if (balanceFilter === 'advance') return bal < 0;
    return true;
  };

  const filteredCustomers = customers.filter(applyFilters);
  const filteredSuppliers = suppliers.filter(applyFilters);

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', phone: '', address: '', gstNumber: '', state: 'Uttar Pradesh', stateCode: '09', outstandingBalance: 0 });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        if (activeTab === 'customers') {
          await api.put(`/customers/${editingId}`, formData);
          mutateCustomers();
        } else {
          await api.put(`/suppliers/${editingId}`, formData);
          mutateSuppliers();
        }
      } else {
        if (activeTab === 'customers') {
          await api.post('/customers', formData);
          mutateCustomers();
        } else {
          await api.post('/suppliers', formData);
          mutateSuppliers();
        }
      }
      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving party', error);
      alert('Failed to save');
    }
  };

  const handleEdit = (party: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(party._id);
    setFormData({
      name: party.name,
      phone: party.phone || '',
      address: party.address || '',
      gstNumber: party.gstNumber || '',
      state: party.state || 'Uttar Pradesh',
      stateCode: party.stateCode || '09',
      outstandingBalance: party.outstandingBalance || 0
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: string, type: 'customers' | 'suppliers', e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete this ${type === 'customers' ? 'customer' : 'supplier'}?`)) {
      try {
        if (type === 'customers') {
          await api.delete(`/customers/${id}`);
          mutateCustomers();
        } else {
          await api.delete(`/suppliers/${id}`);
          mutateSuppliers();
        }
      } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to delete');
      }
    }
  };

  const handleSendCommunityInvite = (party: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!party.phone) {
      alert('This party does not have a phone number saved.');
      return;
    }
    
    const message = `Hello ${party.name},\n\nFollow this link to join my WhatsApp group: https://chat.whatsapp.com/Fm529Nk3pLzA3GdhzeYzAO?s=sh&p=a&ilr=0`;
    const encodedMessage = encodeURIComponent(message);
    let phone = party.phone.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const renderTable = (data: any[], type: 'customers' | 'suppliers') => {
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
      <div className="space-y-4">
        <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm mt-4 overflow-x-auto">
          <Table className="min-w-[700px]">
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
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No {type} found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((party) => {
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
                  <TableRow key={party._id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/parties/${type}/${party._id}/ledger`)}>
                    <TableCell className="font-medium">{party.name}</TableCell>
                    <TableCell>{party.phone || '-'}</TableCell>
                    <TableCell>{party.gstNumber || '-'}</TableCell>
                    <TableCell className={`text-right ${balColor}`}>
                      {formatCurrency(Math.abs(bal))} <span className="text-xs opacity-80">{bal !== 0 && balLabel}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 items-center">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/parties/${type}/${party._id}/ledger`); }}>
                          Statement
                        </Button>
                        <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={(e) => handleSendCommunityInvite(party, e)} title="Send Community Invite">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => handleEdit(party, e)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={(e) => handleDelete(party._id, type, e)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-slate-500">
              Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, data.length)} of {data.length} entries
            </span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleExportVCF = () => {
    const list = activeTab === 'customers' ? customers : suppliers;
    const vcfData = list.filter((p: any) => p.phone).map((p: any) => 
      `BEGIN:VCARD\nVERSION:3.0\nFN:${p.name}\nTEL;TYPE=CELL:${p.phone}\nEND:VCARD`
    ).join('\n');
    
    if (!vcfData) {
      alert(`No ${activeTab} with phone numbers found.`);
      return;
    }
    const blob = new Blob([vcfData], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_contacts.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyNumbers = () => {
    const list = activeTab === 'customers' ? customers : suppliers;
    const numbers = list.filter((p: any) => p.phone).map((p: any) => p.phone).join(', ');
    if (numbers) {
      navigator.clipboard.writeText(numbers);
      alert(`Copied all phone numbers of ${activeTab} to clipboard!`);
    } else {
      alert(`No phone numbers found for ${activeTab}.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Khata Book</h2>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleCopyNumbers} title="Copy comma separated numbers for WhatsApp Web Extensions">
            <Copy className="mr-2 h-4 w-4" /> Copy Numbers
          </Button>
          <Button variant="outline" onClick={handleExportVCF} title="Download Contacts for Phone Import to create WhatsApp Broadcast Lists">
            <Download className="mr-2 h-4 w-4" /> Export Contacts (VCF)
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> 
                Add {activeTab === 'customers' ? 'Customer' : 'Supplier'}
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add New'} {activeTab === 'customers' ? 'Customer' : 'Supplier'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
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
                <label className="text-sm font-medium">GSTIN</label>
                <Input value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">State</label>
                  <Select
                    value={formData.state}
                    onValueChange={(val) => {
                      const stateObj = INDIAN_STATES.find((s) => s.name === val);
                      setFormData({ ...formData, state: val, stateCode: stateObj ? stateObj.code : '' });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s.code} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">State Code</label>
                  <Input value={formData.stateCode} readOnly className="bg-slate-50 cursor-not-allowed text-slate-500 font-semibold" tabIndex={-1} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Opening Balance (₹)</label>
                <Input 
                  type="number" 
                  value={formData.outstandingBalance} 
                  onChange={e => setFormData({...formData, outstandingBalance: Number(e.target.value) || 0})} 
                  placeholder="0"
                />
                <p className="text-xs text-slate-500">
                  {activeTab === 'customers' 
                    ? "Positive amount means they owe you money." 
                    : "Positive amount means you owe them money."}
                </p>
              </div>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-[400px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search by name or phone..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={balanceFilter} onValueChange={(val: any) => setBalanceFilter(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Balance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Parties</SelectItem>
              <SelectItem value="outstanding">To Receive / Pay ({">"}0)</SelectItem>
              <SelectItem value="advance">Advance ({"<"}0)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
        <TabsContent value="customers">
          {renderTable(filteredCustomers, 'customers')}
        </TabsContent>
        <TabsContent value="suppliers">
          {renderTable(filteredSuppliers, 'suppliers')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
