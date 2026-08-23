import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// ------------------------------------------------------------------
// WAREHOUSES
// ------------------------------------------------------------------

export const getWarehouses = async (req: Request, res: Response) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { productUnits: { where: { status: 'IN_STOCK' } } }
        }
      }
    });
    res.json(warehouses);
  } catch (error: any) {
    logger.error('Error fetching warehouses:', error);
    res.status(500).json({ error: 'Failed to fetch warehouses' });
  }
};

export const createWarehouse = async (req: Request, res: Response) => {
  try {
    const { name, location, isActive } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Warehouse name is required' });
    }

    const exists = await prisma.warehouse.findUnique({ where: { name } });
    if (exists) {
      return res.status(400).json({ error: 'Warehouse with this name already exists' });
    }

    const warehouse = await prisma.warehouse.create({
      data: { name, location, isActive }
    });

    res.status(201).json(warehouse);
  } catch (error: any) {
    logger.error('Error creating warehouse:', error);
    res.status(500).json({ error: 'Failed to create warehouse' });
  }
};

export const updateWarehouse = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, location, isActive } = req.body;

    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    // Check name collision
    if (name && name !== existing.name) {
      const nameTaken = await prisma.warehouse.findUnique({ where: { name } });
      if (nameTaken) {
        return res.status(400).json({ error: 'Warehouse name already in use' });
      }
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: { name, location, isActive }
    });

    res.json(warehouse);
  } catch (error: any) {
    logger.error('Error updating warehouse:', error);
    res.status(500).json({ error: 'Failed to update warehouse' });
  }
};

export const deleteWarehouse = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const count = await prisma.productUnit.count({ where: { warehouseId: id } });
    if (count > 0) {
      return res.status(400).json({ error: 'Cannot delete warehouse with existing stock' });
    }

    await prisma.warehouse.delete({ where: { id } });
    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting warehouse:', error);
    res.status(500).json({ error: 'Failed to delete warehouse' });
  }
};

// ------------------------------------------------------------------
// STOCK TRANSFERS
// ------------------------------------------------------------------

export const getStockTransfers = async (req: Request, res: Response) => {
  try {
    const transfers = await prisma.stockTransfer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        _count: { select: { items: true } }
      }
    });
    res.json(transfers);
  } catch (error: any) {
    logger.error('Error fetching stock transfers:', error);
    res.status(500).json({ error: 'Failed to fetch stock transfers' });
  }
};

export const createStockTransfer = async (req: Request, res: Response) => {
  try {
    const { fromWarehouseId, toWarehouseId, productUnitIds, notes } = req.body;

    if (!fromWarehouseId || !toWarehouseId || !productUnitIds || productUnitIds.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (fromWarehouseId === toWarehouseId) {
      return res.status(400).json({ error: 'Source and destination warehouse cannot be the same' });
    }

    // Verify units are available in the source warehouse
    const units = await prisma.productUnit.findMany({
      where: { id: { in: productUnitIds } }
    });

    for (const unit of units) {
      if (unit.warehouseId !== fromWarehouseId) {
        return res.status(400).json({ error: `Unit ${unit.serialNumber} is not in the source warehouse` });
      }
      if (unit.status !== 'IN_STOCK') {
        return res.status(400).json({ error: `Unit ${unit.serialNumber} is not available in stock` });
      }
    }

    // Create transfer record and update unit locations atomically
    const transferNumber = `TRF-${Date.now()}`;
    
    const result = await prisma.$transaction(async (tx) => {
      // Create transfer
      const transfer = await tx.stockTransfer.create({
        data: {
          transferNumber,
          fromWarehouseId,
          toWarehouseId,
          status: 'COMPLETED',
          notes,
          items: {
            create: productUnitIds.map((id: string) => ({ productUnitId: id }))
          }
        }
      });

      // Update unit locations
      await tx.productUnit.updateMany({
        where: { id: { in: productUnitIds } },
        data: { warehouseId: toWarehouseId }
      });

      return transfer;
    });

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Error creating stock transfer:', error);
    res.status(500).json({ error: 'Failed to create stock transfer' });
  }
};
