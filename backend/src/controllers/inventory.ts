import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { InventoryService } from '../services/inventoryService';
import { logger } from '../utils/logger';
import { mapEntityId } from '../utils/mapper';

const StockInSchema = z.object({
  productId: z.string(),
  purchaseInvoiceNumber: z.string().optional(),
  supplierName: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
  quantity: z.number().int().min(1).optional(),
  purchasePrice: z.number().min(0).optional(),
});

const StockOutSchema = z.object({
  productId: z.string(),
  serialNumbers: z.array(z.string()).optional(),
  quantity: z.number().int().min(1).optional(),
});

const UpdateSerialSchema = z.object({
  serialNumber: z.string().min(1).optional(),
  purchasePrice: z.number().min(0).optional(),
  status: z.enum(['IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED']).optional(),
});

export const getInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const search = req.query.q as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    const categoryId = req.query.categoryId as string;
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const status = req.query.status as string;

    let products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: { productUnits: { where: { status: 'IN_STOCK' } } }
        },
        inventories: true
      }
    });

    if (status === 'LOW') {
      products = products.filter(p => {
        const qty = p.trackSerials ? p._count.productUnits : (p.inventories?.quantity || 0);
        return qty <= p.lowStockThreshold && qty > 0;
      });
    } else if (status === 'OUT') {
      products = products.filter(p => {
        const qty = p.trackSerials ? p._count.productUnits : (p.inventories?.quantity || 0);
        return qty === 0;
      });
    }

    const total = products.length;

    if (page && limit) {
      const skip = (page - 1) * limit;
      products = products.slice(skip, skip + limit);
    }

    const formatted = products.map(item => ({
      _id: item.id,
      productId: {
        _id: item.id,
        name: item.name,
        sku: item.sku,
        lowStockThreshold: item.lowStockThreshold,
        trackSerials: item.trackSerials,
        categoryId: item.category ? mapEntityId(item.category) : null
      },
      quantity: item.trackSerials ? item._count.productUnits : (item.inventories?.quantity || 0),
      updatedAt: item.updatedAt
    }));

    if (page && limit) {
      res.json({
        data: formatted,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } else {
      res.json(formatted);
    }
  } catch (error: any) {
    logger.error('Error fetching inventory', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const stockIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, purchaseInvoiceNumber, supplierName, serialNumbers, quantity, purchasePrice } = StockInSchema.parse(req.body);
    
    // We pass both serialNumbers and quantity to service. It handles validation.
    await InventoryService.stockIn({
      productId,
      purchaseInvoiceNumber,
      supplierName,
      serialNumbers,
      quantity: quantity ? Number(quantity) : undefined,
      purchasePrice
    });

    res.status(201).json({ message: 'Stock added successfully' });
  } catch (error: any) {
    logger.error('Error stocking in', { productId: req.body.productId, error: error.message });
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'One or more serial numbers already exist' });
    } else {
      res.status(500).json({ error: 'Server error stocking in' });
    }
  }
};

export const stockOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, serialNumbers, quantity } = StockOutSchema.parse(req.body);

    await InventoryService.stockOut(productId, {
      serialNumbers,
      quantity: quantity ? Number(quantity) : undefined
    });
    res.json({ message: 'Stock removed successfully' });
  } catch (error: any) {
    logger.error('Error stocking out', { productId: req.body.productId, error: error.message });
    res.status(400).json({ error: 'Error removing stock' });
  }
};

export const getSerials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { status } = req.query;

    const where: any = { productId };
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const serials = await prisma.productUnit.findMany({
      where,
      include: {
        saleItem: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(mapEntityId(serials));
  } catch (error: any) {
    logger.error('Error fetching serials', { productId: req.params.productId, error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const searchSerials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter q is required' });
      return;
    }

    const serials = await prisma.productUnit.findMany({
      where: {
        serialNumber: { contains: q, mode: 'insensitive' }
      },
      include: {
        product: true,
        sale: true
      }
    });

    const mappedSerials = serials.map(s => {
      const { product, sale, ...rest } = s as any;
      return mapEntityId({ ...rest, productId: product, saleId: sale });
    });

    res.json(mappedSerials);
  } catch (error: any) {
    logger.error('Error searching serials', { query: req.query.q, error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateSerial = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { serialNumber, purchasePrice, status } = UpdateSerialSchema.parse(req.body);

    const updated = await prisma.productUnit.update({
      where: { id },
      data: {
        serialNumber,
        purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : undefined,
        status
      }
    });

    res.json(mapEntityId(updated));
  } catch (error: any) {
    logger.error('Error updating serial', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Server error updating serial number' });
  }
};

export const deleteSerial = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const unit = await prisma.productUnit.findUnique({ where: { id } });
    if (!unit) {
      res.status(404).json({ error: 'Serial not found' });
      return;
    }
    
    if (unit.status === 'SOLD') {
      res.status(400).json({ error: 'Cannot delete a sold serial number' });
      return;
    }

    await prisma.productUnit.delete({
      where: { id }
    });

    res.json({ message: 'Serial number deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting serial', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Server error deleting serial number' });
  }
};
