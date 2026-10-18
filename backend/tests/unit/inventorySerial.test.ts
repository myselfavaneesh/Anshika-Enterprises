/// <reference types="jest" />

import { updateSerial, deleteSerial } from '../../src/controllers/inventory';
import prisma from '../../src/prisma';

jest.mock('../../src/prisma', () => ({
  __esModule: true,
  default: {
    productUnit: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}));

describe('Inventory Serial Number Unit Tests', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { id: '36d8a763-cd76-4a55-9fe3-d71f80532175' },
      body: {},
      user: { role: 'admin' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('updateSerial', () => {
    it('successfully updates serial number and DEFECTIVE status', async () => {
      req.body = {
        serialNumber: 'SN-SOLAR-001',
        status: 'DEFECTIVE',
        purchasePrice: '1500.50'
      };

      (prisma.productUnit.findUnique as jest.Mock).mockResolvedValue({
        id: '36d8a763-cd76-4a55-9fe3-d71f80532175',
        serialNumber: 'SN-OLD-001',
        status: 'IN_STOCK'
      });

      (prisma.productUnit.update as jest.Mock).mockResolvedValue({
        id: '36d8a763-cd76-4a55-9fe3-d71f80532175',
        serialNumber: 'SN-SOLAR-001',
        status: 'DEFECTIVE',
        purchasePrice: 1500.50
      });

      await updateSerial(req, res);

      expect(prisma.productUnit.update).toHaveBeenCalledWith({
        where: { id: '36d8a763-cd76-4a55-9fe3-d71f80532175' },
        data: {
          serialNumber: 'SN-SOLAR-001',
          status: 'DEFECTIVE',
          purchasePrice: 1500.50
        }
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '36d8a763-cd76-4a55-9fe3-d71f80532175',
          status: 'DEFECTIVE',
          purchasePrice: 1500.50
        })
      );
    });

    it('shields purchasePrice when user is staff (Zero-Leak Staff Shielding)', async () => {
      req.user = { role: 'staff' };
      req.body = {
        serialNumber: 'SN-STAFF-EDIT',
        status: 'IN_STOCK',
        purchasePrice: '9999'
      };

      (prisma.productUnit.findUnique as jest.Mock).mockResolvedValue({
        id: '36d8a763-cd76-4a55-9fe3-d71f80532175',
        serialNumber: 'SN-OLD',
        status: 'IN_STOCK',
        purchasePrice: 2000
      });

      (prisma.productUnit.update as jest.Mock).mockResolvedValue({
        id: '36d8a763-cd76-4a55-9fe3-d71f80532175',
        serialNumber: 'SN-STAFF-EDIT',
        status: 'IN_STOCK',
        purchasePrice: 2000
      });

      await updateSerial(req, res);

      // Staff edit must NOT modify purchasePrice in update data
      expect(prisma.productUnit.update).toHaveBeenCalledWith({
        where: { id: '36d8a763-cd76-4a55-9fe3-d71f80532175' },
        data: {
          serialNumber: 'SN-STAFF-EDIT',
          status: 'IN_STOCK'
        }
      });

      // Response must NOT contain purchasePrice
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.purchasePrice).toBeUndefined();
    });

    it('rejects invalid status values with 400 validation error', async () => {
      req.body = {
        status: 'UNKNOWN_STATUS'
      };

      await updateSerial(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/invalid/i)
        })
      );
      expect(prisma.productUnit.update).not.toHaveBeenCalled();
    });

    it('returns 400 when serial number violates unique constraint (P2002)', async () => {
      req.body = {
        serialNumber: 'DUPLICATE-SN'
      };

      (prisma.productUnit.findUnique as jest.Mock).mockResolvedValue({
        id: '36d8a763-cd76-4a55-9fe3-d71f80532175'
      });

      const p2002Error: any = new Error('Unique constraint failed on serialNumber');
      p2002Error.code = 'P2002';
      (prisma.productUnit.update as jest.Mock).mockRejectedValue(p2002Error);

      await updateSerial(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'A product with this serial number already exists'
      });
    });

    it('returns 404 when serial record is not found', async () => {
      req.body = {
        serialNumber: 'SN-NONEXISTENT'
      };

      (prisma.productUnit.findUnique as jest.Mock).mockResolvedValue(null);

      await updateSerial(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Serial number record not found'
      });
    });
  });

  describe('deleteSerial', () => {
    it('blocks deletion of SOLD serial numbers with 400', async () => {
      (prisma.productUnit.findUnique as jest.Mock).mockResolvedValue({
        id: '36d8a763-cd76-4a55-9fe3-d71f80532175',
        status: 'SOLD'
      });

      await deleteSerial(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cannot delete a sold serial number'
      });
      expect(prisma.productUnit.delete).not.toHaveBeenCalled();
    });

    it('successfully deletes non-sold serial number', async () => {
      (prisma.productUnit.findUnique as jest.Mock).mockResolvedValue({
        id: '36d8a763-cd76-4a55-9fe3-d71f80532175',
        status: 'DEFECTIVE'
      });
      (prisma.productUnit.delete as jest.Mock).mockResolvedValue({});

      await deleteSerial(req, res);

      expect(prisma.productUnit.delete).toHaveBeenCalledWith({
        where: { id: '36d8a763-cd76-4a55-9fe3-d71f80532175' }
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Serial number deleted successfully'
      });
    });

    it('returns 404 when deleting a non-existent serial unit', async () => {
      (prisma.productUnit.findUnique as jest.Mock).mockResolvedValue(null);

      await deleteSerial(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Serial number record not found'
      });
    });
  });
});
