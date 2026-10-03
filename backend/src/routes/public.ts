import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { 
  getPublicSale, 
  getPublicSalePDF, 
  getPublicQuotation, 
  getPublicQuotationPDF 
} from '../controllers/publicController';

const router = Router();

// Rate limit public endpoints to prevent enumeration or scraping (60 requests per minute per IP)
const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(publicLimiter);

router.get('/sales/:id', getPublicSale);
router.get('/sales/:id/invoice', getPublicSalePDF);
router.get('/sales/:id/pdf', getPublicSalePDF);
router.get('/quotations/:id', getPublicQuotation);
router.get('/quotations/:id/pdf', getPublicQuotationPDF);

export default router;
