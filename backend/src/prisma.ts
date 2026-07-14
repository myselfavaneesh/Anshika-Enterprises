import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('query', (e) => {
  logger.debug(`Prisma Query: ${e.query}`, { params: e.params, duration: `${e.duration}ms` });
});

prisma.$on('error', (e) => {
  logger.error(`Prisma Error: ${e.message}`, { target: e.target });
});

prisma.$on('info', (e) => {
  logger.info(`Prisma Info: ${e.message}`);
});

prisma.$on('warn', (e) => {
  logger.warn(`Prisma Warn: ${e.message}`);
});

export default prisma;
