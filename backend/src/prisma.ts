import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

const prisma = new PrismaClient({
  log: isProduction
    ? [{ emit: 'event', level: 'error' }]
    : [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
});

if (!isProduction) {
  prisma.$on('query', (e) => {
    logger.debug(`Prisma Query: ${e.query}`, { duration: `${e.duration}ms` });
  });

  prisma.$on('info', (e) => {
    logger.info(`Prisma Info: ${e.message}`);
  });

  prisma.$on('warn', (e) => {
    logger.warn(`Prisma Warn: ${e.message}`);
  });
}

prisma.$on('error', (e) => {
  logger.error(`Prisma Error: ${e.message}`, { target: e.target });
});

export default prisma;

