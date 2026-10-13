import { normalizeWhatsAppPhone, formatWhatsAppSaleMessage } from '../../src/utils/whatsappHelper';

describe('WhatsApp Direct Sharing & Phone Normalization Unit Tests', () => {
  describe('normalizeWhatsAppPhone', () => {
    it('normalizes a standard 10-digit Indian mobile number with 91 prefix', () => {
      expect(normalizeWhatsAppPhone('9876543210')).toBe('919876543210');
    });

    it('strips leading 0 and prefixes 91', () => {
      expect(normalizeWhatsAppPhone('09876543210')).toBe('919876543210');
    });

    it('preserves existing 91 prefix without duplicating', () => {
      expect(normalizeWhatsAppPhone('919876543210')).toBe('919876543210');
    });

    it('cleans formatted phone numbers with spaces, plus signs and dashes', () => {
      expect(normalizeWhatsAppPhone('+91 98765-43210')).toBe('919876543210');
      expect(normalizeWhatsAppPhone('+91 (987) 654-3210')).toBe('919876543210');
    });

    it('returns empty string for empty or null inputs', () => {
      expect(normalizeWhatsAppPhone('')).toBe('');
      expect(normalizeWhatsAppPhone(null as any)).toBe('');
    });
  });

  describe('formatWhatsAppSaleMessage', () => {
    it('formats a professional WhatsApp message with totals and items', () => {
      const mockSale = {
        _id: 'sale-123',
        invoiceNumber: 'INV-2026-0099',
        documentType: 'TAX_INVOICE',
        invoiceType: 'GST',
        customerId: { name: 'Ramesh Verma', phone: '9876543210' },
        grandTotal: 15400,
        paidAmount: 15400,
        balanceAmount: 0,
        items: [
          { product: { name: 'Exide Inverter 1100VA' }, quantity: 1, totalPrice: 15400 }
        ]
      };

      const msg = formatWhatsAppSaleMessage(mockSale, { businessName: 'Anshika Enterprises' });

      expect(msg).toContain('ANSHIKA ENTERPRISES');
      expect(msg).toContain('INV-2026-0099');
      expect(msg).toContain('Ramesh Verma');
      expect(msg).toContain('15,400.00');
      expect(msg).toContain('Exide Inverter 1100VA');
      expect(msg).not.toContain('/print');
    });

    it('highlights Old Battery Scrap payment trade-in when present in sale payments', () => {
      const mockSaleWithScrap = {
        _id: 'sale-456',
        invoiceNumber: 'INV-2026-0105',
        documentType: 'BILL_OF_SUPPLY',
        invoiceType: 'COMPOSITION',
        customerId: { name: 'Suresh Kumar', phone: '9876543210' },
        grandTotal: 14000,
        paidAmount: 14000,
        balanceAmount: 0,
        payments: [
          { paymentMode: 'SCRAP', amount: 2000, referenceNumber: 'Exide 150Ah Old Battery' },
          { paymentMode: 'CASH', amount: 12000 }
        ],
        items: [
          { product: { name: 'Luminous 150Ah Battery' }, quantity: 1, totalPrice: 14000 }
        ]
      };

      const msg = formatWhatsAppSaleMessage(mockSaleWithScrap, { businessName: 'Anshika Enterprises' });

      expect(msg).toContain('Old Battery Scrap');
      expect(msg).toContain('2,000.00');
      expect(msg).toContain('Exide 150Ah Old Battery');
      expect(msg).toContain('14,000.00');
    });
  });

  describe('formatPaymentMode and PDF Payment Breakdown', () => {
    it('properly formats SCRAP and other payment modes', () => {
      const { formatPaymentMode } = require('../../src/services/invoice/pdfGenerator');
      expect(formatPaymentMode('SCRAP')).toBe('Scrap (Old Battery)');
      expect(formatPaymentMode('CASH')).toBe('Cash');
      expect(formatPaymentMode('UPI')).toBe('UPI');
      expect(formatPaymentMode('BANK')).toBe('Bank Transfer');
    });

    it('renders payment breakdown with Scrap in PDF template HTML', () => {
      const { getTemplateHTML } = require('../../src/services/invoice/pdfGenerator');
      const mockSale = {
        invoiceNumber: 'INV-2026-9999',
        documentType: 'TAX_INVOICE',
        invoiceType: 'GST',
        grandTotal: 15000,
        payments: [
          { paymentMode: 'SCRAP', amount: 3000, referenceNumber: 'Old Amaron 150Ah' },
          { paymentMode: 'CASH', amount: 12000 }
        ]
      };

      const html = getTemplateHTML('TAX INVOICE', mockSale, [], { name: 'Sunil Kumar' }, { businessName: 'Anshika Enterprises' });
      expect(html).toContain('Payment Breakdown');
      expect(html).toContain('Scrap (Old Battery)');
      expect(html).toContain('3000.00');
      expect(html).toContain('Old Amaron 150Ah');
      expect(html).toContain('Amount Paid');
    });
  });
});
