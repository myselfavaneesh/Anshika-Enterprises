import express from 'express';
import {
  getStaffList,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  toggleStaffActive,
  getPermissionsList,
} from '../controllers/staff';
import { authenticate, isAdmin, checkActive } from '../middleware/auth';

const router = express.Router();

// All staff routes require authentication + admin role
router.use(authenticate);
router.use(checkActive);
router.use(isAdmin);

// Permission metadata (available permissions & role presets)
router.get('/permissions', getPermissionsList);

// Staff CRUD
router.get('/', getStaffList);
router.get('/:id', getStaffById);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);
router.patch('/:id/toggle-active', toggleStaffActive);

export default router;
