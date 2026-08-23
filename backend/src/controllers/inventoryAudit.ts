import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const getAudits = async (req: Request, res: Response) => {
  try {
    const audits = await prisma.inventoryAudit.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        warehouse: true,
        items: {
          include: { product: true }
        }
      }
    });
    res.json(audits);
  } catch (error: any) {
    logger.error('Error fetching audits:', error);
    res.status(500).json({ error: 'Failed to fetch inventory audits' });
  }
};

export const createAudit = async (req: Request, res: Response) => {
  try {
    const { warehouseId, conductedBy, items } = req.body;

    if (!warehouseId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Warehouse and items are required' });
    }

    const audit = await prisma.inventoryAudit.create({
      data: {
        warehouseId,
        conductedBy,
        status: 'COMPLETED',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            expectedQty: Number(item.expectedQty),
            actualQty: Number(item.actualQty),
            discrepancy: Number(item.actualQty) - Number(item.expectedQty),
            notes: item.notes
          }))
        }
      },
      include: {
        warehouse: true,
        items: true
      }
    });

    res.status(201).json(audit);
  } catch (error: any) {
    logger.error('Error creating audit:', error);
    res.status(500).json({ error: 'Failed to create inventory audit' });
  }
};
