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

const router = express.Router();

router.get('/gst-summary', getGSTSummary);
router.get('/profit-and-loss', getProfitAndLoss);
router.get('/sales-by-category', getSalesByCategory);
router.get('/sales-by-product', getSalesByProduct);
router.get('/sales-by-customer', getSalesByCustomer);
router.get('/purchases-by-supplier', getPurchasesBySupplier);
router.get('/sales-register', getSalesRegister);
router.get('/inventory-valuation', getInventoryValuation);
router.get('/stock-aging', getStockAging);
router.get('/party-profitability', getPartyProfitability);

export default router;
