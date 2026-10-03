import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Printer, Download, Share2, ArrowLeft, Loader2 } from 'lucide-react';
import api from '../services/api';
import InvoicePrint from '../components/InvoicePrint';
import WhatsAppShareModal from '../components/WhatsAppShareModal';
import { downloadBlobAsFile } from '../utils/whatsapp';

const PrintInvoice = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const autoPrint = searchParams.get('autoprint') === 'true';

  const isQuotation = location.pathname.includes('quotations');
  const type = isQuotation ? 'QUOTATION' : 'TAX INVOICE';
  const endpoint = isQuotation ? `/quotations/${id}` : `/sales/${id}`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        let docData: any = null;
        let compData: any = null;

        // Try authenticated endpoint first (if merchant logged in)
        try {
          const [docRes, profileRes] = await Promise.all([
            api.get(endpoint),
            api.get('/settings/business-profile?decrypt=true'),
          ]);
          docData = docRes.data;
          compData = profileRes.data;
        } catch {
          // Fallback to public customer endpoint (zero authentication required)
          const publicRes = await api.get(`/public/${isQuotation ? 'quotations' : 'sales'}/${id}`);
          docData = publicRes.data.sale || publicRes.data.quotation;
          compData = publicRes.data.company;
        }

        setData(docData);
        setCompanyInfo(compData);
      } catch (error) {
        console.error('Error fetching data for print', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, endpoint, isQuotation]);

  useEffect(() => {
    if (!loading && data && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, data, autoPrint]);

  const handleDownloadPdf = async () => {
    if (!id || !data) return;
    try {
      setIsDownloadingPdf(true);
      const docNum = (data.invoiceNumber || data.quotationNumber || 'invoice').replace(/[\/\\]/g, '-');
      const filename = `${isQuotation ? 'Quotation' : 'Invoice'}-${docNum}.pdf`;

      let pdfBlob: Blob;
      try {
        const pdfEndpoint = isQuotation ? `/quotations/${id}/pdf` : `/sales/${id}/invoice`;
        const res = await api.get(pdfEndpoint, { responseType: 'blob' });
        pdfBlob = new Blob([res.data], { type: 'application/pdf' });
      } catch {
        const publicEndpoint = isQuotation ? `/public/quotations/${id}/pdf` : `/public/sales/${id}/invoice`;
        const res = await api.get(publicEndpoint, { responseType: 'blob' });
        pdfBlob = new Blob([res.data], { type: 'application/pdf' });
      }

      downloadBlobAsFile(pdfBlob, filename);
    } catch (err) {
      console.error('Failed to download PDF', err);
      // Fallback to browser print as PDF
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
        <p className="font-medium text-sm">Loading Invoice...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 text-center">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-8 max-w-md">
          <p className="text-red-600 dark:text-red-400 font-bold text-lg mb-2">Invoice Not Found</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            Ye invoice ya quotation exist nahi karta ya link expire ho gaya hai.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-950 min-h-screen pb-12 print:py-0 print:pb-0 print:bg-white">
      
      {/* Top Floating Control Bar (Hidden when printing) */}
      <div className="print:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm py-3 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Share on WhatsApp */}
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95"
            >
              <Share2 className="h-4 w-4" />
              <span>WhatsApp</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4 text-red-400 dark:text-red-600" />
              )}
              <span>{isDownloadingPdf ? 'Downloading...' : 'Download PDF'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>

          </div>
        </div>
      </div>

      {/* Invoice Canvas */}
      <div className="py-6 print:py-0">
        <InvoicePrint type={type} data={data} companyInfo={companyInfo} />
      </div>

      {/* WhatsApp Share Dialog */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        data={data}
        type={isQuotation ? 'quotation' : 'sale'}
        companyInfo={companyInfo}
      />

    </div>
  );
};

export default PrintInvoice;
