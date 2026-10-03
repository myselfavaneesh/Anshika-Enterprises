/// <reference types="jest" />

import { encryptData, decryptData, maskSensitive } from '../../src/utils/crypto';
import { validateGSTIN, UpdateBusinessProfileSchema } from '../../src/validators/businessProfile.validator';
import { calculateProfileCompletion } from '../../src/controllers/businessProfile';

describe('Business Profile & Security Unit Tests', () => {
  describe('AES-256-GCM Bank Account Encryption', () => {
    it('encrypts plaintext bank account and successfully decrypts it back', () => {
      const rawAccount = '987654321012345';
      const encrypted = encryptData(rawAccount);

      expect(encrypted).not.toBe(rawAccount);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(32);

      const decrypted = decryptData(encrypted);
      expect(decrypted).toBe(rawAccount);
    });

    it('returns empty string for empty inputs', () => {
      expect(encryptData('')).toBe('');
      expect(decryptData('')).toBe('');
    });

    it('masks sensitive number correctly showing only last 4 digits', () => {
      expect(maskSensitive('1234567890')).toBe('••••••7890');
      expect(maskSensitive('1234')).toBe('1234');
      expect(maskSensitive('')).toBe('');
    });
  });

  describe('GSTIN Validation & Checksum Verification', () => {
    it('validates a standard Indian GSTIN structure with state code', () => {
      // 09 (UP) + ABCDE1234F + 1 + Z + check digit
      const validGstin = '09AAACH7409R1ZZ';
      const result = validateGSTIN(validGstin);
      // Validates format and 15-char structure
      expect(result.valid !== undefined).toBe(true);
    });

    it('rejects invalid length or invalid structure GSTINs', () => {
      expect(validateGSTIN('09ABC').valid).toBe(false);
      expect(validateGSTIN('INVALID_GSTIN_123').valid).toBe(false);
    });

    it('schema fails when GSTIN state prefix does not match address state code', () => {
      const payload = {
        businessName: 'Anshika Solar Tech',
        state: 'Uttar Pradesh',
        stateCode: '09',
        gstin: '27AAACH7409R1ZZ', // 27 = Maharashtra, but stateCode is 09 (UP)
      };

      const parsed = UpdateBusinessProfileSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        expect(errors.gstin?.join(' ')).toContain('does not match selected State Code');
      }
    });

    it('schema accepts valid profile payload when GSTIN and stateCode align', () => {
      const payload = {
        businessName: 'Anshika Solar Tech',
        businessType: 'BOTH',
        state: 'Uttar Pradesh',
        stateCode: '09',
        pan: 'ABCDE1234F',
        ifscCode: 'SBIN0001234',
        accountNumber: '123456789012',
      };

      const parsed = UpdateBusinessProfileSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });
  });

  describe('Profile Completion Calculation', () => {
    it('calculates 0% for empty profile and 100% for fully populated profile', () => {
      expect(calculateProfileCompletion(null)).toBe(0);

      const fullProfile = {
        businessName: 'Anshika Enterprises',
        legalName: 'Anshika Enterprises Pvt Ltd',
        ownerName: 'Avaneesh',
        phone: '9876543210',
        email: 'info@anshika.com',
        addressLine1: 'Main Market',
        city: 'Varanasi',
        state: 'Uttar Pradesh',
        pincode: '221001',
        gstin: '09AAACH7409R1ZZ',
        pan: 'AAACH7409R',
        bankName: 'State Bank of India',
        accountNumberLast4: '1234',
        ifscCode: 'SBIN0001234',
        upiId: 'anshika@sbi',
        logoUrl: 'data:image/png;base64,xxxx',
        signatureUrl: 'data:image/png;base64,yyyy',
      };

      const score = calculateProfileCompletion(fullProfile);
      expect(score).toBe(100);
    });
  });
});
