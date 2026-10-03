import { CreateSaleSchema } from '../../src/validators/sale.validator';

describe('Sale Zod Validation & Composition Scheme (Unit Tests)', () => {
  it('validates a valid Composition Bill of Supply payload', () => {
    const payload = {
      customerId: 'cust-123',
      invoiceType: 'COMPOSITION',
      documentType: 'BILL_OF_SUPPLY',
      items: [
        {
          productId: 'prod-1',
          quantity: 2,
          unitPrice: 1500,
          taxableUnitPrice: 1500,
          taxableTotalPrice: 3000,
          totalPrice: 3000,
          gstRate: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          wattage: 0,
        },
      ],
      subtotal: 3000,
      discount: 0,
      taxableAmount: 3000,
      taxRate: 0,
      taxAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      roundOff: 0,
      grandTotal: 3000,
      payments: [
        {
          paymentMode: 'CASH',
          amount: 3000,
        },
      ],
    };

    const parsed = CreateSaleSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.invoiceType).toBe('COMPOSITION');
      expect(parsed.data.documentType).toBe('BILL_OF_SUPPLY');
      expect(parsed.data.taxAmount).toBe(0);
    }
  });

  it('defaults to COMPOSITION when invoiceType is omitted', () => {
    const payload = {
      customerId: 'cust-123',
      items: [
        {
          productId: 'prod-1',
          quantity: 1,
          unitPrice: 1000,
          taxableUnitPrice: 1000,
          taxableTotalPrice: 1000,
          totalPrice: 1000,
          wattage: 0,
        },
      ],
      subtotal: 1000,
      taxableAmount: 1000,
      grandTotal: 1000,
    };

    const parsed = CreateSaleSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.invoiceType).toBe('COMPOSITION');
    }
  });

  it('rejects an invalid invoiceType', () => {
    const payload = {
      customerId: 'cust-123',
      invoiceType: 'INVALID_TYPE',
      items: [
        {
          productId: 'prod-1',
          quantity: 1,
          unitPrice: 1000,
          taxableUnitPrice: 1000,
          taxableTotalPrice: 1000,
          totalPrice: 1000,
          wattage: 0,
        },
      ],
      subtotal: 1000,
      taxableAmount: 1000,
      grandTotal: 1000,
    };

    const parsed = CreateSaleSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it('rejects empty items array', () => {
    const payload = {
      customerId: 'cust-123',
      invoiceType: 'COMPOSITION',
      items: [],
      subtotal: 0,
      taxableAmount: 0,
      grandTotal: 0,
    };

    const parsed = CreateSaleSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});
