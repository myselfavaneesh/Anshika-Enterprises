import cron from 'node-cron';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

export const initBackupCron = () => {
  // Run everyday at midnight
  cron.schedule('0 0 * * *', () => {
    logger.info('Starting daily database backup...');
    
    // Use the MongoDB URI from env
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      logger.error('Cannot run backup: MONGODB_URI is not defined.');
      return;
    }

    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(backupDir, `backup-${timestamp}.gzip`);

    // Using mongodump to create a compressed archive
    const child = spawn('mongodump', [
      `--uri=${uri}`,
      `--archive=${archivePath}`,
      '--gzip'
    ]);

    child.stdout.on('data', (data) => {
      logger.info(`mongodump stdout: ${data}`);
    });

    child.stderr.on('data', (data) => {
      // mongodump writes progress to stderr
      logger.info(`mongodump progress: ${data}`);
    });

    child.on('error', (error) => {
      logger.error(`mongodump error: ${error.message}`);
    });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        logger.info(`Database backup completed successfully. Saved to ${archivePath}`);
      } else {
        logger.error(`mongodump process exited with code ${code} and signal ${signal}`);
      }
    });
  });
  
  logger.info('Database backup cron job initialized (runs daily at midnight).');
};
