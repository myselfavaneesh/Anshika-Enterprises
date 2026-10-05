import api from '../services/api';

/**
 * Normalizes Indian and international phone numbers for WhatsApp API.
 * Ensures no duplicate country codes (e.g. converts +91 98765 43210 -> 919876543210).
 */
export const normalizeWhatsAppPhone = (phoneRaw?: string | null): string => {
  if (!phoneRaw) return '';
  let cleaned = phoneRaw.replace(/\D/g, '');
  
  // Remove leading single 0 (Indian STD/trunk prefix)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // If standard 10-digit Indian mobile number, prefix 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
};

/**
 * Generates direct universal WhatsApp URL that opens the customer's chat directly.
 */
export const getDirectWhatsAppUrl = (phoneRaw: string, message: string): string => {
  const phone = normalizeWhatsAppPhone(phoneRaw);
  const encodedText = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
};

/**
 * Formats a clean, high-conversion WhatsApp message for a sale invoice.
 */
export const formatWhatsAppSaleMessage = (sale: any, companyInfo?: any): string => {
  const compName = companyInfo?.businessName || 'Anshika Enterprises';
  const customerName = sale.customerId?.name || sale.customerName || 'Customer';
  const isBillOfSupply = sale.documentType === 'BILL_OF_SUPPLY' || sale.invoiceType === 'COMPOSITION';
  const docType = isBillOfSupply ? 'Bill of Supply' : (sale.invoiceType === 'NON_GST' ? 'Estimate' : 'Tax Invoice');
  const invoiceNum = sale.invoiceNumber || 'INV';
  const dateStr = new Date(sale.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Calculate Paid Amount and Balance correctly based on Status and Payments
  let actualPaid = Number(sale.paidAmount);
  if (isNaN(actualPaid)) {
    if (sale.status === 'PAID') {
      actualPaid = Number(sale.grandTotal || 0);
    } else if (sale.payments && Array.isArray(sale.payments)) {
      actualPaid = sale.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    } else {
      actualPaid = 0;
    }
  }

  let actualBalance = Number(sale.balanceAmount);
  if (isNaN(actualBalance)) {
    actualBalance = Math.max(0, Number(sale.grandTotal || 0) - actualPaid);
  }

  const grandTotal = Number(sale.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const paidAmount = actualPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const balance = actualBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  // Format purchased items summary
  const items = sale.items || [];
  let itemsSummary = '';
  if (items.length > 0) {
    const slice = items.slice(0, 5);
    itemsSummary = slice.map((it: any) => {
      const name = it.product?.name || it.productName || it.name || 'Item';
      const qty = it.quantity || 1;
      const unit = it.unit || it.product?.unit || 'PC';
      const price = Number(it.taxableTotalPrice || it.totalPrice || 0).toFixed(0);
      return `• ${name} (${qty} ${unit}) - ₹${price}`;
    }).join('\n');

    if (items.length > 5) {
      itemsSummary += `\n• ...aur ${items.length - 5} items`;
    }
  }

  const origin = window.location.origin;
  const viewUrl = `${origin}/sales/${sale._id || sale.id}/print`;

  let msg = `*${compName.toUpperCase()}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Namaste *${customerName}* ji,\n\n`;
  msg += `Aapka ${docType} successfully generate ho gaya hai.\n\n`;
  msg += `📋 *Bill No:* ${invoiceNum}\n`;
  msg += `📅 *Tareekh:* ${dateStr}\n\n`;
  
  if (itemsSummary) {
    msg += `*Items Kharide:*\n${itemsSummary}\n\n`;
  }

  msg += `💰 *Kul Raqam (Total):* ₹${grandTotal}\n`;
  msg += `💳 *Bhugtan Kiya (Paid):* ₹${paidAmount}\n`;
  if (actualBalance > 0) {
    msg += `⚠️ *Baqaya Rashi (Due):* ₹${balance}\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📄 *Full PDF Invoice Dekhein / Download Karein:*\n${viewUrl}\n\n`;
  
  if (companyInfo?.upiId) {
    msg += `📲 *UPI Pay:* ${companyInfo.upiId}\n\n`;
  }

  msg += `Humse judne ke liye bahut-bahut Dhanyawad! 🙏`;

  return msg;
};

/**
 * Formats a clean WhatsApp message for a quotation / estimate.
 */
export const formatWhatsAppQuotationMessage = (quotation: any, companyInfo?: any): string => {
  const compName = companyInfo?.businessName || 'Anshika Enterprises';
  const customerName = quotation.customerId?.name || quotation.customerName || 'Customer';
  const docType = quotation.invoiceType === 'NON_GST' ? 'Estimate' : 'Quotation';
  const docNum = quotation.quotationNumber || 'QUO';
  const dateStr = new Date(quotation.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const grandTotal = Number(quotation.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const origin = window.location.origin;
  const viewUrl = `${origin}/quotations/${quotation._id || quotation.id}/print`;

  let msg = `*${compName.toUpperCase()}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Namaste *${customerName}* ji,\n\n`;
  msg += `Aapke anurodh par ${docType} *${docNum}* taiyar hai.\n`;
  msg += `📅 *Tareekh:* ${dateStr}\n`;
  msg += `💰 *Anumanit Raqam (Total):* ₹${grandTotal}\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📄 *Quotation Dekhein / Download Karein:*\n${viewUrl}\n\n`;
  msg += `Kripya check karke batayein. Dhanyawad! 🙏`;

  return msg;
};

/**
 * Helper to download a Blob as a file in the browser.
 */
export const downloadBlobAsFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Intelligent PDF Sharing for WhatsApp:
 * 1. On Mobile: uses Web Share API with File object so PDF attaches directly in WhatsApp chat.
 * 2. On PC/Desktop: downloads the official PDF to the user's computer and opens WhatsApp Web to the customer's direct phone number.
 */
export const sharePdfOnWhatsApp = async (params: {
  id: string;
  type: 'sale' | 'quotation';
  invoiceNumber: string;
  phoneRaw: string;
  message: string;
}): Promise<{ success: boolean; mode: 'web_share' | 'download_and_web' | 'web_only'; error?: string; noPdf?: boolean }> => {
  const { id, type, invoiceNumber, phoneRaw, message } = params;
  const cleanPhone = normalizeWhatsAppPhone(phoneRaw);
  const cleanDocNumber = (invoiceNumber || 'doc').replace(/[\/\\]/g, '-');
  const filename = `${type === 'sale' ? 'Invoice' : 'Quotation'}-${cleanDocNumber}.pdf`;

  let pdfBlob: Blob | null = null;
  try {
    const endpoint = type === 'sale' ? `/sales/${id}/invoice` : `/quotations/${id}/pdf`;
    const res = await api.get(endpoint, { responseType: 'blob' });
    pdfBlob = new Blob([res.data], { type: 'application/pdf' });
  } catch {
    try {
      const publicEndpoint = type === 'sale' ? `/public/sales/${id}/invoice` : `/public/quotations/${id}/pdf`;
      const res = await api.get(publicEndpoint, { responseType: 'blob' });
      pdfBlob = new Blob([res.data], { type: 'application/pdf' });
    } catch {
      // Both API calls failed. Fallback to just sharing the web link
      console.warn("PDF generation failed, falling back to text only share.");
    }
  }

  // Check if Web Share API with files is supported (mobile devices / tablets)
  if (pdfBlob) {
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
    const canShareFiles = typeof navigator !== 'undefined' && 
                          typeof navigator.canShare === 'function' && 
                          navigator.canShare({ files: [pdfFile] });

    if (canShareFiles) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `${type === 'sale' ? 'Invoice' : 'Quotation'} ${invoiceNumber}`,
          text: message
        });
        return { success: true, mode: 'web_share' };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User cancelled share
          return { success: false, mode: 'web_share', error: 'Share cancelled' };
        }
        // Fallback to desktop flow if share fails
      }
    }

    // PC / Desktop or fallback flow:
    // 1. Download PDF to computer
    downloadBlobAsFile(pdfBlob, filename);
  }

  // 2. Open WhatsApp directly to customer's number
  const waUrl = getDirectWhatsAppUrl(cleanPhone, message);
  window.open(waUrl, '_blank');

  return { 
    success: true, 
    mode: pdfBlob ? 'download_and_web' : 'web_only', 
    noPdf: !pdfBlob 
  };
};
