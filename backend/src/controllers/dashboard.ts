import { Request, Response } from 'express';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

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

    const inStockUnits = await prisma.productUnit.findMany({
      where: { status: 'IN_STOCK' },
      include: { product: true }
    });
    const totalInventoryValue = inStockUnits.reduce((acc, unit) => acc + (unit.purchasePrice || 0), 0);

    const totalUnitsInStock = inStockCount;
    const totalUnitsSold = soldCount;

    // 3. Sales and Profit aggregation based on date range
    let dateFilter = {};
    let isFiltered = false;

    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      };
      isFiltered = true;
    } else if (startDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate as string)
        }
      };
      isFiltered = true;
    } else if (endDate) {
      dateFilter = {
        createdAt: {
          lte: new Date(endDate as string)
        }
      };
      isFiltered = true;
    } else {
      // Default to last 30 days if no filter provided so chart has data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter = {
        createdAt: { gte: thirtyDaysAgo }
      };
    }

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

    // Fetch filtered sales for profit and chart
    const filteredSalesQuery = await prisma.sale.findMany({
      where: dateFilter,
      include: { productUnits: true },
      orderBy: { createdAt: 'asc' }
    });

    let filteredTotalRevenue = 0;
    let filteredTotalProfit = 0;
    const chartDataMap = new Map();

    for (const sale of filteredSalesQuery) {
      // Use grandTotal for gross revenue and profit calculation to match purchasePrice (which is inclusive of GST)
      const revenue = sale.grandTotal || 0;
      filteredTotalRevenue += revenue;

      const cost = sale.productUnits.reduce((acc, unit) => acc + (unit.purchasePrice || 0), 0);
      const profit = revenue - cost;
      filteredTotalProfit += profit;

      const dateStr = sale.createdAt.toISOString().split('T')[0];
      if (!chartDataMap.has(dateStr)) {
        chartDataMap.set(dateStr, { date: dateStr, sales: 0, profit: 0 });
      }
      const dateData = chartDataMap.get(dateStr);
      dateData.sales += revenue;
      dateData.profit += profit;
    }

    const chartData = Array.from(chartDataMap.values());

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
      filteredRevenue: filteredTotalRevenue,
      filteredProfit: filteredTotalProfit,
      chartData,
      isFiltered,
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

