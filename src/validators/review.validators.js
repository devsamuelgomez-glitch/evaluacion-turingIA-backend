import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.number({ error: 'La calificación debe ser un número' }).int().min(1, 'Mínimo 1 estrella').max(5, 'Máximo 5 estrellas'),
  comment: z.string().trim().min(3, 'El comentario debe tener al menos 3 caracteres').max(500),
});

export const reviewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(3),
});
