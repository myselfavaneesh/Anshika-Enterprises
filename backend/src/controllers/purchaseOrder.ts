import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const getPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        poItems: {
          include: { product: true }
        }
      }
    });
    res.json(pos);
  } catch (error: any) {
    logger.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
};

export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { supplierId, expectedDate, notes, items } = req.body;

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Supplier and items are required' });
    }

    // Calculate grand total
    const grandTotal = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0);
    const poNumber = `PO-${Date.now()}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes,
        grandTotal,
        poItems: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.quantity) * Number(item.unitPrice)
          }))
        }
      },
      include: {
        supplier: true,
        poItems: { include: { product: true } }
      }
    });

    res.status(201).json(po);
  } catch (error: any) {
    logger.error('Error creating PO:', error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
};

export const updatePurchaseOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // DRAFT, SENT, CANCELLED

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: { status }
    });

    res.json(po);
  } catch (error: any) {
    logger.error('Error updating PO status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};
