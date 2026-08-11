import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import categoryRoutes from './routes/category';
import productRoutes from './routes/product';
import inventoryRoutes from './routes/inventory';
import customerRoutes from './routes/customer';
import supplierRoutes from './routes/supplier';
import saleRoutes from './routes/sale';
import quotationRoutes from './routes/quotationRoutes';
import dashboardRoutes from './routes/dashboard';
import paymentRoutes from './routes/payment';
import purchaseRoutes from './routes/purchase';
import returnRoutes from './routes/return';

import morgan from 'morgan';
import { logger } from './utils/logger';
import { initBackupCron } from './utils/backup';

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: { error: 'Too many requests, please slow down.' }
});
app.use('/api/', apiLimiter);

// HTTP Request Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

import prisma from './prisma';

// Database Connection Test
prisma.$connect()
  .then(() => {
    logger.info('Connected to PostgreSQL via Prisma');
  })
  .catch((err) => {
    logger.error('PostgreSQL connection error', { error: err.message, stack: err.stack });
  });


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});



// Serve frontend static files in production
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// Catch-all route for React Router
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Global Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled Exception', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

// Initialize Cron Jobs
initBackupCron();






