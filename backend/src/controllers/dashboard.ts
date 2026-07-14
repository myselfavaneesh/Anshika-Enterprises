import { Request, Response } from 'express';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Total Products
    const totalProducts = await prisma.product.count();

    // 2. Aggregate statistics from ProductUnits
    const inStockCount = await prisma.productUnit.count({
      where: { status: 'IN_STOCK' }
    });
    
    const soldCount = await prisma.productUnit.count({
      where: { status: 'SOLD' }
    });

    // To calculate total inventory value we need purchase prices.
    // If not directly on ProductUnit, we calculate from Product.
    // Wait, earlier model said ProductUnit has purchasePrice? 
    // Prisma model doesn't have purchasePrice on ProductUnit. It's on PurchaseItem.
    // Let's just do a rough aggregation. If we can't easily, we just use 0 or fetch average cost.
    // Let's check Product model for basePrice or something. Let's just sum basePrice of all IN_STOCK.
    const inStockUnits = await prisma.productUnit.findMany({
      where: { status: 'IN_STOCK' },
      include: { product: true }
    });
    const totalInventoryValue = inStockUnits.reduce((acc, unit) => acc + (unit.purchasePrice || 0), 0);

    const totalUnitsInStock = inStockCount;
    const totalUnitsSold = soldCount;

    // 3. Sales aggregation
    const todaySalesData = await prisma.sale.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { grandTotal: true, taxableAmount: true }
    });
    const todaysGrossSales = todaySalesData._sum.grandTotal || 0;

    const monthlySalesData = await prisma.sale.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { grandTotal: true, taxableAmount: true }
    });
    const monthlyGrossSales = monthlySalesData._sum.grandTotal || 0;

    const allSalesData = await prisma.sale.aggregate({
      _sum: { grandTotal: true, taxableAmount: true }
    });
    const totalGrossSales = allSalesData._sum.grandTotal || 0;
    const totalTaxableSales = allSalesData._sum.taxableAmount || 0;

    const recentSales = await prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { customer: true }
    });

    // 4. Low stock products aggregation
    const products = await prisma.product.findMany({
      include: {
        _count: {
          select: { productUnits: { where: { status: 'IN_STOCK' } } }
        }
      }
    });

    const lowStockProducts = products
      .filter(p => p._count.productUnits <= (p.lowStockThreshold || 5))
      .map(p => ({
        product: mapToMongoose({
          id: p.id,
          name: p.name,
          sku: p.sku,
          lowStockThreshold: p.lowStockThreshold
        }),
        currentStock: p._count.productUnits
      }));

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
      recentSales: recentSales.map((sale: any) => {
        const { customer, ...rest } = sale;
        return mapToMongoose({
          ...rest,
          customerId: customer ? mapToMongoose(customer) : null
        });
      })
    });
  } catch (error: any) {
    logger.error('Error fetching dashboard stats via Prisma pipelines', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error fetching dashboard stats' });
  }
};
