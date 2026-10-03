import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getBusinessProfile,
  updateBusinessProfile,
  uploadProfileAsset,
} from '../controllers/businessProfile';

const router = Router();

// Business Profile endpoints
router.get('/business-profile', authenticate, getBusinessProfile);
router.put('/business-profile', authenticate, updateBusinessProfile);
router.post('/business-profile/upload', authenticate, uploadProfileAsset);

export default router;
