import { Router } from 'express';
import * as products from '../controllers/product.controller.js';
import * as reviews from '../controllers/review.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema, productQuerySchema, productSchema } from '../validators/product.validators.js';
import { reviewSchema } from '../validators/review.validators.js';

const router = Router();
const adminOnly = [authenticate, authorize('admin')];

router.get('/', authenticate, validate(productQuerySchema, 'query'), products.list);
router.get('/:id', authenticate, validate(idParamSchema, 'params'), products.getById);
router.post('/', adminOnly, validate(productSchema), products.create);
router.put('/:id', adminOnly, validate(idParamSchema, 'params'), validate(productSchema), products.update);
router.delete('/:id', adminOnly, validate(idParamSchema, 'params'), products.remove);

router.get('/:id/reviews', authenticate, validate(idParamSchema, 'params'), reviews.byProduct);
router.post('/:id/reviews', authenticate, validate(idParamSchema, 'params'), validate(reviewSchema), reviews.create);

export default router;
