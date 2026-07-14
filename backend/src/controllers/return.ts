import { Request, Response } from 'express';
import { z } from 'zod';
import { ReturnService } from '../services/returnService';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

const ProcessReturnSchema = z.object({
  saleId: z.string().min(1),
  serialNumber: z.string().min(1),
  refundAmount: z.number().min(0),
  notes: z.string().optional(),
});

export const processReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = ProcessReturnSchema.parse(req.body);

    const saleReturn = await ReturnService.processReturn(
      validatedData.saleId,
      validatedData.serialNumber,
      validatedData.refundAmount,
      validatedData.notes
    );

    res.status(201).json(mapToMongoose(saleReturn));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    logger.error('Error processing return', { error: error.message });
    res.status(400).json({ error: error.message || 'Error processing return' });
  }
};
