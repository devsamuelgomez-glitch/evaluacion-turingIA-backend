import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('El id debe ser un entero positivo'),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  description: z.string().trim().max(1000).default(''),
  price: z.number({ error: 'El precio debe ser un número' }).nonnegative('El precio no puede ser negativo'),
  stock: z.number({ error: 'El stock debe ser un número' }).int().nonnegative('El stock no puede ser negativo'),
  image_url: z
    .union([z.url(), z.string().regex(/^\/images\/[\w\-/]+\.(webp|png|jpe?g)$/)], {
      error: 'La imagen debe ser una URL válida o una ruta /images/...',
    })
    .nullable()
    .optional(),
  category_id: z.number({ error: 'category_id es obligatorio' }).int().positive(),
  brand_id: z.number({ error: 'brand_id es obligatorio' }).int().positive(),
});

export const productQuerySchema = z.object({
  category: z.string().trim().optional(),
  brand: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(6),
});
