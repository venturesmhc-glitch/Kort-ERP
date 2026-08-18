import { z } from 'zod';

function optionalNonNegativeInt(message: string) {
  return z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : Number(value)),
    z.number().int().nonnegative(message).optional()
  );
}

export const articuloFormSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    descripcion: z.string().optional(),
    tipoProductoId: z.string().min(1, 'Selecciona un tipo de producto'),
    tipoProductoNombre: z.string().min(1),
    precio: z.coerce.number().nonnegative('El precio no puede ser negativo'),
    stockMinimo: optionalNonNegativeInt('El stock minimo no puede ser negativo'),
    stockCritico: optionalNonNegativeInt('El stock critico no puede ser negativo'),
    // Solo se usa al crear el articulo (el stock despues se ajusta con movimientos).
    stockInicial: optionalNonNegativeInt('El stock inicial no puede ser negativo'),
  })
  .refine(
    (data) =>
      data.stockCritico === undefined ||
      data.stockMinimo === undefined ||
      data.stockCritico < data.stockMinimo,
    { message: 'El stock critico debe ser menor al stock minimo', path: ['stockCritico'] }
  );

export type ArticuloFormValues = z.infer<typeof articuloFormSchema>;

export const movimientoFormSchema = z.object({
  tipo: z.enum(['ingreso', 'egreso']),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  motivo: z.string().optional(),
});

export type MovimientoFormValues = z.infer<typeof movimientoFormSchema>;
