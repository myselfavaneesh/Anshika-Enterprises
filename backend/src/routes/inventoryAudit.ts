import express from 'express';
import { 
  getAudits, 
  createAudit 
} from '../controllers/inventoryAudit';

const router = express.Router();

router.get('/', getAudits);
router.post('/', createAudit);

export default router;
