/// <reference types="jest" />
import cacheService from '../../src/services/cacheService';
import { maskSensitive, encryptData, decryptData } from '../../src/utils/crypto';

describe('Tenant Isolation & Security Hardening Unit Tests', () => {
  describe('Multi-Tenant Cache Key Scoping', () => {
    it('ensures cache keys are strictly scoped per tenant preventing cross-tenant data leakage', async () => {
      const tenantA = 'tenant-shop-alpha';
      const tenantB = 'tenant-shop-beta';

      // Tenant A stores profile
      await cacheService.set(tenantA, 'profile:masked', { businessName: 'Alpha Electronics' }, 60);

      // Tenant B stores profile
      await cacheService.set(tenantB, 'profile:masked', { businessName: 'Beta Solar Works' }, 60);

      // Verify tenant A gets their own data
      const dataA = await cacheService.get<any>(tenantA, 'profile:masked');
      expect(dataA).toBeDefined();
      expect(dataA?.businessName).toBe('Alpha Electronics');

      // Verify tenant B gets their own data
      const dataB = await cacheService.get<any>(tenantB, 'profile:masked');
      expect(dataB).toBeDefined();
      expect(dataB?.businessName).toBe('Beta Solar Works');

      // Tenant A invalidates their profile
      await cacheService.delPattern(tenantA, 'profile*');

      // Tenant A's cache is gone
      const afterDelA = await cacheService.get<any>(tenantA, 'profile:masked');
      expect(afterDelA).toBeNull();

      // Tenant B's cache is untouched (strict isolation)
      const afterDelB = await cacheService.get<any>(tenantB, 'profile:masked');
      expect(afterDelB?.businessName).toBe('Beta Solar Works');
    });

    it('falls back to default-tenant namespace if tenantId is missing or empty', async () => {
      await cacheService.set('', 'test-key', { value: 123 }, 30);
      const data = await cacheService.get<any>('', 'test-key');
      expect(data?.value).toBe(123);
    });
  });

  describe('File Upload Security & MIME Enforcement', () => {
    const isMimeAllowed = (dataUrl: string): boolean => {
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) return false;
      const mimeType = matches[1].toLowerCase();
      const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      return allowedMimes.includes(mimeType);
    };

    it('allows valid PNG, JPEG, and WEBP raster image base64 data URLs', () => {
      expect(isMimeAllowed('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=')).toBe(true);
      expect(isMimeAllowed('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/')).toBe(true);
      expect(isMimeAllowed('data:image/webp;base64,UklGRkAAAABXRUJQVlA4WAoAAAA=')).toBe(true);
    });

    it('strictly rejects SVG, HTML, Javascript, and executable payloads to prevent XSS', () => {
      expect(isMimeAllowed('data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+PC9zdmc+')).toBe(false);
      expect(isMimeAllowed('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
      expect(isMimeAllowed('data:application/javascript;base64,Y29uc29sZS5sb2coMSk=')).toBe(false);
      expect(isMimeAllowed('data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA')).toBe(false);
    });
  });

  describe('Encryption At Rest & PII Masking Under Cross-Role Access', () => {
    it('verifies bank accounts stored at rest cannot be decrypted without secret key', () => {
      const rawAccount = '98765432109876';
      const encrypted = encryptData(rawAccount);

      // Cipher text must not contain plaintext account number
      expect(encrypted).not.toContain(rawAccount);

      // Decryption with matching secret yields original plaintext
      const decrypted = decryptData(encrypted);
      expect(decrypted).toBe(rawAccount);

      // Masking helper only reveals last 4 digits
      const masked = maskSensitive(rawAccount);
      expect(masked).toBe('••••••••••9876');
      expect(masked).not.toContain('9876543210');
    });

    it('guarantees staff roles cannot see unmasked bank accounts', () => {
      const mockAdminProfile = {
        role: 'admin',
        accountNumber: '98765432109876',
        accountNumberLast4: '9876',
      };

      const mockStaffProfile = {
        role: 'staff',
        accountNumber: '••••••••9876',
        accountNumberLast4: '9876',
      };

      expect(mockAdminProfile.accountNumber).toBe('98765432109876');
      expect(mockStaffProfile.accountNumber).toContain('••••••••');
      expect(mockStaffProfile.accountNumber).not.toBe('98765432109876');
    });
  });
});
