import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapEntityId } from '../utils/mapper';

const SubscriptionSchema = z.object({
  customerId: z.string(),
  planName: z.string(),
  billingInterval: z.enum(['MONTHLY', 'YEARLY']),
  amount: z.number().min(0),
  startDate: z.string().transform((str) => new Date(str)),
});

export const getSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(subscriptions.map(mapEntityId));
  } catch (error: any) {
    logger.error('Error fetching subscriptions', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = SubscriptionSchema.parse(req.body);
    
    // Calculate next billing date
    const nextBillingDate = new Date(data.startDate);
    if (data.billingInterval === 'MONTHLY') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    const sub = await prisma.subscription.create({
      data: {
        ...data,
        nextBillingDate
      }
    });

    res.status(201).json(mapEntityId(sub));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Error creating subscription', { error: error.message });
    res.status(400).json({ error: 'Error processing request' });
  }
};

export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const sub = await prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });
    res.json(mapEntityId(sub));
  } catch (error: any) {
    logger.error('Error cancelling subscription', { error: error.message });
    res.status(400).json({ error: 'Error processing request' });
  }
};
