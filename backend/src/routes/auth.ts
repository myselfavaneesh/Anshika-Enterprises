import express from 'express';
import { login, seedAdmin } from '../controllers/auth';

const router = express.Router();

router.post('/login', login);
router.post('/seed', seedAdmin);

export default router;
