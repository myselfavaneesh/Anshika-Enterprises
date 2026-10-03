/// <reference types="jest" />

import { forbidRole } from '../../src/middleware/auth';
import { ROLE_PRESETS } from '../../src/controllers/staff';

describe('Staff Role & Profit Restriction Unit Tests', () => {
  describe('forbidRole Middleware', () => {
    it('blocks staff role with 403 Forbidden', () => {
      const middleware = forbidRole('staff');
      const req: any = { user: { id: 'staff-1', role: 'staff', permissions: [] } };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Access denied') })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('allows admin and manager roles through to next()', () => {
      const middleware = forbidRole('staff');
      const next = jest.fn();

      ['admin', 'manager'].forEach((role) => {
        const req: any = { user: { id: `${role}-1`, role, permissions: [] } };
        const res: any = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };

        middleware(req, res, next);
      });

      expect(next).toHaveBeenCalledTimes(2);
    });

    it('returns 401 if request has no authenticated user', () => {
      const middleware = forbidRole('staff');
      const req: any = {};
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('ROLE_PRESETS Permission Verification', () => {
    it('ensures staff preset never contains financial or sensitive permissions', () => {
      const staffPerms = ROLE_PRESETS.staff;

      // Staff must NOT have reports, purchases, or expenses visibility by default
      expect(staffPerms).not.toContain('reports:view');
      expect(staffPerms).not.toContain('purchases:view');
      expect(staffPerms).not.toContain('expenses:view');
      expect(staffPerms).not.toContain('staff:view');
      expect(staffPerms).not.toContain('products:create');
      expect(staffPerms).not.toContain('products:edit');
    });

    it('ensures staff only has operational duties: sales, quotations, product/stock viewing', () => {
      const staffPerms = ROLE_PRESETS.staff;

      expect(staffPerms).toContain('dashboard:view');
      expect(staffPerms).toContain('sales:view');
      expect(staffPerms).toContain('sales:create');
      expect(staffPerms).toContain('quotations:view');
      expect(staffPerms).toContain('quotations:create');
      expect(staffPerms).toContain('products:view');
      expect(staffPerms).toContain('inventory:view');
      expect(staffPerms).toContain('categories:view');
    });
  });
});
