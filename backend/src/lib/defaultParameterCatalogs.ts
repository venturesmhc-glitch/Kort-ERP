import { prisma } from './prisma.js';
import { getTenantId } from './tenantContext.js';

// Catalogos base que todo tenant nuevo necesita desde el dia uno: otros
// modulos los referencian por key de forma hardcodeada (ej.
// treasury.service.ts busca la categoria "categorias-ingresos" al registrar
// el ingreso de un corte/venta) y tiran si no existen. Usado tanto por el
// seed de desarrollo (prisma/seed.ts) como por el alta de un tenant nuevo
// (scripts/create-tenant.ts) para no duplicar esta lista en los dos lados.
export const DEFAULT_PARAMETER_CATALOGS = [
  {
    key: 'tipos-corte',
    name: 'Tipos de corte',
    items: [
      { name: 'Corte clasico' },
      { name: 'Fade' },
      { name: 'Diseno' },
      { name: 'Barba' },
      { name: 'Combo corte + barba' },
    ],
  },
  {
    key: 'tipos-producto',
    name: 'Tipos de producto',
    items: [{ name: 'Cosmetica' }, { name: 'Indumentaria' }, { name: 'Accesorios' }],
  },
  {
    key: 'categorias-costos',
    name: 'Categorias de costos',
    items: [
      { name: 'Alquiler', description: 'Costo fijo' },
      { name: 'Insumos', description: 'Costo variable' },
      { name: 'Servicios (luz, agua, internet)' },
      { name: 'Sueldos', description: 'Costo fijo' },
    ],
  },
  {
    key: 'categorias-ingresos',
    name: 'Categorias de ingresos',
    items: [{ name: 'Cortes' }, { name: 'Ventas merchandising' }, { name: 'Otros' }],
  },
];

export async function seedDefaultParameterCatalogs() {
  const tenantId = getTenantId();
  for (const [categoryOrder, catalog] of DEFAULT_PARAMETER_CATALOGS.entries()) {
    const category = await prisma.parameterCategory.upsert({
      where: { tenantId_key: { tenantId, key: catalog.key } },
      update: {},
      create: { tenantId, key: catalog.key, name: catalog.name, isSystem: true, order: categoryOrder },
    });

    for (const [itemOrder, item] of catalog.items.entries()) {
      await prisma.parameterItem.upsert({
        where: { categoryId_name: { categoryId: category.id, name: item.name } },
        update: {},
        create: { ...item, tenantId, categoryId: category.id, order: itemOrder },
      });
    }
  }
}
