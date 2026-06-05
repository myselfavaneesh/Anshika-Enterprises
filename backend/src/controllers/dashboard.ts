import { Request, Response } from 'express';
import Product from '../models/Product';
import ProductUnit from '../models/ProductUnit';
import Sale from '../models/Sale';
import { logger } from '../utils/logger';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalProducts = await Product.countDocuments();
    
    const products = await Product.find();
    const stockCounts = await ProductUnit.aggregate([
      { $match: { status: 'IN_STOCK' } },
      { $group: { 
          _id: '$productId', 
          count: { $sum: 1 },
          totalValue: { $sum: { $ifNull: ['$purchasePrice', 0] } }
      } }
    ]);

    const stockMap = new Map();
    let totalInventoryValue = 0;

    stockCounts.forEach(item => {
      stockMap.set(item._id.toString(), item.count);
      totalInventoryValue += item.totalValue;
    });

    const lowStockProducts: any[] = [];

    products.forEach(product => {
      const quantity = stockMap.get(product._id.toString()) || 0;
      // We consider low stock if quantity is <= threshold AND it's greater than 0, or just <= threshold
      // Typically, out of stock (0) is also low stock.
      if (quantity <= (product.lowStockThreshold || 5)) {
        lowStockProducts.push({
          product,
          currentStock: quantity
        });
      }
    });

    const sales = await Sale.find();
    const totalGrossSales = sales.reduce((sum, sale) => sum + sale.grandTotal, 0);
    const totalTaxableSales = sales.reduce((sum, sale) => sum + (sale.taxableAmount || sale.grandTotal - sale.taxAmount), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysSalesRecords = await Sale.find({ createdAt: { $gte: today } });
    const todaysGrossSales = todaysSalesRecords.reduce((sum, sale) => sum + sale.grandTotal, 0);

    const recentSales = await Sale.find().populate('customerId').sort({ createdAt: -1 }).limit(5);

    res.json({
      totalProducts,
      totalInventoryValue,
      totalSales: totalGrossSales,
      totalTaxableSales,
      todaysSales: todaysGrossSales,
      lowStockProducts,
      recentSales
    });
  } catch (error: any) {
    logger.error('Error fetching dashboard stats', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error fetching dashboard stats' });
  }
};
