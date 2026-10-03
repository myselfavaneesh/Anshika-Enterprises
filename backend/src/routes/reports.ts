import express from 'express';
import { 
  getGSTSummary, 
  getProfitAndLoss, 
  getSalesByCategory, 
  getSalesByProduct,
  getSalesByCustomer,
  getPurchasesBySupplier,
  getSalesRegister,
  getInventoryValuation,
  getStockAging,
  getPartyProfitability
} from '../controllers/reports';
import { authenticate, checkActive, requirePermission, forbidRole } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/gst-summary', requirePermission('reports:view'), getGSTSummary);
router.get('/profit-and-loss', requirePermission('reports:view'), forbidRole('staff'), getProfitAndLoss);
router.get('/sales-by-category', requirePermission('reports:view'), getSalesByCategory);
router.get('/sales-by-product', requirePermission('reports:view'), getSalesByProduct);
router.get('/sales-by-customer', requirePermission('reports:view'), getSalesByCustomer);
router.get('/purchases-by-supplier', requirePermission('reports:view'), getPurchasesBySupplier);
router.get('/sales-register', requirePermission('reports:view'), getSalesRegister);
router.get('/inventory-valuation', requirePermission('reports:view'), forbidRole('staff'), getInventoryValuation);
router.get('/stock-aging', requirePermission('reports:view'), getStockAging);
router.get('/party-profitability', requirePermission('reports:view'), forbidRole('staff'), getPartyProfitability);

export default router;
