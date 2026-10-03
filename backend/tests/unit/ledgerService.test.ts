/// <reference types="jest" />

import {
  computeCustomerRunningBalances,
  computeSupplierRunningBalances,
  CustomerLedgerEntry,
  SupplierLedgerEntry,
} from '../../src/services/ledgerService';

describe('Khata Ledger Service (Unit Tests)', () => {
  describe('Customer Running Balance Calculation', () => {
    it('accurately maintains running balance through sales and payments without floating point errors', () => {
      const entries: CustomerLedgerEntry[] = [
        {
          _id: 'sale-1',
          date: new Date('2026-09-01T10:00:00Z'),
          type: 'SALE',
          invoiceNumber: 'INV/26-27/0001',
          grandTotal: 10000.50,
        },
        {
          _id: 'pay-1',
          date: new Date('2026-09-02T12:00:00Z'),
          type: 'PAYMENT',
          paymentType: 'MONEY_IN',
          amount: 6000.25,
        },
        {
          _id: 'sale-2',
          date: new Date('2026-09-03T15:00:00Z'),
          type: 'SALE',
          invoiceNumber: 'INV/26-27/0002',
          grandTotal: 4500.00,
        },
        {
          _id: 'pay-2',
          date: new Date('2026-09-04T11:00:00Z'),
          type: 'PAYMENT',
          paymentType: 'MONEY_OUT', // Refund issued to customer
          amount: 500.00,
        },
      ];

      const result = computeCustomerRunningBalances(entries);

      // Step 1: Sale 10000.50 -> owes 10000.50
      expect(result[0].runningBalance).toBe(10000.50);

      // Step 2: Payment in 6000.25 -> owes 4000.25
      expect(result[1].runningBalance).toBe(4000.25);

      // Step 3: Sale 4500.00 -> owes 8500.25
      expect(result[2].runningBalance).toBe(8500.25);

      // Step 4: Refund 500.00 -> owes 9000.25
      expect(result[3].runningBalance).toBe(9000.25);
    });

    it('correctly sorts entries chronologically before computing running balance', () => {
      const unorderedEntries: CustomerLedgerEntry[] = [
        {
          _id: 'pay-1',
          date: new Date('2026-09-05T10:00:00Z'),
          type: 'PAYMENT',
          paymentType: 'MONEY_IN',
          amount: 2000,
        },
        {
          _id: 'sale-1',
          date: new Date('2026-09-01T10:00:00Z'),
          type: 'SALE',
          invoiceNumber: 'INV/26-27/0001',
          grandTotal: 5000,
        },
      ];

      const result = computeCustomerRunningBalances(unorderedEntries);

      // Sale should come first because date is earlier
      expect(result[0]._id).toBe('sale-1');
      expect(result[0].runningBalance).toBe(5000);

      // Payment comes second
      expect(result[1]._id).toBe('pay-1');
      expect(result[1].runningBalance).toBe(3000);
    });
  });

  describe('Supplier Running Balance Calculation', () => {
    it('accurately maintains running balance through purchases and supplier payouts', () => {
      const entries: SupplierLedgerEntry[] = [
        {
          _id: 'pur-1',
          date: new Date('2026-09-01T10:00:00Z'),
          type: 'PURCHASE',
          invoiceNumber: 'PUR-001',
          grandTotal: 25000,
        },
        {
          _id: 'pay-1',
          date: new Date('2026-09-02T10:00:00Z'),
          type: 'PAYMENT',
          paymentType: 'MONEY_OUT', // We paid supplier
          amount: 15000,
        },
        {
          _id: 'pay-2',
          date: new Date('2026-09-03T10:00:00Z'),
          type: 'PAYMENT',
          paymentType: 'MONEY_IN', // Supplier refunded us
          amount: 2000,
        },
      ];

      const result = computeSupplierRunningBalances(entries);

      // Step 1: Purchase 25000 -> we owe 25000
      expect(result[0].runningBalance).toBe(25000);

      // Step 2: Paid 15000 -> we owe 10000
      expect(result[1].runningBalance).toBe(10000);

      // Step 3: Supplier refund 2000 -> we owe 12000
      expect(result[2].runningBalance).toBe(12000);
    });
  });
});
