import { z } from 'zod';

// Reglas de validacion de Usuario compartidas entre backend y frontend, para
// que no diverjan con el tiempo (ver users.schema.ts en cada lado: cada uno
// arma su propio z.object() a partir de estas piezas, porque la forma final
// difiere - el form del frontend siempre manda "password" como string
// (vacio = sin cambios), el backend distingue creacion/edicion).
export const userBaseFields = {
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Ingresa un email valido'),
  role: z.enum(['DEV', 'ENCARGADO', 'BARBERO']),
  // Solo relevante quando role !== 'BARBERO' (un Barbero siempre puede
  // atender turnos); el backend fuerza esBarbero=true cuando role=BARBERO
  // sin importar lo que mande el form (ver users.service.ts).
  esBarbero: z.boolean().optional(),
  dni: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
};

export const userPasswordSchema = z
  .string()
  .min(6, 'La contrasena debe tener al menos 6 caracteres');
