import { Request, Response } from 'express';
import Product from '../models/Product';
import ProductUnit from '../models/ProductUnit';
import Sale from '../models/Sale';
import { logger } from '../utils/logger';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Total Products
    const totalProducts = await Product.countDocuments();

    // 2. Aggregate statistics from ProductUnits in a single pipeline
    const unitStats = await ProductUnit.aggregate([
      {
        $facet: {
          inStock: [
            { $match: { status: 'IN_STOCK' } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalValue: { $sum: { $ifNull: ['$purchasePrice', 0] } }
              }
            }
          ],
          sold: [
            { $match: { status: 'SOLD' } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const totalUnitsInStock = unitStats[0]?.inStock[0]?.count || 0;
    const totalInventoryValue = unitStats[0]?.inStock[0]?.totalValue || 0;
    const totalUnitsSold = unitStats[0]?.sold[0]?.count || 0;

    // 3. Sales aggregation
    const salesStats = await Sale.aggregate([
      {
        $facet: {
          todaySales: [
            { $match: { createdAt: { $gte: today } } },
            { $group: { _id: null, gross: { $sum: '$grandTotal' }, taxable: { $sum: '$taxableAmount' } } }
          ],
          monthlySales: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, gross: { $sum: '$grandTotal' }, taxable: { $sum: '$taxableAmount' } } }
          ],
          allSales: [
            { $group: { _id: null, gross: { $sum: '$grandTotal' }, taxable: { $sum: '$taxableAmount' } } }
          ],
          recent: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'customers',
                localField: 'customerId',
                foreignField: '_id',
                as: 'customer'
              }
            },
            { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
          ]
        }
      }
    ]);

    const todaysGrossSales = salesStats[0]?.todaySales[0]?.gross || 0;
    const monthlyGrossSales = salesStats[0]?.monthlySales[0]?.gross || 0;
    const totalGrossSales = salesStats[0]?.allSales[0]?.gross || 0;
    const totalTaxableSales = salesStats[0]?.allSales[0]?.taxable || 0;
    const recentSales = salesStats[0]?.recent || [];

    // 4. Low stock products aggregation (joining product and unit status)
    const lowStockProducts = await Product.aggregate([
      {
        $lookup: {
          from: 'productunits',
          let: { pId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$productId', '$$pId'] }, { $eq: ['$status', 'IN_STOCK'] } ] } } }
          ],
          as: 'units'
        }
      },
      {
        $project: {
          product: {
            _id: '$_id',
            name: '$name',
            sku: '$sku',
            lowStockThreshold: '$lowStockThreshold'
          },
          currentStock: { $size: '$units' }
        }
      },
      {
        $match: {
          $expr: {
            $lte: ['$currentStock', { $ifNull: ['$product.lowStockThreshold', 5] }]
          }
        }
      }
    ]);

    res.json({
      totalProducts,
      totalUnitsInStock,
      totalUnitsSold,
      totalInventoryValue,
      totalSales: totalGrossSales,
      totalTaxableSales,
      todaysSales: todaysGrossSales,
      monthlySales: monthlyGrossSales,
      lowStockProducts,
      recentSales: recentSales.map((sale: any) => ({
        ...sale,
        customerId: sale.customer
      }))
    });
  } catch (error: any) {
    logger.error('Error fetching dashboard stats via aggregate pipelines', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error fetching dashboard stats' });
  }
};
