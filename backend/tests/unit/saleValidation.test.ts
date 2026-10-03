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

  describe('allowQuickInward flag for on-the-fly POS inventory inwarding', () => {
    it('defaults allowQuickInward to true when omitted', () => {
      const payload = {
        customerId: 'cust-123',
        items: [
          {
            productId: 'prod-battery-1',
            quantity: 1,
            unitPrice: 5000,
            taxableUnitPrice: 5000,
            taxableTotalPrice: 5000,
            totalPrice: 5000,
            wattage: 0,
            serialNumbers: ['EXIDE-TEST-12345'],
          },
        ],
        subtotal: 5000,
        taxableAmount: 5000,
        grandTotal: 5000,
      };

      const parsed = CreateSaleSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.allowQuickInward).toBe(true);
        expect(parsed.data.items[0].serialNumbers).toEqual(['EXIDE-TEST-12345']);
      }
    });

    it('preserves allowQuickInward when explicitly passed as false or true', () => {
      const basePayload = {
        customerId: 'cust-123',
        items: [
          {
            productId: 'prod-wire-1',
            quantity: 10,
            unitPrice: 50,
            taxableUnitPrice: 50,
            taxableTotalPrice: 500,
            totalPrice: 500,
            wattage: 0,
          },
        ],
        subtotal: 500,
        taxableAmount: 500,
        grandTotal: 500,
      };

      const parsedFalse = CreateSaleSchema.safeParse({ ...basePayload, allowQuickInward: false });
      expect(parsedFalse.success).toBe(true);
      if (parsedFalse.success) {
        expect(parsedFalse.data.allowQuickInward).toBe(false);
      }

      const parsedTrue = CreateSaleSchema.safeParse({ ...basePayload, allowQuickInward: true });
      expect(parsedTrue.success).toBe(true);
      if (parsedTrue.success) {
        expect(parsedTrue.data.allowQuickInward).toBe(true);
      }
    });

    it('accepts custom item.purchasePrice for inwarded serials or stock', () => {
      const payload = {
        customerId: 'cust-123',
        items: [
          {
            productId: 'prod-inverter-1',
            quantity: 1,
            unitPrice: 12000,
            purchasePrice: 9500,
            taxableUnitPrice: 12000,
            taxableTotalPrice: 12000,
            totalPrice: 12000,
            wattage: 0,
            serialNumbers: ['LUM-INV-9901'],
          },
        ],
        subtotal: 12000,
        taxableAmount: 12000,
        grandTotal: 12000,
      };

      const parsed = CreateSaleSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.items[0].purchasePrice).toBe(9500);
      }
    });
  });
});

