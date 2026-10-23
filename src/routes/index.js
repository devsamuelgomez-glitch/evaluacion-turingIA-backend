import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import reviewRoutes from './review.routes.js';
import * as catalog from '../controllers/catalog.controller.js';
import * as images from '../controllers/image.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Everything except health and login/register requires a valid token
router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.get('/categories', authenticate, catalog.categories);
router.get('/brands', authenticate, catalog.brands);
router.use('/reviews', reviewRoutes);
router.get('/images', authenticate, authorize('admin'), images.list);

export default router;
