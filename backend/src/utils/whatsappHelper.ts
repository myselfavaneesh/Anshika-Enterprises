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
 * Formats a clean, high-conversion WhatsApp message for a sale invoice.
 */
export const formatWhatsAppSaleMessage = (sale: any, companyInfo?: any): string => {
  const compName = companyInfo?.businessName || 'Anshika Enterprises';
  const customerName = sale.customerId?.name || sale.customerName || 'Customer';
  const isBillOfSupply = sale.documentType === 'BILL_OF_SUPPLY' || sale.invoiceType === 'COMPOSITION';
  const docType = isBillOfSupply ? 'Bill of Supply' : (sale.invoiceType === 'NON_GST' ? 'Estimate' : 'Tax Invoice');
  const invoiceNum = sale.invoiceNumber || 'INV';
  const grandTotal = Number(sale.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const paidAmount = Number(sale.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const balance = Number(sale.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const items = sale.items || [];
  let itemsSummary = '';
  if (items.length > 0) {
    const slice = items.slice(0, 5);
    itemsSummary = slice.map((it: any) => {
      const name = it.product?.name || it.productName || it.name || 'Item';
      const qty = it.quantity || 1;
      const price = Number(it.taxableTotalPrice || it.totalPrice || 0).toFixed(0);
      return `• ${name} (${qty}) - ₹${price}`;
    }).join('\n');
  }

  const viewUrl = `/sales/${sale._id || sale.id}/print`;

  let msg = `*${compName.toUpperCase()}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Namaste *${customerName}* ji,\n\n`;
  msg += `Aapka ${docType} *${invoiceNum}* generate ho gaya hai.\n\n`;
  
  if (itemsSummary) {
    msg += `*Items Kharide:*\n${itemsSummary}\n\n`;
  }

  msg += `💰 *Kul Raqam (Total):* ₹${grandTotal}\n`;
  msg += `💳 *Bhugtan Kiya (Paid):* ₹${paidAmount}\n`;
  if (Number(sale.balanceAmount) > 0) {
    msg += `⚠️ *Baqaya Rashi (Due):* ₹${balance}\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📄 *Full PDF Invoice Dekhein / Download Karein:*\n${viewUrl}\n\n`;
  msg += `Humse judne ke liye bahut-bahut Dhanyawad! 🙏`;

  return msg;
};
