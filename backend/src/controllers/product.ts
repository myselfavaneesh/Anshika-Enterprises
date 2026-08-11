import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

const ProductSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(50),
  lowStockThreshold: z.number().int().min(0).default(5),
  hsnCode: z.string().max(20).optional().nullable(),
  gstRate: z.number().min(0).max(100).default(0),
  purchasePrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  isGstInclusive: z.boolean().default(true),
  wattage: z.number().min(0).default(0),
  trackSerials: z.boolean().default(true),
});

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const ALLOWED_SORT_FIELDS = ['createdAt', 'name', 'sku', 'sellingPrice', 'purchasePrice', 'updatedAt'] as const;
    type SortField = typeof ALLOWED_SORT_FIELDS[number];
    const sortInput = req.query.sort as string;
    const sort: SortField = ALLOWED_SORT_FIELDS.includes(sortInput as SortField)
      ? (sortInput as SortField)
      : 'createdAt';
    const order = (req.query.order as string) === 'desc' ? 'desc' : 'asc';

    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    const total = await prisma.product.count({ where });
    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { [sort]: order },
      skip,
      take: limit,
    });

    const mappedProducts = products.map(p => {
      const { category, ...rest } = p as any;
      return mapToMongoose({ ...rest, categoryId: category });
    });

    res.json({
      data: mappedProducts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching products', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, name, sku, lowStockThreshold, hsnCode, gstRate, purchasePrice, sellingPrice, isGstInclusive, wattage, trackSerials } = ProductSchema.parse(req.body);
    
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      res.status(400).json({ error: 'SKU already exists' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        categoryId,
        name,
        sku,
        lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : 5,
        hsnCode,
        gstRate: gstRate !== undefined ? Number(gstRate) : 0,
        purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : 0,
        sellingPrice: sellingPrice !== undefined ? Number(sellingPrice) : 0,
        isGstInclusive: isGstInclusive !== undefined ? Boolean(isGstInclusive) : true,
        wattage: wattage !== undefined ? Number(wattage) : 0,
        trackSerials: trackSerials !== undefined ? Boolean(trackSerials) : true,
      }
    });

    logger.info('Product created successfully', { productId: product.id, name, sku });
    res.status(201).json(mapToMongoose(product));
  } catch (error: any) {
    logger.error('Error creating product', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { categoryId, name, sku, lowStockThreshold, hsnCode, gstRate, purchasePrice, sellingPrice, isGstInclusive, wattage, trackSerials } = ProductSchema.parse(req.body);
    
    try {
      const product = await prisma.product.update({
        where: { id: id as string },
        data: {
          categoryId,
          name,
          sku,
          ...(lowStockThreshold !== undefined && { lowStockThreshold: Number(lowStockThreshold) }),
          hsnCode,
          ...(gstRate !== undefined && { gstRate: Number(gstRate) }),
          ...(purchasePrice !== undefined && { purchasePrice: Number(purchasePrice) }),
          ...(sellingPrice !== undefined && { sellingPrice: Number(sellingPrice) }),
          ...(isGstInclusive !== undefined && { isGstInclusive: Boolean(isGstInclusive) }),
          ...(wattage !== undefined && { wattage: Number(wattage) }),
          ...(trackSerials !== undefined && { trackSerials: Boolean(trackSerials) }),
        }
      });
      logger.info('Product updated successfully', { productId: id });
      res.json(mapToMongoose(product));
    } catch (e: any) {
      if (e.code === 'P2025') {
        res.status(404).json({ error: 'Product not found' });
      } else {
        throw e;
      }
    }
  } catch (error: any) {
    logger.error('Error updating product', { productId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    try {
      await prisma.$transaction([
        prisma.inventoryTransaction.deleteMany({ where: { productId: id as string } }),
        prisma.inventory.deleteMany({ where: { productId: id as string } }),
        prisma.productUnit.deleteMany({ where: { productId: id as string } }),
        prisma.purchaseItem.deleteMany({ where: { productId: id as string } }),
        prisma.quotationItem.deleteMany({ where: { productId: id as string } }),
        prisma.saleItem.deleteMany({ where: { productId: id as string } }),
        prisma.product.delete({ where: { id: id as string } })
      ]);
      logger.info('Product deleted successfully', { productId: id });
      res.json({ message: 'Product deleted' });
    } catch (e: any) {
      if (e.code === 'P2025') {
        res.status(404).json({ error: 'Product not found' });
      } else {
        throw e;
      }
    }
  } catch (error: any) {
    logger.error('Error deleting product', { productId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};
