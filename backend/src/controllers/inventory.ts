import { Request, Response } from 'express';
import Product from '../models/Product';
import ProductUnit from '../models/ProductUnit';
import { InventoryService } from '../services/inventoryService';
import { logger } from '../utils/logger';

export const getInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const search = req.query.q as string;

    // Build aggregations to fetch products and count IN_STOCK units
    const matchQuery: any = {};
    if (search) {
      matchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const pipeline: any[] = [];
    if (search) {
      pipeline.push({ $match: matchQuery });
    }

    // Lookup category details
    pipeline.push({
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category'
      }
    });
    pipeline.push({ $unwind: { path: '$category', preserveNullAndEmptyArrays: true } });

    // Lookup units in stock to get count
    pipeline.push({
      $lookup: {
        from: 'productunits',
        let: { pId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [ { $eq: ['$productId', '$$pId'] }, { $eq: ['$status', 'IN_STOCK'] } ] } } }
        ],
        as: 'inStockUnits'
      }
    });

    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        sku: 1,
        lowStockThreshold: 1,
        categoryId: {
          _id: '$category._id',
          name: '$category.name'
        },
        quantity: { $size: '$inStockUnits' },
        updatedAt: 1
      }
    });

    // Handle pagination at database level if specified
    if (page && limit) {
      const skip = (page - 1) * limit;
      pipeline.push({
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      });

      const results = await Product.aggregate(pipeline);
      const data = results[0]?.data || [];
      const total = results[0]?.metadata[0]?.total || 0;

      const formatted = data.map((item: any) => ({
        _id: item._id,
        productId: {
          _id: item._id,
          name: item.name,
          sku: item.sku,
          lowStockThreshold: item.lowStockThreshold,
          categoryId: item.categoryId
        },
        quantity: item.quantity,
        updatedAt: item.updatedAt
      }));

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
      // Default: Return full list (maintaining legacy client-side compatibility)
      const data = await Product.aggregate(pipeline);
      const formatted = data.map((item: any) => ({
        _id: item._id,
        productId: {
          _id: item._id,
          name: item.name,
          sku: item.sku,
          lowStockThreshold: item.lowStockThreshold,
          categoryId: item.categoryId
        },
        quantity: item.quantity,
        updatedAt: item.updatedAt
      }));
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
    if (error.code === 11000) {
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

    const query: any = { productId };
    if (status) {
      query.status = status;
    }

    const serials = await ProductUnit.find(query).sort({ createdAt: -1 }).lean();
    res.json(serials);
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

    const serials = await ProductUnit.find({
      serialNumber: { $regex: q, $options: 'i' }
    }).populate('productId').populate('saleId').lean();

    res.json(serials);
  } catch (error: any) {
    logger.error('Error searching serials', { query: req.query.q, error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};
