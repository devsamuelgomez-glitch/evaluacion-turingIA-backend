import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  email: z.email('Correo inválido').trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72)
    .regex(/[A-Z]/, 'La contraseña debe incluir una mayúscula')
    .regex(/[0-9]/, 'La contraseña debe incluir un número'),
});

export const loginSchema = z.object({
  email: z.email('Correo inválido').trim().toLowerCase(),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
