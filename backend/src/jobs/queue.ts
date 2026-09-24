import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL;
let redisClient: IORedis | null = null;
let isRedisAvailable = false;

// Initialize Redis only if configured
if (redisUrl) {
  try {
    redisClient = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('[JobQueue] Redis connection failed after 3 attempts; falling back to in-memory async runner.');
          return null; // Stop retrying
        }
        return Math.min(times * 1000, 3000);
      },
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      logger.info('[JobQueue] Connected to Redis for BullMQ background jobs.');
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      logger.warn('[JobQueue] Redis connection error (using in-memory fallback):', { error: err.message });
    });

    // Initiate connection asynchronously
    redisClient.connect().catch((err) => {
      isRedisAvailable = false;
      logger.warn('[JobQueue] Redis connection refused; background tasks will run via async in-memory runner.');
    });
  } catch (err: any) {
    isRedisAvailable = false;
    logger.warn('[JobQueue] Failed to initialize Redis client:', { error: err.message });
  }
} else {
  logger.info('[JobQueue] REDIS_URL not configured; background jobs will run via async in-memory runner.');
}

export type JobHandler<T = any> = (data: T) => Promise<void>;

const registeredQueues: Map<string, Queue> = new Map();
const registeredWorkers: Map<string, Worker> = new Map();
const inMemoryHandlers: Map<string, JobHandler> = new Map();

/**
 * Registers a BullMQ queue and worker, or an in-memory async handler if Redis is not active.
 */
export function registerJobQueue<T = any>(
  queueName: string,
  handler: JobHandler<T>
) {
  inMemoryHandlers.set(queueName, handler);

  if (redisClient && redisUrl) {
    try {
      const queue = new Queue(queueName, {
        connection: redisClient,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      });

      const worker = new Worker(
        queueName,
        async (job: Job) => {
          logger.info(`[JobQueue] Executing BullMQ job ${job.name} (ID: ${job.id}) on queue "${queueName}"`);
          await handler(job.data);
        },
        { connection: redisClient }
      );

      worker.on('completed', (job) => {
        logger.info(`[JobQueue] Completed job ${job.name} (ID: ${job.id})`);
      });

      worker.on('failed', (job, err) => {
        logger.error(`[JobQueue] Failed job ${job?.name} (ID: ${job?.id}):`, { error: err.message });
      });

      registeredQueues.set(queueName, queue);
      registeredWorkers.set(queueName, worker);
    } catch (err: any) {
      logger.warn(`[JobQueue] Could not create BullMQ queue/worker for "${queueName}":`, { error: err.message });
    }
  }
}

/**
 * Dispatches a background job. If BullMQ + Redis is connected, pushes to queue.
 * Otherwise, executes asynchronously in-process without blocking caller.
 */
export async function dispatchJob<T = any>(
  queueName: string,
  jobName: string,
  data: T
): Promise<void> {
  const queue = registeredQueues.get(queueName);

  if (isRedisAvailable && queue) {
    try {
      await queue.add(jobName, data);
      logger.info(`[JobQueue] Dispatched job "${jobName}" to BullMQ queue "${queueName}"`);
      return;
    } catch (err: any) {
      logger.warn(`[JobQueue] Failed to push to BullMQ queue, executing in-memory:`, { error: err.message });
    }
  }

  // Graceful in-memory fallback
  const handler = inMemoryHandlers.get(queueName);
  if (handler) {
    setImmediate(async () => {
      try {
        logger.info(`[JobQueue] Running in-memory async job "${jobName}" for queue "${queueName}"`);
        await handler(data);
      } catch (err: any) {
        logger.error(`[JobQueue] In-memory job "${jobName}" failed:`, { error: err.message, stack: err.stack });
      }
    });
  } else {
    logger.warn(`[JobQueue] No handler registered for queue "${queueName}"`);
  }
}

/**
 * Gracefully shuts down all workers and connections on process exit.
 */
export async function closeJobQueues(): Promise<void> {
  for (const [name, worker] of registeredWorkers.entries()) {
    try {
      await worker.close();
      logger.info(`[JobQueue] Closed worker for "${name}"`);
    } catch (err: any) {
      logger.error(`[JobQueue] Error closing worker for "${name}":`, { error: err.message });
    }
  }

  for (const [name, queue] of registeredQueues.entries()) {
    try {
      await queue.close();
      logger.info(`[JobQueue] Closed queue for "${name}"`);
    } catch (err: any) {
      logger.error(`[JobQueue] Error closing queue for "${name}":`, { error: err.message });
    }
  }

  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (err: any) {
      // Ignore disconnect errors during shutdown
    }
  }
}
