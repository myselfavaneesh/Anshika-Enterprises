import cron from 'node-cron';
import { registerJobQueue, dispatchJob, closeJobQueues } from './queue';
import { processLowStockAlertJob } from './workers/lowStockAlert.job';
import { processSubscriptionBillingJob } from './workers/subscriptionBilling.job';
import { processSessionCleanupJob } from './workers/sessionCleanup.job';
import { logger } from '../utils/logger';

export const QUEUES = {
  LOW_STOCK: 'low-stock-alert',
  SUBSCRIPTION: 'subscription-billing',
  SESSION_CLEANUP: 'session-cleanup',
} as const;

/**
 * Initializes BullMQ queues and workers, and wires recurring cron dispatchers.
 */
export function initJobs(): void {
  logger.info('[JobQueue] Initializing job queues and workers...');

  // 1. Register Queue Workers
  registerJobQueue(QUEUES.LOW_STOCK, processLowStockAlertJob);
  registerJobQueue(QUEUES.SUBSCRIPTION, processSubscriptionBillingJob);
  registerJobQueue(QUEUES.SESSION_CLEANUP, processSessionCleanupJob);

  // 2. Schedule cron triggers to dispatch jobs through queue
  // Low-stock alert everyday at 09:00 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('[Scheduler] Triggering low-stock alert job...');
    await triggerLowStockAlert();
  });

  // Subscription billing check everyday at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    logger.info('[Scheduler] Triggering subscription billing check...');
    await triggerSubscriptionBilling();
  });

  // Session cleanup every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('[Scheduler] Triggering session cleanup job...');
    await triggerSessionCleanup();
  });

  logger.info('[JobQueue] Job queues and schedulers successfully initialized.');
}

export async function triggerLowStockAlert(): Promise<void> {
  await dispatchJob(QUEUES.LOW_STOCK, 'check-low-stock', {});
}

export async function triggerSubscriptionBilling(): Promise<void> {
  await dispatchJob(QUEUES.SUBSCRIPTION, 'check-subscriptions', {});
}

export async function triggerSessionCleanup(): Promise<void> {
  await dispatchJob(QUEUES.SESSION_CLEANUP, 'purge-expired-sessions', {});
}

export async function shutdownJobs(): Promise<void> {
  await closeJobQueues();
}

export * from './queue';
