import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import type {
  CreateCategoryInput,
  CreateItemInput,
  ReorderItemsInput,
  UpdateCategoryInput,
  UpdateItemInput,
} from './catalogs.schema.js';

// Catalogos expuestos sin autenticacion (landing de turnos y tienda de merch).
// Sumar una key aca no requiere migracion, solo habilitar la lectura publica.
export const PUBLIC_CATALOG_KEYS = ['tipos-corte', 'tipos-producto'];

export function listCategories() {
  return prisma.parameterCategory.findMany({
    where: { deletedAt: null },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });
}

export async function getCategoryByKey(key: string) {
  const category = await prisma.parameterCategory.findFirst({
    where: { key, deletedAt: null },
  });
  if (!category) {
    throw new NotFoundError('Catalogo no encontrado');
  }
  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  const existing = await prisma.parameterCategory.findUnique({ where: { key: input.key } });
  if (existing) {
    throw new ConflictError('Ya existe un catalogo con esa clave');
  }
  return prisma.parameterCategory.create({ data: input });
}

export async function updateCategory(key: string, input: UpdateCategoryInput) {
  const category = await getCategoryByKey(key);
  return prisma.parameterCategory.update({ where: { id: category.id }, data: input });
}

export async function deleteCategory(key: string) {
  const category = await getCategoryByKey(key);
  if (category.isSystem) {
    throw new ConflictError('No se puede eliminar un catalogo del sistema');
  }

  const activeItemsCount = await prisma.parameterItem.count({
    where: { categoryId: category.id, deletedAt: null },
  });
  if (activeItemsCount > 0) {
    throw new ConflictError('No se puede eliminar un catalogo que tiene items');
  }

  await prisma.parameterCategory.update({
    where: { id: category.id },
    data: { deletedAt: new Date() },
  });
}

export async function listItems(key: string, includeInactive: boolean) {
  const category = await getCategoryByKey(key);
  return prisma.parameterItem.findMany({
    where: {
      categoryId: category.id,
      deletedAt: null,
      ...(includeInactive ? {} : { active: true }),
    },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });
}

export async function listPublicItems(key: string) {
  if (!PUBLIC_CATALOG_KEYS.includes(key)) {
    throw new NotFoundError('Catalogo no encontrado');
  }
  const items = await listItems(key, false);
  // precio solo tiene sentido para "tipos-corte" (ver comentario en schema.prisma
  // sobre el campo `price`), pero mapearlo siempre es inofensivo: el resto de
  // las categorias publicas (tipos-producto) simplemente no lo carga.
  return items.map((item) => ({ id: item.id, name: item.name, price: item.price ?? null }));
}

export async function createItem(key: string, input: CreateItemInput) {
  const category = await getCategoryByKey(key);

  const existing = await prisma.parameterItem.findFirst({
    where: { categoryId: category.id, name: input.name, deletedAt: null },
  });
  if (existing) {
    throw new ConflictError('Ya existe un item con ese nombre en este catalogo');
  }

  return prisma.parameterItem.create({
    data: { ...input, categoryId: category.id },
  });
}

async function getOwnedItem(key: string, itemId: string) {
  const category = await getCategoryByKey(key);
  const item = await prisma.parameterItem.findFirst({
    where: { id: itemId, categoryId: category.id, deletedAt: null },
  });
  if (!item) {
    throw new NotFoundError('Item no encontrado');
  }
  return item;
}

export async function updateItem(key: string, itemId: string, input: UpdateItemInput) {
  const item = await getOwnedItem(key, itemId);

  if (input.name) {
    const existing = await prisma.parameterItem.findFirst({
      where: { categoryId: item.categoryId, name: input.name, deletedAt: null },
    });
    if (existing && existing.id !== item.id) {
      throw new ConflictError('Ya existe un item con ese nombre en este catalogo');
    }
  }

  return prisma.parameterItem.update({ where: { id: item.id }, data: input });
}

export async function deleteItem(key: string, itemId: string) {
  const item = await getOwnedItem(key, itemId);
  await prisma.parameterItem.update({
    where: { id: item.id },
    data: { deletedAt: new Date(), active: false },
  });
}

export async function reorderItems(key: string, input: ReorderItemsInput) {
  const category = await getCategoryByKey(key);

  const items = await prisma.parameterItem.findMany({
    where: { categoryId: category.id, deletedAt: null, id: { in: input.items.map((i) => i.id) } },
  });
  if (items.length !== input.items.length) {
    throw new NotFoundError('Alguno de los items no pertenece a este catalogo');
  }

  await prisma.$transaction(
    input.items.map((item) =>
      prisma.parameterItem.update({ where: { id: item.id }, data: { order: item.order } })
    )
  );

  return listItems(key, true);
}
