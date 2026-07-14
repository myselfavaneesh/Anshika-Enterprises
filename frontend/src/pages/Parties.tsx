import React, { useState } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

export default function Parties() {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const navigate = useNavigate();

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', phone: '', address: '', gstNumber: '', state: '', stateCode: '', outstandingBalance: 0 
  });

  // Fetch lists
  const { data: customers = [], mutate: mutateCustomers } = useSWR('/customers', fetcher);
  const { data: suppliers = [], mutate: mutateSuppliers } = useSWR('/suppliers', fetcher);

  const resetForm = () => {
    setFormData({ name: '', phone: '', address: '', gstNumber: '', state: '', stateCode: '', outstandingBalance: 0 });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'customers') {
        await api.post('/customers', formData);
        mutateCustomers();
      } else {
        await api.post('/suppliers', formData);
        mutateSuppliers();
      }
      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding party', error);
      alert('Failed to save');
    }
  };

  const renderTable = (data: any[], type: 'customers' | 'suppliers') => {
    return (
      <div className="rounded-md border bg-white dark:bg-slate-950 shadow-sm mt-4">
        <Table>
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
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No {type} found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((party) => {
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
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/parties/${type}/${party._id}/ledger`); }}>
                        View Statement
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Khata Book</h2>
        
        <Dialog open={isAddModalOpen} onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> 
              Add {activeTab === 'customers' ? 'Customer' : 'Supplier'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New {activeTab === 'customers' ? 'Customer' : 'Supplier'}</DialogTitle>
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

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
        <TabsContent value="customers">
          {renderTable(customers, 'customers')}
        </TabsContent>
        <TabsContent value="suppliers">
          {renderTable(suppliers, 'suppliers')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
