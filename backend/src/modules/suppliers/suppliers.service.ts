import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../utils/errors.js';
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  UpsertSupplierProductInput,
} from './suppliers.schema.js';

const PRODUCT_INCLUDE = {
  productos: {
    include: { article: { select: { id: true, name: true, stock: true, stockMinimo: true } } },
    orderBy: { esPreferido: 'desc' as const },
  },
};

// Catalogo minimo de articulos para los selectores de Proveedores/Ordenes de
// compra: estos modulos son accesibles a los 3 roles bajo Plan Integral
// (ver requirePlan.ts), pero GET /api/articles esta restringido a
// Dev/Encargado (ver articles.routes.ts) - de ahi este endpoint propio en
// vez de reutilizar el de Articulos y Stock.
export function listArticlesCatalog() {
  return prisma.article.findMany({
    where: { active: true },
    select: { id: true, name: true, stock: true, stockMinimo: true },
    orderBy: { name: 'asc' },
  });
}

export function listSuppliers() {
  return prisma.proveedor.findMany({
    where: { active: true },
    include: PRODUCT_INCLUDE,
    orderBy: { nombre: 'asc' },
  });
}

export async function getSupplier(id: string) {
  const supplier = await prisma.proveedor.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
  if (!supplier) {
    throw new NotFoundError('Proveedor no encontrado');
  }
  return supplier;
}

export function createSupplier(input: CreateSupplierInput) {
  return prisma.proveedor.create({
    data: { ...input, email: input.email || undefined },
    include: PRODUCT_INCLUDE,
  });
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  await getSupplier(id);
  return prisma.proveedor.update({
    where: { id },
    data: { ...input, email: input.email || undefined },
    include: PRODUCT_INCLUDE,
  });
}

// Soft delete (mismo patron que Articulo): preserva el historial de ordenes
// de compra ya generadas con este proveedor.
export async function deleteSupplier(id: string) {
  await getSupplier(id);
  await prisma.proveedor.update({ where: { id }, data: { active: false } });
}

// Si se marca como preferido, desmarca los demas proveedores de ese mismo
// articulo para que "preferido" tenga un solo dueno por articulo (usado por
// PurchaseOrdersService.syncDraftForArticle para elegir a quien comprarle).
export async function upsertSupplierProduct(supplierId: string, input: UpsertSupplierProductInput) {
  await getSupplier(supplierId);

  return prisma.$transaction(async (tx) => {
    if (input.esPreferido) {
      await tx.proveedorProducto.updateMany({
        where: { articleId: input.articleId, proveedorId: { not: supplierId } },
        data: { esPreferido: false },
      });
    }

    return tx.proveedorProducto.upsert({
      where: { proveedorId_articleId: { proveedorId: supplierId, articleId: input.articleId } },
      create: {
        proveedorId: supplierId,
        articleId: input.articleId,
        precioCosto: input.precioCosto,
        tiempoEntregaDias: input.tiempoEntregaDias,
        esPreferido: input.esPreferido ?? false,
      },
      update: {
        precioCosto: input.precioCosto,
        tiempoEntregaDias: input.tiempoEntregaDias,
        esPreferido: input.esPreferido ?? false,
      },
    });
  });
}

export async function removeSupplierProduct(supplierId: string, articleId: string) {
  await getSupplier(supplierId);
  await prisma.proveedorProducto.deleteMany({ where: { proveedorId: supplierId, articleId } });
}

// Proveedores de un articulo, mas baratos/preferidos primero (ver punto 3
// del Plan Integral: sugerir proveedor al estar bajo stock minimo).
export function listSuppliersForArticle(articleId: string) {
  return prisma.proveedorProducto.findMany({
    where: { articleId, proveedor: { active: true } },
    include: { proveedor: true },
    orderBy: [{ esPreferido: 'desc' }, { precioCosto: 'asc' }],
  });
}
