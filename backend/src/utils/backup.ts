import cron from 'node-cron';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

export const initBackupCron = () => {
  // Run everyday at midnight
  cron.schedule('0 0 * * *', () => {
    logger.info('Starting daily PostgreSQL database backup...');
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      logger.error('Cannot run backup: DATABASE_URL is not defined.');
      return;
    }

    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(backupDir, `backup-${timestamp}.sql`);

    // Using pg_dump for PostgreSQL
    const child = spawn('pg_dump', [
      `--dbname=${dbUrl}`,
      `-f`, archivePath
    ]);

    child.stdout.on('data', (data) => {
      logger.info(`pg_dump stdout: ${data}`);
    });

    child.stderr.on('data', (data) => {
      logger.info(`pg_dump progress/notice: ${data}`);
    });

    child.on('error', (error) => {
      logger.error(`pg_dump error: ${error.message}. Ensure pg_dump is installed in system PATH.`);
    });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        logger.info(`PostgreSQL Database backup completed successfully. Saved to ${archivePath}`);
      } else {
        logger.error(`pg_dump process exited with code ${code} and signal ${signal}`);
      }
    });
  });
  
  logger.info('PostgreSQL database backup cron job initialized (runs daily at midnight).');
};

