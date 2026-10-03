import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  Building2, 
  MapPin, 
  FileText, 
  Landmark, 
  Printer, 
  GitBranch, 
  ShieldCheck, 
  Upload, 
  Trash2, 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  QrCode, 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  gstin?: string;
}

export default function BusinessProfileSettings() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('basic');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form State
  const [businessName, setBusinessName] = useState('Anshika Enterprises');
  const [legalName, setLegalName] = useState('');
  const [businessType, setBusinessType] = useState('BOTH');
  const [businessCategory, setBusinessCategory] = useState('Power & Solar Appliances');
  const [ownerName, setOwnerName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Contact
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Uttar Pradesh');
  const [stateCode, setStateCode] = useState('09');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('India');

  // Tax
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [gstType, setGstType] = useState('REGULAR');
  const [defaultGstRate, setDefaultGstRate] = useState<number>(18);
  const [defaultHsn, setDefaultHsn] = useState('');

  // Bank
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [maskedAccountNumber, setMaskedAccountNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [ifscCode, setIfscCode] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Invoice
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [startingNumber, setStartingNumber] = useState<number>(1);
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [defaultPrintSize, setDefaultPrintSize] = useState('A4');
  const [showBankDetails, setShowBankDetails] = useState(true);

  // Branches
  const [branches, setBranches] = useState<Branch[]>([]);
  const [newBranch, setNewBranch] = useState<Branch>({ id: '', name: '', address: '', phone: '', gstin: '' });
  const [showAddBranch, setShowAddBranch] = useState(false);

  // Completion & Status
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [needsReverification, setNeedsReverification] = useState(false);

  // File Upload refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Fetch Business Profile
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/settings/business-profile');
      const data = res.data;

      setBusinessName(data.businessName || '');
      setLegalName(data.legalName || '');
      setBusinessType(data.businessType || 'BOTH');
      setBusinessCategory(data.businessCategory || '');
      setOwnerName(data.ownerName || '');
      setLogoUrl(data.logoUrl || null);

      setPhone(data.phone || '');
      setAlternatePhone(data.alternatePhone || '');
      setEmail(data.email || '');
      setWebsite(data.website || '');

      setAddressLine1(data.addressLine1 || '');
      setAddressLine2(data.addressLine2 || '');
      setCity(data.city || '');
      setDistrict(data.district || '');
      setState(data.state || 'Uttar Pradesh');
      setStateCode(data.stateCode || '09');
      setPincode(data.pincode || '');
      setCountry(data.country || 'India');

      setGstin(data.gstin || '');
      setPan(data.pan || '');
      setGstType(data.gstType || 'REGULAR');
      setDefaultGstRate(Number(data.defaultGstRate || 18));
      setDefaultHsn(data.defaultHsn || '');

      setAccountHolderName(data.accountHolderName || '');
      setBankName(data.bankName || '');
      setMaskedAccountNumber(data.maskedAccountNumber || data.accountNumber || '');
      setAccountNumber(data.maskedAccountNumber || data.accountNumber || '');
      setConfirmAccountNumber('');
      setIsEditingAccount(!data.maskedAccountNumber && !data.accountNumber);
      setIfscCode(data.ifscCode || '');
      setBankBranch(data.bankBranch || '');
      setUpiId(data.upiId || '');
      setQrCodeUrl(data.qrCodeUrl || null);

      setInvoicePrefix(data.invoicePrefix || 'INV');
      setStartingNumber(Number(data.startingNumber || 1));
      setTermsAndConditions(data.termsAndConditions || '');
      setSignatureUrl(data.signatureUrl || null);
      setDefaultPrintSize(data.defaultPrintSize || 'A4');
      setShowBankDetails(data.showBankDetails !== false);

      setBranches(Array.isArray(data.branches) ? data.branches : []);
      setCompletionPercentage(data.completionPercentage || 0);
      setNeedsReverification(Boolean(data.needsReverification));
      setIsDirty(false);
    } catch (err: any) {
      console.error('Failed to load profile', err);
      toast.error('Failed to load business profile settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Handle State Change -> Auto Map GST State Code
  const handleStateChange = (selectedStateName: string) => {
    setState(selectedStateName);
    const found = INDIAN_STATES.find(s => s.name.toLowerCase() === selectedStateName.toLowerCase());
    if (found) {
      setStateCode(found.code);
    }
    setIsDirty(true);
  };

  // Convert File to Base64
  const handleFileUpload = async (file: File, assetType: 'logo' | 'signature' | 'qrCode') => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await api.post('/settings/business-profile/upload', {
          imageBase64: base64,
          assetType,
        });

        if (assetType === 'logo') setLogoUrl(res.data.url);
        if (assetType === 'signature') setSignatureUrl(res.data.url);
        if (assetType === 'qrCode') setQrCodeUrl(res.data.url);

        setIsDirty(true);
        toast.success(`${assetType.charAt(0).toUpperCase() + assetType.slice(1)} uploaded successfully!`);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to upload image.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Settings
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin && user?.role !== 'manager') {
      toast.error('Access denied. Only Admins can modify business profile.');
      return;
    }

    // Validate Account Number confirmation if editing
    if (isEditingAccount && accountNumber && !accountNumber.includes('•')) {
      if (accountNumber !== confirmAccountNumber) {
        toast.error('Bank Account Number and Confirm Account Number do not match!');
        return;
      }
    }

    // Validate GSTIN vs State Code
    if (gstin && gstin.trim().length >= 2) {
      const gstPrefix = gstin.trim().slice(0, 2);
      if (stateCode && gstPrefix !== stateCode) {
        toast.error(`GSTIN prefix (${gstPrefix}) does not match selected State Code (${stateCode})!`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: any = {
        businessName,
        legalName,
        businessType,
        businessCategory,
        ownerName,
        logoUrl,
        phone,
        alternatePhone,
        email,
        website,
        addressLine1,
        addressLine2,
        city,
        district,
        state,
        stateCode,
        pincode,
        country,
        gstin,
        pan,
        gstType,
        defaultGstRate: Number(defaultGstRate),
        defaultHsn,
        accountHolderName,
        bankName,
        ifscCode,
        bankBranch,
        upiId,
        qrCodeUrl,
        invoicePrefix,
        startingNumber: Number(startingNumber),
        termsAndConditions,
        signatureUrl,
        defaultPrintSize,
        showBankDetails,
        branches,
      };

      // Only send accountNumber if admin explicitly edited it
      if (isEditingAccount && accountNumber && !accountNumber.includes('•')) {
        payload.accountNumber = accountNumber;
      }

      const res = await api.put('/settings/business-profile', payload);
      toast.success('Business Profile updated successfully!');
      setCompletionPercentage(res.data.profile.completionPercentage);
      setMaskedAccountNumber(res.data.profile.maskedAccountNumber || '');
      setNeedsReverification(res.data.profile.needsReverification);
      setIsDirty(false);
      setIsEditingAccount(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to save business profile.';
      toast.error(msg);
      if (err.response?.data?.details) {
        console.error('Validation errors:', err.response.data.details);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Add Branch
  const handleAddBranch = () => {
    if (!newBranch.name.trim()) {
      toast.error('Branch name is required');
      return;
    }
    const branchWithId: Branch = {
      ...newBranch,
      id: `br-${Date.now()}`,
    };
    setBranches([...branches, branchWithId]);
    setNewBranch({ id: '', name: '', address: '', phone: '', gstin: '' });
    setShowAddBranch(false);
    setIsDirty(true);
    toast.success('Branch added.');
  };

  const handleRemoveBranch = (id: string) => {
    setBranches(branches.filter(b => b.id !== id));
    setIsDirty(true);
    toast.success('Branch removed.');
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-20 bg-slate-100 dark:bg-slate-900 rounded-xl border animate-pulse" />
        <div className="h-96 bg-slate-100 dark:bg-slate-900 rounded-xl border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Business Profile & SaaS Settings
            </h1>
            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200">
              Tenant Settings
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure your enterprise branding, GST tax structure, bank accounts, digital signature, and invoice templates.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isDirty && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchProfile}
              disabled={isSaving}
              className="text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={() => handleSave()}
            disabled={isSaving || (!isAdmin && user?.role !== 'manager')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>

      {/* Completion Progress Bar & Status Alerts */}
      <Card className="bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/20 border-indigo-100 dark:border-indigo-900/40">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Profile Completion
                </span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {completionPercentage}%
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {completionPercentage >= 90
                  ? 'All essential business, GSTIN, and banking information is fully configured for compliant invoicing.'
                  : 'Complete missing tax and banking details to enable auto-filled invoices, QR codes, and compliance.'}
              </p>
            </div>
            {needsReverification && (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>GSTIN / Bank changed. Verification flag active.</span>
              </div>
            )}
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                completionPercentage >= 80 ? 'bg-emerald-500' : completionPercentage >= 50 ? 'bg-indigo-600' : 'bg-amber-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-slate-100 dark:bg-slate-900 rounded-xl gap-1">
          <TabsTrigger value="basic" className="text-xs py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <Building2 className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" /> Basic
          </TabsTrigger>
          <TabsTrigger value="contact" className="text-xs py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <MapPin className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" /> Address
          </TabsTrigger>
          <TabsTrigger value="tax" className="text-xs py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <FileText className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" /> Tax & GST
          </TabsTrigger>
          <TabsTrigger value="bank" className="text-xs py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <Landmark className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" /> Bank & UPI
          </TabsTrigger>
          <TabsTrigger value="invoice" className="text-xs py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <Printer className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" /> Print & Invoice
          </TabsTrigger>
          <TabsTrigger value="branches" className="text-xs py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <GitBranch className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" /> Branches
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BASIC INFO */}
        <TabsContent value="basic" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" /> Enterprise Brand & Entity Details
              </CardTitle>
              <CardDescription className="text-xs">
                Your business brand appears on all invoices, estimates, and customer notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    value={businessName} 
                    onChange={e => { setBusinessName(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Anshika Enterprises"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Legal / Trade Name
                  </label>
                  <Input 
                    value={legalName} 
                    onChange={e => { setLegalName(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Anshika Enterprises Pvt. Ltd."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Business Type
                  </label>
                  <select
                    value={businessType}
                    onChange={e => { setBusinessType(e.target.value); setIsDirty(true); }}
                    className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="RETAIL">Retail Shop</option>
                    <option value="WHOLESALE">Wholesale Distribution</option>
                    <option value="BOTH">Both (Retail & Wholesale)</option>
                    <option value="SERVICE">Service & Repair Provider</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Business Category
                  </label>
                  <Input 
                    value={businessCategory} 
                    onChange={e => { setBusinessCategory(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Solar, Batteries, Electronics"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Owner / Director Name
                  </label>
                  <Input 
                    value={ownerName} 
                    onChange={e => { setOwnerName(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Avaneesh Jaiswal"
                  />
                </div>
              </div>

              {/* Logo Upload Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  Business Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1 shadow-sm">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input 
                      type="file" 
                      ref={logoInputRef} 
                      className="hidden" 
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'logo');
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        className="text-xs"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" /> Upload Logo
                      </Button>
                      {logoUrl && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setLogoUrl(null); setIsDirty(true); }}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">Recommended: PNG, JPG, or SVG with transparent background (Max 2MB).</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CONTACT & ADDRESS */}
        <TabsContent value="contact" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" /> Contact & Physical Location
              </CardTitle>
              <CardDescription className="text-xs">
                Your registered office address establishes your Place of Business and GST state jurisdiction.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Primary Contact Phone <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    value={phone} 
                    onChange={e => { setPhone(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. +91 98765 43210"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Alternate Phone / WhatsApp
                  </label>
                  <Input 
                    value={alternatePhone} 
                    onChange={e => { setAlternatePhone(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. +91 98765 01234"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Official Email Address
                  </label>
                  <Input 
                    type="email"
                    value={email} 
                    onChange={e => { setEmail(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. contact@anshika.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Website URL
                  </label>
                  <Input 
                    value={website} 
                    onChange={e => { setWebsite(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. https://www.anshikaenterprises.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Address Line 1 (Shop / Street / Building)
                </label>
                <Input 
                  value={addressLine1} 
                  onChange={e => { setAddressLine1(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Shop No. 12, Main Market Road"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Address Line 2 (Area / Landmark)
                </label>
                <Input 
                  value={addressLine2} 
                  onChange={e => { setAddressLine2(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Near Central Bank Branch"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    City
                  </label>
                  <Input 
                    value={city} 
                    onChange={e => { setCity(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Varanasi"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    District
                  </label>
                  <Input 
                    value={district} 
                    onChange={e => { setDistrict(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Varanasi"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    State (GST Code)
                  </label>
                  <select
                    value={state}
                    onChange={e => handleStateChange(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs text-slate-900 dark:text-white"
                  >
                    {INDIAN_STATES.map(s => (
                      <option key={s.code} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    PIN Code
                  </label>
                  <Input 
                    value={pincode} 
                    maxLength={6}
                    onChange={e => { setPincode(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. 221001"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: TAX & GST */}
        <TabsContent value="tax" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> GST, PAN & Tax Structure
              </CardTitle>
              <CardDescription className="text-xs">
                Configure GSTIN, registration scheme, and defaults for tax invoices and e-invoicing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    GSTIN (15 Digits)
                  </label>
                  <Input 
                    value={gstin} 
                    maxLength={15}
                    onChange={e => { setGstin(e.target.value.toUpperCase()); setIsDirty(true); }}
                    placeholder="e.g. 09AAACH7409R1ZZ"
                    className="font-mono"
                  />
                  <p className="text-[10px] text-slate-400">Must start with your state code: {stateCode}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Permanent Account Number (PAN)
                  </label>
                  <Input 
                    value={pan} 
                    maxLength={10}
                    onChange={e => { setPan(e.target.value.toUpperCase()); setIsDirty(true); }}
                    placeholder="e.g. AAACH7409R"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    GST Registration Scheme
                  </label>
                  <select
                    value={gstType}
                    onChange={e => { setGstType(e.target.value); setIsDirty(true); }}
                    className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="REGULAR">Regular Taxpayer (Tax Invoice)</option>
                    <option value="COMPOSITION">Composition Scheme (Bill of Supply)</option>
                    <option value="UNREGISTERED">Unregistered Business</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Default GST Rate (%)
                  </label>
                  <select
                    value={defaultGstRate}
                    onChange={e => { setDefaultGstRate(Number(e.target.value)); setIsDirty(true); }}
                    className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs text-slate-900 dark:text-white"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (Standard)</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Default HSN / SAC Code
                  </label>
                  <Input 
                    value={defaultHsn} 
                    onChange={e => { setDefaultHsn(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. 8504 or 8507"
                    className="font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: BANK & UPI */}
        <TabsContent value="bank" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-600" /> Bank Account & UPI Configuration
              </CardTitle>
              <CardDescription className="text-xs">
                Bank account is securely encrypted (AES-256-GCM). Masked on client screens for privacy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Account Holder Name
                  </label>
                  <Input 
                    value={accountHolderName} 
                    onChange={e => { setAccountHolderName(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Anshika Enterprises"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Bank Name
                  </label>
                  <Input 
                    value={bankName} 
                    onChange={e => { setBankName(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. State Bank of India"
                  />
                </div>
              </div>

              {/* Account Number Fields */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Bank Account Number
                  </label>
                  {maskedAccountNumber && !isEditingAccount && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditingAccount(true);
                        setAccountNumber('');
                        setConfirmAccountNumber('');
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      Change Account Number
                    </Button>
                  )}
                </div>

                {!isEditingAccount && maskedAccountNumber ? (
                  <div className="flex items-center gap-2 font-mono text-sm bg-white dark:bg-slate-950 px-3 py-2 rounded border text-slate-800 dark:text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{maskedAccountNumber}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">Encrypted AES-256</Badge>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 font-medium">New Account Number</span>
                      <Input 
                        type="password"
                        value={accountNumber} 
                        onChange={e => { setAccountNumber(e.target.value); setIsDirty(true); }}
                        placeholder="Enter full account number"
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 font-medium">Confirm Account Number</span>
                      <Input 
                        type="text"
                        value={confirmAccountNumber} 
                        onChange={e => { setConfirmAccountNumber(e.target.value); setIsDirty(true); }}
                        placeholder="Re-enter account number"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    IFSC Code
                  </label>
                  <Input 
                    value={ifscCode} 
                    maxLength={11}
                    onChange={e => { setIfscCode(e.target.value.toUpperCase()); setIsDirty(true); }}
                    placeholder="e.g. SBIN0001234"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Branch Name
                  </label>
                  <Input 
                    value={bankBranch} 
                    onChange={e => { setBankBranch(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Cantt Branch"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    UPI ID / VPA
                  </label>
                  <Input 
                    value={upiId} 
                    onChange={e => { setUpiId(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. anshika@sbi"
                  />
                </div>
              </div>

              {/* QR Code Upload */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  Payment QR Code (UPI / BharatPe / PayTM)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1 shadow-sm">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input 
                      type="file" 
                      ref={qrInputRef} 
                      className="hidden" 
                      accept="image/png,image/jpeg,image/webp"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'qrCode');
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => qrInputRef.current?.click()}
                        className="text-xs"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" /> Upload QR Code
                      </Button>
                      {qrCodeUrl && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setQrCodeUrl(null); setIsDirty(true); }}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">Printed on thermal receipts and PDF invoices for instant customer UPI payment.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: PRINT & INVOICE SETTINGS */}
        <TabsContent value="invoice" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" /> Invoice Formatting & Print Styles
              </CardTitle>
              <CardDescription className="text-xs">
                Configure your invoice numbering sequence, terms, digital signature, and thermal paper size.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Invoice Prefix
                  </label>
                  <Input 
                    value={invoicePrefix} 
                    maxLength={10}
                    onChange={e => { setInvoicePrefix(e.target.value.toUpperCase()); setIsDirty(true); }}
                    placeholder="e.g. INV or AE"
                    className="font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Starting Number
                  </label>
                  <Input 
                    type="number"
                    min={1}
                    value={startingNumber} 
                    onChange={e => { setStartingNumber(Number(e.target.value)); setIsDirty(true); }}
                    placeholder="e.g. 1"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Default Print Size
                  </label>
                  <select
                    value={defaultPrintSize}
                    onChange={e => { setDefaultPrintSize(e.target.value); setIsDirty(true); }}
                    className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="A4">A4 Full Page (Desktop/Laser)</option>
                    <option value="80MM">80mm Thermal Receipt (POS)</option>
                    <option value="58MM">58mm Mobile Thermal (Bluetooth)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <input 
                  type="checkbox"
                  id="showBankDetails"
                  checked={showBankDetails}
                  onChange={e => { setShowBankDetails(e.target.checked); setIsDirty(true); }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="showBankDetails" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                  Display Bank Account & IFSC details at the bottom of printed invoices
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Terms and Conditions / Invoice Footer Text
                </label>
                <textarea 
                  rows={4}
                  value={termsAndConditions} 
                  onChange={e => { setTermsAndConditions(e.target.value); setIsDirty(true); }}
                  placeholder="Enter shop return policy, warranty terms, and legal declaration..."
                  className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Signature Upload */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  Authorized Signatory / Seal Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-28 h-16 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1 shadow-sm">
                    {signatureUrl ? (
                      <img src={signatureUrl} alt="Signature" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400">No Signature</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input 
                      type="file" 
                      ref={signatureInputRef} 
                      className="hidden" 
                      accept="image/png,image/jpeg,image/webp"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'signature');
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => signatureInputRef.current?.click()}
                        className="text-xs"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" /> Upload Signature
                      </Button>
                      {signatureUrl && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setSignatureUrl(null); setIsDirty(true); }}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">Printed on the bottom-right of invoices as Authorized Signatory.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: BRANCHES */}
        <TabsContent value="branches" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-indigo-600" /> Multi-Branch Locations
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage independent outlets or warehouses with their own phone, address, and GSTIN.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddBranch(!showAddBranch)}
                className="text-xs"
              >
                + Add Branch
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddBranch && (
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Add New Branch</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input 
                      placeholder="Branch Name (e.g. Warehouse 2 / Godown)"
                      value={newBranch.name}
                      onChange={e => setNewBranch({ ...newBranch, name: e.target.value })}
                      className="text-xs"
                    />
                    <Input 
                      placeholder="Branch Phone Number"
                      value={newBranch.phone || ''}
                      onChange={e => setNewBranch({ ...newBranch, phone: e.target.value })}
                      className="text-xs"
                    />
                    <Input 
                      placeholder="Branch GSTIN (if separate)"
                      value={newBranch.gstin || ''}
                      onChange={e => setNewBranch({ ...newBranch, gstin: e.target.value.toUpperCase() })}
                      className="text-xs font-mono"
                    />
                    <Input 
                      placeholder="Branch Address"
                      value={newBranch.address || ''}
                      onChange={e => setNewBranch({ ...newBranch, address: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowAddBranch(false)} className="text-xs">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleAddBranch} className="bg-indigo-600 text-white text-xs">
                      Save Branch
                    </Button>
                  </div>
                </div>
              )}

              {branches.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No additional branches configured. Your primary registered address will be used across all operations.
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow>
                        <TableHead className="text-xs">Branch Name</TableHead>
                        <TableHead className="text-xs">Address</TableHead>
                        <TableHead className="text-xs">Phone</TableHead>
                        <TableHead className="text-xs">GSTIN</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs font-semibold">{b.name}</TableCell>
                          <TableCell className="text-xs text-slate-500">{b.address || '-'}</TableCell>
                          <TableCell className="text-xs font-mono">{b.phone || '-'}</TableCell>
                          <TableCell className="text-xs font-mono">{b.gstin || '-'}</TableCell>
                          <TableCell className="text-xs text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveBranch(b.id)}
                              className="h-7 w-7 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
