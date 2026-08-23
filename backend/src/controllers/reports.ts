import { Request, Response } from 'express';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { calculateSaleProfit } from './sale';

// Helper for date ranges
const getDateRange = (startDate?: string, endDate?: string) => {
  const filter: any = {};
  if (startDate) {
    filter.gte = new Date(startDate);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }
  return Object.keys(filter).length > 0 ? { createdAt: filter } : {};
};

export const getGSTSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = getDateRange(startDate as string, endDate as string);

    const sales = await prisma.sale.findMany({
      where: dateFilter,
      select: {
        grandTotal: true,
        taxableAmount: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        customer: { select: { gstin: true } }
      }
    });

    let b2bSales = 0;
    let b2cSales = 0;
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    sales.forEach(sale => {
      totalTaxable += sale.taxableAmount || 0;
      totalCGST += sale.cgstAmount || 0;
      totalSGST += sale.sgstAmount || 0;
      totalIGST += sale.igstAmount || 0;
      
      if (sale.customer?.gstin) {
        b2bSales += sale.grandTotal;
      } else {
        b2cSales += sale.grandTotal;
      }
    });

    res.json({
      totalTaxable,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTax: totalCGST + totalSGST + totalIGST,
      b2bSales,
      b2cSales,
      totalSales: b2bSales + b2cSales
    });
  } catch (error: any) {
    logger.error('Error fetching GST summary', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getProfitAndLoss = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = getDateRange(startDate as string, endDate as string);
    const expenseDateFilter = Object.keys(dateFilter).length > 0 ? { date: dateFilter.createdAt } : {};

    const sales = await prisma.sale.findMany({
      where: dateFilter,
      include: {
        productUnits: true,
        saleItems: { include: { product: true } }
      }
    });

    let totalRevenue = 0;
    let totalCOGS = 0; // Cost of Goods Sold
    let grossProfit = 0;

    sales.forEach(sale => {
      totalRevenue += sale.grandTotal || 0;
      const profit = calculateSaleProfit(sale);
      grossProfit += profit;
      totalCOGS += ((sale.grandTotal || 0) - profit);
    });

    const expenses = await prisma.expense.findMany({
      where: expenseDateFilter,
      include: { category: true }
    });

    let totalExpenses = 0;
    const expenseBreakdown = new Map<string, number>();

    expenses.forEach(exp => {
      totalExpenses += exp.amount;
      const catName = exp.category?.name || 'Uncategorized';
      expenseBreakdown.set(catName, (expenseBreakdown.get(catName) || 0) + exp.amount);
    });

    const netProfit = grossProfit - totalExpenses;

    res.json({
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
      expenseBreakdown: Array.from(expenseBreakdown.entries()).map(([name, amount]) => ({ name, amount }))
    });
  } catch (error: any) {
    logger.error('Error fetching P&L', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSalesByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = getDateRange(startDate as string, endDate as string);

    const saleItems = await prisma.saleItem.findMany({
      where: { sale: dateFilter },
      include: { product: { include: { category: true } } }
    });

    const categoryStats = new Map();

    saleItems.forEach(item => {
      const catId = item.product?.category?.id || 'unassigned';
      const catName = item.product?.category?.name || 'Unassigned';
      const revenue = item.totalPrice;
      const quantity = item.quantity;

      if (!categoryStats.has(catId)) {
        categoryStats.set(catId, { id: catId, name: catName, revenue: 0, quantity: 0 });
      }
      const stat = categoryStats.get(catId);
      stat.revenue += revenue;
      stat.quantity += quantity;
    });

    const result = Array.from(categoryStats.values()).sort((a, b) => b.revenue - a.revenue);
    res.json(result);
  } catch (error: any) {
    logger.error('Error fetching sales by category', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSalesByProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = getDateRange(startDate as string, endDate as string);

    const saleItems = await prisma.saleItem.findMany({
      where: { sale: dateFilter },
      include: { product: true }
    });

    const productStats = new Map();

    saleItems.forEach(item => {
      const productId = item.product?.id || 'unknown';
      const productName = item.product?.name || 'Unknown';
      const sku = item.product?.sku || 'N/A';
      const revenue = item.totalPrice;
      const quantity = item.quantity;

      if (!productStats.has(productId)) {
        productStats.set(productId, { id: productId, name: productName, sku, revenue: 0, quantity: 0 });
      }
      const stat = productStats.get(productId);
      stat.revenue += revenue;
      stat.quantity += quantity;
    });

    const result = Array.from(productStats.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 50);
    res.json(result);
  } catch (error: any) {
    logger.error('Error fetching sales by product', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSalesByCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = getDateRange(startDate as string, endDate as string);

    const sales = await prisma.sale.findMany({
      where: dateFilter,
      include: { customer: true }
    });

    const customerStats = new Map();

    sales.forEach(sale => {
      const customerId = sale.customer?.id || 'walk-in';
      const customerName = sale.customer?.name || 'Walk-in Customer';
      const revenue = sale.grandTotal || 0;

      if (!customerStats.has(customerId)) {
        customerStats.set(customerId, { id: customerId, name: customerName, revenue: 0, orderCount: 0 });
      }
      const stat = customerStats.get(customerId);
      stat.revenue += revenue;
      stat.orderCount += 1;
    });

    const result = Array.from(customerStats.values()).sort((a, b) => b.revenue - a.revenue);
    res.json(result);
  } catch (error: any) {
    logger.error('Error fetching sales by customer', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getPurchasesBySupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = getDateRange(startDate as string, endDate as string);

    const purchases = await prisma.purchase.findMany({
      where: dateFilter,
      include: { supplier: true }
    });

    const supplierStats = new Map();

    purchases.forEach(purchase => {
      const supplierId = purchase.supplier?.id || 'unknown';
      const supplierName = purchase.supplier?.name || 'Unknown Supplier';
      const total = purchase.grandTotal || 0;

      if (!supplierStats.has(supplierId)) {
        supplierStats.set(supplierId, { id: supplierId, name: supplierName, spend: 0, orderCount: 0 });
      }
      const stat = supplierStats.get(supplierId);
      stat.spend += total;
      stat.orderCount += 1;
    });

    const result = Array.from(supplierStats.values()).sort((a, b) => b.spend - a.spend);
    res.json(result);
  } catch (error: any) {
    logger.error('Error fetching purchases by supplier', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSalesRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = getDateRange(startDate as string, endDate as string);

    const sales = await prisma.sale.findMany({
      where: dateFilter,
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    const register = sales.map(sale => ({
      date: sale.createdAt,
      invoiceNumber: sale.invoiceNumber,
      customerName: sale.customer?.name || 'Walk-in',
      gstin: sale.customer?.gstin || '',
      paymentMode: sale.paymentMode || 'CASH',
      taxableAmount: sale.taxableAmount || 0,
      cgst: sale.cgstAmount || 0,
      sgst: sale.sgstAmount || 0,
      igst: sale.igstAmount || 0,
      discount: sale.discountAmount || 0,
      roundOff: sale.roundOff || 0,
      grandTotal: sale.grandTotal || 0
    }));

    res.json(register);
  } catch (error: any) {
    logger.error('Error fetching sales register', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getInventoryValuation = async (req: Request, res: Response): Promise<void> => {
  try {
    const productUnits = await prisma.productUnit.findMany({
      where: { status: 'IN_STOCK' },
      include: { product: true }
    });

    let totalValuation = 0;
    const valuationByProduct = new Map();

    productUnits.forEach(unit => {
      const productId = unit.productId;
      const price = unit.purchasePrice || unit.product?.purchasePrice || 0;
      totalValuation += price;

      if (!valuationByProduct.has(productId)) {
        valuationByProduct.set(productId, {
          productId,
          productName: unit.product?.name,
          sku: unit.product?.sku,
          quantity: 0,
          totalValue: 0
        });
      }

      const stat = valuationByProduct.get(productId);
      stat.quantity += 1;
      stat.totalValue += price;
    });

    res.json({
      totalValuation,
      valuationBreakdown: Array.from(valuationByProduct.values())
    });
  } catch (error: any) {
    logger.error('Error fetching inventory valuation', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getStockAging = async (req: Request, res: Response): Promise<void> => {
  try {
    const productUnits = await prisma.productUnit.findMany({
      where: { status: 'IN_STOCK' },
      include: { product: true }
    });

    const now = new Date();
    
    // Bins: 0-30 days, 31-60 days, 61-90 days, 90+ days
    const agingBins = {
      '0_30': { label: '0 - 30 days', count: 0, value: 0, items: [] as any[] },
      '31_60': { label: '31 - 60 days', count: 0, value: 0, items: [] as any[] },
      '61_90': { label: '61 - 90 days', count: 0, value: 0, items: [] as any[] },
      '90_plus': { label: '90+ days', count: 0, value: 0, items: [] as any[] }
    };

    productUnits.forEach(unit => {
      const daysOld = Math.floor((now.getTime() - new Date(unit.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const value = unit.purchasePrice || unit.product?.purchasePrice || 0;

      let bin = '0_30';
      if (daysOld > 90) bin = '90_plus';
      else if (daysOld > 60) bin = '61_90';
      else if (daysOld > 30) bin = '31_60';

      (agingBins as any)[bin].count += 1;
      (agingBins as any)[bin].value += value;
      
      // Optional: push item details if we want drill-down
      // (agingBins as any)[bin].items.push({ serialNumber: unit.serialNumber, daysOld, value });
    });

    res.json(agingBins);
  } catch (error: any) {
    logger.error('Error fetching stock aging', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getPartyProfitability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = getDateRange(startDate as string, endDate as string);

    const sales = await prisma.sale.findMany({
      where: dateFilter,
      include: {
        customer: true,
        productUnits: true,
        saleItems: { include: { product: true } }
      }
    });

    const partyStats = new Map();

    sales.forEach(sale => {
      const customerId = sale.customer?.id || 'walk-in';
      const customerName = sale.customer?.name || 'Walk-in Customer';
      const phone = sale.customer?.phone || 'N/A';
      const group = sale.customer?.group || 'N/A';
      const revenue = sale.grandTotal || 0;
      const profit = calculateSaleProfit(sale);

      if (!partyStats.has(customerId)) {
        partyStats.set(customerId, { 
          id: customerId, 
          name: customerName, 
          phone,
          group,
          revenue: 0, 
          profit: 0,
          orderCount: 0 
        });
      }
      
      const stat = partyStats.get(customerId);
      stat.revenue += revenue;
      stat.profit += profit;
      stat.orderCount += 1;
    });

    const result = Array.from(partyStats.values()).sort((a, b) => b.profit - a.profit);
    res.json(result);
  } catch (error: any) {
    logger.error('Error fetching party profitability', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};
