import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  Loader2, 
  Phone, 
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  normalizeWhatsAppPhone, 
  getDirectWhatsAppUrl, 
  formatWhatsAppSaleMessage, 
  formatWhatsAppQuotationMessage, 
  sharePdfOnWhatsApp 
} from '../utils/whatsapp';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  type?: 'sale' | 'quotation';
  companyInfo?: any;
  onSuccessDone?: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  data,
  type = 'sale',
  companyInfo,
  onSuccessDone
}) => {
  const [phone, setPhone] = useState('');
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (data) {
      const rawPhone = data.customerId?.phone || data.customerPhone || '';
      setPhone(rawPhone);
      setCopied(false);
    }
  }, [data, isOpen]);

  if (!isOpen || !data) return null;

  const docNumber = type === 'sale' ? (data.invoiceNumber || 'INV') : (data.quotationNumber || 'QUO');
  const customerName = data.customerId?.name || data.customerName || 'Customer';
  const grandTotal = Number(data.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const isBillOfSupply = data.documentType === 'BILL_OF_SUPPLY' || data.invoiceType === 'COMPOSITION';
  const docTitle = type === 'sale' 
    ? (isBillOfSupply ? 'Bill of Supply' : (data.invoiceType === 'NON_GST' ? 'Estimate' : 'Tax Invoice'))
    : (data.invoiceType === 'NON_GST' ? 'Estimate' : 'Quotation');

  const messageText = type === 'sale' 
    ? formatWhatsAppSaleMessage(data, companyInfo)
    : formatWhatsAppQuotationMessage(data, companyInfo);

  const cleanPhone = normalizeWhatsAppPhone(phone);
  const isPhoneValid = cleanPhone.length >= 10;

  const handleDirectWhatsApp = () => {
    if (!isPhoneValid) {
      toast.error('Kripya ek valid 10-digit mobile number enter karein.');
      return;
    }
    const url = getDirectWhatsAppUrl(cleanPhone, messageText);
    window.open(url, '_blank');
    toast.success(`WhatsApp opened for ${cleanPhone}!`);
    if (onSuccessDone) onSuccessDone();
  };

  const handleSharePdf = async () => {
    if (!isPhoneValid) {
      toast.error('Kripya pehle customer ka mobile number enter karein.');
      return;
    }

    try {
      setIsSharingPdf(true);
      const res = await sharePdfOnWhatsApp({
        id: data._id || data.id,
        type,
        invoiceNumber: docNumber,
        phoneRaw: cleanPhone,
        message: messageText
      });

      if (res.success) {
        if (res.mode === 'web_share') {
          toast.success('PDF invoice shared via WhatsApp!');
        } else {
          toast.success('PDF download ho gaya! WhatsApp chat open hai, PDF ko chat me drop karein.', {
            duration: 5000,
            icon: '📄'
          });
        }
        if (onSuccessDone) onSuccessDone();
      } else if (res.error && res.error !== 'Share cancelled') {
        toast.error(res.error || 'Failed to share PDF');
      }
    } catch (err: any) {
      toast.error('Error sharing PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSharingPdf(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    toast.success('Message copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printUrl = `/${type === 'sale' ? 'sales' : 'quotations'}/${data._id || data.id}/print`;
    window.open(printUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Send on WhatsApp</h3>
              <p className="text-xs text-emerald-100">{docTitle}: <span className="font-mono font-semibold">{docNumber}</span></p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          
          {/* Quick Invoice Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Customer</div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-base">{customerName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {data.items?.length || 0} item(s) • {new Date(data.createdAt || Date.now()).toLocaleDateString('en-IN')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Grand Total</div>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">₹{grandTotal}</div>
              {Number(data.balanceAmount) > 0 && (
                <div className="text-xs font-semibold text-rose-500">Due: ₹{Number(data.balanceAmount).toFixed(2)}</div>
              )}
            </div>
          </div>

          {/* Customer Mobile Number Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Customer Mobile Number (Direct WhatsApp Number)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 font-semibold text-slate-500 text-sm flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> +91
              </span>
              <input
                type="tel"
                value={phone.replace(/^\+91/, '').replace(/^91/, '')}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                className="w-full pl-16 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none text-base"
              />
            </div>
            {!isPhoneValid && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                WhatsApp par bhejne ke liye 10-digit mobile number zaroori hai.
              </p>
            )}
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-2 pt-2">
            
            {/* Direct WhatsApp Button */}
            <button
              onClick={handleDirectWhatsApp}
              disabled={!isPhoneValid}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition-all text-sm active:scale-[0.99]"
            >
              <MessageSquare className="h-4.5 w-4.5" />
              Send on WhatsApp (Direct to Customer Phone)
              <ExternalLink className="h-4 w-4 ml-auto opacity-75" />
            </button>

            {/* Share PDF on WhatsApp Button */}
            <button
              onClick={handleSharePdf}
              disabled={!isPhoneValid || isSharingPdf}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-all text-sm active:scale-[0.99]"
            >
              {isSharingPdf ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileText className="h-4.5 w-4.5 text-red-400 dark:text-red-600" />
                  Share PDF Document on WhatsApp
                </>
              )}
            </button>

          </div>

          {/* Secondary Quick Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handlePrint}
              type="button"
              className="py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / View Invoice
            </button>

            <button
              onClick={handleCopyMessage}
              type="button"
              className="py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy Bill Message'}
            </button>
          </div>

          {/* Collapsible Message Preview */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span>Preview WhatsApp Message</span>
              {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {showPreview && (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-line border-t border-slate-200 dark:border-slate-700 leading-relaxed max-h-48 overflow-y-auto">
                {messageText}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
          <span>Clicking opens WhatsApp directly</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default WhatsAppShareModal;
