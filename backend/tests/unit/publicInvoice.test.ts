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
    it('formats a professional WhatsApp message with totals and invoice link', () => {
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
      expect(msg).toContain('/sales/sale-123/print');
      expect(msg).toContain('Exide Inverter 1100VA');
    });
  });
});
