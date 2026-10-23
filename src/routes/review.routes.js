import { Router } from 'express';
import * as reviews from '../controllers/review.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/product.validators.js';
import { reviewQuerySchema } from '../validators/review.validators.js';

const router = Router();

router.get('/', authenticate, validate(reviewQuerySchema, 'query'), reviews.latest);
router.delete('/:id', authenticate, validate(idParamSchema, 'params'), reviews.remove);

export default router;
