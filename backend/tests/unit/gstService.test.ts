import { calculateLineTax, allocateComboItems, calculateInvoiceTotals } from '../../src/services/gstService';

describe('GST Calculation Service (Unit Tests)', () => {
  describe('calculateLineTax', () => {
    it('calculates intra-state GST (50% CGST + 50% SGST) for tax-inclusive price', () => {
      const result = calculateLineTax({
        unitPrice: 1000,
        quantity: 1,
        gstRate: 18,
        isGstInclusive: true,
        placeOfSupplyCode: '09', // UP
        supplierStateCode: '09', // UP
      });

      // 1000 / 1.18 = 847.46 taxable, 152.54 tax
      expect(result.taxableUnitPrice).toBe(847.46);
      expect(result.taxableTotalPrice).toBe(847.46);
      expect(result.taxAmount).toBe(152.54);
      expect(result.cgstAmount).toBe(76.27);
      expect(result.sgstAmount).toBe(76.27);
      expect(result.igstAmount).toBe(0);
      expect(result.totalPrice).toBe(1000);
    });

    it('calculates inter-state GST (100% IGST) for tax-exclusive price', () => {
      const result = calculateLineTax({
        unitPrice: 1000,
        quantity: 2,
        gstRate: 18,
        isGstInclusive: false,
        placeOfSupplyCode: '07', // Delhi
        supplierStateCode: '09', // UP
      });

      // 2000 taxable, 18% = 360 IGST, total = 2360
      expect(result.taxableUnitPrice).toBe(1000);
      expect(result.taxableTotalPrice).toBe(2000);
      expect(result.taxAmount).toBe(360);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.igstAmount).toBe(360);
      expect(result.totalPrice).toBe(2360);
    });

    it('returns zero tax for non-GST items', () => {
      const result = calculateLineTax({
        unitPrice: 500,
        quantity: 3,
        gstRate: 18,
        isGstInclusive: true,
        isNonGst: true,
      });

      expect(result.taxRate).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.igstAmount).toBe(0);
      expect(result.taxableTotalPrice).toBe(1500);
      expect(result.totalPrice).toBe(1500);
    });

    it('returns zero tax for GST Composition Scheme (Bill of Supply)', () => {
      const result = calculateLineTax({
        unitPrice: 1500,
        quantity: 2,
        gstRate: 18, // Even if product has GST rate in catalog
        isGstInclusive: true,
        isComposition: true, // Composition dealer cannot collect GST
        placeOfSupplyCode: '09',
      });

      expect(result.taxRate).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.igstAmount).toBe(0);
      expect(result.taxableTotalPrice).toBe(3000);
      expect(result.totalPrice).toBe(3000);
    });
  });

  describe('allocateComboItems', () => {
    it('allocates fixed package price across items proportionally by catalog value', () => {
      const items = [
        { productId: 'p1', quantity: 1, catalogPrice: 6000, gstRate: 18 },
        { productId: 'p2', quantity: 1, catalogPrice: 4000, gstRate: 18 },
      ];

      // Combo discounted price is 8000 (instead of 10000 catalog sum)
      const allocated = allocateComboItems(8000, true, items, '09');

      expect(allocated.length).toBe(2);
      // P1 gets 60% of 8000 = 4800
      expect(allocated[0].totalPrice).toBe(4800);
      // P2 gets 40% of 8000 = 3200
      expect(allocated[1].totalPrice).toBe(3200);
      // Sum of allocated equals package price
      expect(allocated[0].totalPrice + allocated[1].totalPrice).toBe(8000);
    });
  });

  describe('calculateInvoiceTotals', () => {
    it('correctly aggregates taxable, tax, discount, and round-off', () => {
      const items = [
        { taxableTotalPrice: 847.46, cgstAmount: 76.27, sgstAmount: 76.27, igstAmount: 0, totalPrice: 1000 },
      ];

      const totals = calculateInvoiceTotals(items, 50);

      // raw: 847.46 + 152.54 - 50 = 950
      expect(totals.taxableAmount).toBe(847.46);
      expect(totals.taxAmount).toBe(152.54);
      expect(totals.discount).toBe(50);
      expect(totals.grandTotal).toBe(950);
      expect(totals.roundOff).toBe(0);
    });
  });
});
