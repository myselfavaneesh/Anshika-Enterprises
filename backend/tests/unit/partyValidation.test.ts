/// <reference types="jest" />

import { CustomerSchema, SupplierSchema } from '../../src/validators';

describe('Party (Customer & Supplier) Validation Unit Tests', () => {
  describe('CustomerSchema', () => {
    it('validates a standard customer payload successfully', () => {
      const payload = {
        name: 'Avaneesh Enterprises',
        phone: '9876543210',
        email: 'avaneesh@example.com',
        address: '123 Market Road',
        gstNumber: '09AAAAA0000A1Z5',
        state: 'Uttar Pradesh',
        stateCode: '09',
        group: 'Wholesale',
        creditLimit: 50000,
        outstandingBalance: 12000
      };

      const result = CustomerSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Avaneesh Enterprises');
        expect(result.data.creditLimit).toBe(50000);
        expect(result.data.outstandingBalance).toBe(12000);
      }
    });

    it('safely coerces empty string creditLimit to null (fixing 400 Bad Request)', () => {
      const payload = {
        name: 'Rahul Kumar',
        phone: '9876543211',
        email: '',
        address: '',
        gstNumber: '',
        creditLimit: '', // Form input empty string
        outstandingBalance: 0
      };

      const result = CustomerSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.creditLimit).toBeNull();
        expect(result.data.email).toBeNull();
        expect(result.data.address).toBeNull();
        expect(result.data.gstNumber).toBeNull();
      }
    });

    it('coerces string number creditLimit to number', () => {
      const payload = {
        name: 'Suresh Electric',
        creditLimit: '25000'
      };

      const result = CustomerSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.creditLimit).toBe(25000);
      }
    });

    it('rejects negative creditLimit', () => {
      const payload = {
        name: 'Invalid Credit',
        creditLimit: -500
      };

      const result = CustomerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('defaults outstandingBalance to 0 when omitted or empty', () => {
      const payload = {
        name: 'Vikram Solar',
        outstandingBalance: ''
      };

      const result = CustomerSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outstandingBalance).toBe(0);
      }
    });

    it('accepts negative outstandingBalance (advance payment credit balance)', () => {
      const payload = {
        name: 'Advance Customer',
        outstandingBalance: -2500
      };

      const result = CustomerSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outstandingBalance).toBe(-2500);
      }
    });

    it('rejects empty customer name', () => {
      const payload = {
        name: '   ',
        phone: '9876543210'
      };

      const result = CustomerSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Customer name is required');
      }
    });

    it('rejects invalid email format when non-empty', () => {
      const payload = {
        name: 'Customer With Bad Email',
        email: 'not-an-email'
      };

      const result = CustomerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('SupplierSchema', () => {
    it('validates a standard supplier payload successfully', () => {
      const payload = {
        name: 'Luminous Power Tech',
        phone: '0112345678',
        email: 'orders@luminous.com',
        creditLimit: '',
        outstandingBalance: 0
      };

      const result = SupplierSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Luminous Power Tech');
        expect(result.data.creditLimit).toBeNull();
      }
    });

    it('coerces string numbers and trims whitespace', () => {
      const payload = {
        name: '  Exide Battery Distributors  ',
        phone: '  9876543210  ',
        gstNumber: '  09bbbbb0000b1z5  ',
        creditLimit: '100000'
      };

      const result = SupplierSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Exide Battery Distributors');
        expect(result.data.phone).toBe('9876543210');
        expect(result.data.gstNumber).toBe('09BBBBB0000B1Z5');
        expect(result.data.creditLimit).toBe(100000);
      }
    });
  });
});
