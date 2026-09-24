import prisma from '../../prisma';
import { logger } from '../../utils/logger';

export async function processSessionCleanupJob(): Promise<void> {
  logger.info('[Worker:SessionCleanup] Starting expired session cleanup...');

  try {
    const result = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    if (result.count > 0) {
      logger.info(`[Worker:SessionCleanup] Successfully cleaned up ${result.count} expired sessions.`);
    } else {
      logger.info('[Worker:SessionCleanup] No expired sessions found.');
    }
  } catch (error: any) {
    logger.error('[Worker:SessionCleanup] Error cleaning up expired sessions:', {
      error: error.message,
    });
    throw error;
  }
}
