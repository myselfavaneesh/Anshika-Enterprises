import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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
import staffRoutes from './routes/staff';
import expenseRoutes from './routes/expense';
import reportsRoutes from './routes/reports';
import warehouseRoutes from './routes/warehouse';
import purchaseOrderRoutes from './routes/purchaseOrder';
import inventoryAuditRoutes from './routes/inventoryAudit';
import subscriptionRoutes from './routes/subscription';

import morgan from 'morgan';
import { logger } from './utils/logger';
import { initBackupCron } from './utils/backup';
import { initInventoryCron } from './utils/inventoryCron';

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
const defaultOrigins = ['http://localhost:5173', 'http://localhost:5000', 'http://localhost', 'capacitor://localhost'];

app.use(cors({
  origin: [...allowedOrigins, ...defaultOrigins],
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
app.use('/api/staff', staffRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/inventory-audits', inventoryAuditRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});



// Serve frontend static files in production if dist exists
const frontendPath = path.join(__dirname, '../../frontend/dist');
const indexPath = path.join(frontendPath, 'index.html');

if (fs.existsSync(indexPath)) {
  app.use(express.static(frontendPath));

  // Catch-all route for React Router
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(indexPath);
  });
} else {
  // Fallback when frontend dist is not present
  app.get('/', (_req, res) => {
    res.json({ message: 'Anshika Enterprises API is running', status: 'ok' });
  });

  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.status(404).json({ error: 'Endpoint not found' });
  });
}

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
initInventoryCron();






