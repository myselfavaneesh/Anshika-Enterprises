import { Request, Response } from 'express';
import prisma from '../prisma';
import { InventoryService } from '../services/inventoryService';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

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

    const status = req.query.status as string;

    let products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: { productUnits: { where: { status: 'IN_STOCK' } } }
        }
      }
    });

    if (status === 'LOW') {
      products = products.filter(p => p._count.productUnits <= p.lowStockThreshold && p._count.productUnits > 0);
    } else if (status === 'OUT') {
      products = products.filter(p => p._count.productUnits === 0);
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
        categoryId: item.category ? mapToMongoose(item.category) : null
      },
      quantity: item._count.productUnits,
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
    const { productId, purchaseInvoiceNumber, supplierName, serialNumbers, purchasePrice } = req.body;
    
    if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      res.status(400).json({ error: 'serialNumbers array is required' });
      return;
    }

    await InventoryService.stockIn({
      productId,
      purchaseInvoiceNumber,
      supplierName,
      serialNumbers,
      purchasePrice
    });

    res.status(201).json({ message: 'Stock added successfully' });
  } catch (error: any) {
    logger.error('Error stocking in', { productId: req.body.productId, error: error.message });
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'One or more serial numbers already exist' });
    } else {
      res.status(500).json({ error: error.message || 'Server error stocking in' });
    }
  }
};

export const stockOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, serialNumbers } = req.body;

    if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      res.status(400).json({ error: 'serialNumbers array is required' });
      return;
    }

    await InventoryService.stockOut(productId, serialNumbers);
    res.json({ message: 'Stock removed successfully' });
  } catch (error: any) {
    logger.error('Error stocking out', { productId: req.body.productId, error: error.message });
    res.status(400).json({ error: error.message });
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
      orderBy: { createdAt: 'desc' }
    });
    res.json(mapToMongoose(serials));
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
      return mapToMongoose({ ...rest, productId: product, saleId: sale });
    });

    res.json(mappedSerials);
  } catch (error: any) {
    logger.error('Error searching serials', { query: req.query.q, error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};
