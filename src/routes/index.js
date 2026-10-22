import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import * as catalog from '../controllers/catalog.controller.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.get('/categories', catalog.categories);
router.get('/brands', catalog.brands);

export default router;
