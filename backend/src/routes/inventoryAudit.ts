import express from 'express';
import { 
  getAudits, 
  createAudit 
} from '../controllers/inventoryAudit';
import { authenticate, checkActive, requirePermission } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);
router.use(checkActive);

router.get('/', requirePermission('inventory:view'), getAudits);
router.post('/', requirePermission('inventory:edit'), createAudit);

export default router;
