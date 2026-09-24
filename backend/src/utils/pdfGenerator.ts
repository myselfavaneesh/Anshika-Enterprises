// Re-export for backward compatibility
// Canonical implementation is now located in services/invoice
export {
  getTemplateHTML,
  getInvoiceHTML,
  getQuotationHTML,
  generateInvoicePDF,
  generateQuotationPDF,
} from '../services/invoice';
