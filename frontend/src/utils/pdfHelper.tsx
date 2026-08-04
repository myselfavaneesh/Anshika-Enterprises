import { createRoot } from 'react-dom/client';
import html2pdf from 'html2pdf.js';
import InvoicePrint from '../components/InvoicePrint';

export const generateAndDownloadPDF = async (data: any, type: 'TAX INVOICE' | 'QUOTATION'): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      // Set container width to 190mm (210mm A4 - 20mm horizontal margins)
      container.style.width = '190mm';
      document.body.appendChild(container);

      const root = createRoot(container);
      root.render(<InvoicePrint type={type} data={data} />);

      setTimeout(() => {
        const element = container.querySelector('.bg-white') as HTMLElement;
        if (element) {
          // Remove strict A4 sizing so it fits inside the PDF with margins without spilling to a second page
          element.classList.remove('w-[210mm]', 'min-h-[297mm]', 'p-4', 'md:p-8');
          element.style.padding = '0';
          
          const docType = type === 'TAX INVOICE' && data.invoiceType === 'NON_GST' ? 'Estimate' : (type === 'TAX INVOICE' ? 'Invoice' : 'Quotation');
          const identifier = data.invoiceNumber || data.quotationNumber;
          
          const opt = {
            margin:       [10, 10, 10, 10] as [number, number, number, number],
            filename:     `${docType}-${identifier?.replace(/\//g, '-')}.pdf`,
            image:        { type: 'jpeg' as const, quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
          };

          html2pdf().set(opt).from(element).save().then(() => {
            root.unmount();
            document.body.removeChild(container);
            resolve();
          }).catch((err: any) => {
            root.unmount();
            document.body.removeChild(container);
            reject(err);
          });
        } else {
          root.unmount();
          document.body.removeChild(container);
          reject(new Error("Could not find invoice element"));
        }
      }, 500);
    } catch (error) {
      reject(error);
    }
  });
};
