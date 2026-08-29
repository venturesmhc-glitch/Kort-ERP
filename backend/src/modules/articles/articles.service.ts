import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../utils/errors.js';
import { StockService } from './stock.service.js';
import { imageKeyFromUrl, storageService } from '../../lib/storage/storageService.js';
import type { UploadableFile } from '../../lib/storage/storageService.js';
import type { CreateArticleInput, CreateMovementInput, UpdateArticleInput } from './articles.schema.js';

const ARTICLE_INCLUDE = {
  tipoProducto: { select: { id: true, name: true } },
} satisfies Prisma.ArticleInclude;

export function listArticles() {
  return prisma.article.findMany({
    where: { active: true },
    include: ARTICLE_INCLUDE,
    orderBy: { name: 'asc' },
  });
}

export async function getArticle(id: string) {
  const article = await prisma.article.findUnique({ where: { id }, include: ARTICLE_INCLUDE });
  if (!article) {
    throw new NotFoundError('Articulo no encontrado');
  }
  return article;
}

async function assertTipoProducto(tipoProductoId: string) {
  const tipoProducto = await prisma.parameterItem.findUnique({ where: { id: tipoProductoId } });
  if (!tipoProducto || tipoProducto.deletedAt || !tipoProducto.active) {
    throw new NotFoundError('Tipo de producto no encontrado');
  }
}

export async function createArticle(input: CreateArticleInput) {
  await assertTipoProducto(input.tipoProductoId);

  const article = await prisma.article.create({
    data: {
      name: input.name,
      description: input.description,
      tipoProductoId: input.tipoProductoId,
      price: input.price,
      stockMinimo: input.stockMinimo,
      stockCritico: input.stockCritico,
      active: input.active ?? true,
      stock: 0,
    },
    include: ARTICLE_INCLUDE,
  });

  const initialStock = input.stock ?? 0;
  if (initialStock > 0) {
    await StockService.increaseStock(article.id, initialStock, 'Carga inicial');
    return getArticle(article.id);
  }

  return article;
}

export async function updateArticle(id: string, input: UpdateArticleInput) {
  await getArticle(id);

  if (input.tipoProductoId) {
    await assertTipoProducto(input.tipoProductoId);
  }

  return prisma.article.update({ where: { id }, data: input, include: ARTICLE_INCLUDE });
}

// Soft delete (mismo patron que Parametrizados): preserva el historial de
// StockMovement y permite reactivar el articulo mas adelante si hace falta.
export async function deleteArticle(id: string) {
  await getArticle(id);
  await prisma.article.update({ where: { id }, data: { active: false } });
}

// Ordenado por criticidad: primero los que ya cruzaron stockCritico (rojo),
// despues los que solo cruzaron stockMinimo (amarillo), cada grupo por stock
// ascendente. El nivel (bajo/critico) lo deriva el frontend comparando
// stock contra stockMinimo/stockCritico (ver DashboardPage).
//
// El umbral es stockMinimo, o stockCritico si no hay stockMinimo cargado
// (mismo criterio que PurchaseOrdersService.syncDraftForArticle y
// reports.service.ts nivelStock): un articulo con solo stockCritico
// configurado tiene que poder aparecer aca igual, si no el usuario nunca ve
// la alerta ni la chance de cargarle un proveedor para que la orden de
// compra automatica pueda armarse (antes el where excluia directamente
// cualquier articulo sin stockMinimo, aunque ya hubiera cruzado su
// stockCritico y hasta tuviera un borrador de orden de compra generado).
export async function listLowStock() {
  const articles = await prisma.article.findMany({
    where: {
      active: true,
      OR: [{ stockMinimo: { not: null } }, { stockCritico: { not: null } }],
    },
    include: ARTICLE_INCLUDE,
    orderBy: { stock: 'asc' },
  });
  const bajoUmbral = articles.filter((article) => {
    const threshold = article.stockMinimo ?? article.stockCritico;
    return threshold !== null && article.stock <= threshold;
  });
  const critico = bajoUmbral.filter(
    (article) => article.stockCritico !== null && article.stock <= article.stockCritico
  );
  const soloBajo = bajoUmbral.filter((article) => !critico.includes(article));
  return [...critico, ...soloBajo];
}

export async function createMovement(articleId: string, input: CreateMovementInput) {
  await getArticle(articleId);
  if (input.type === 'IN') {
    await StockService.increaseStock(articleId, input.quantity, input.reason);
  } else {
    await StockService.decreaseStock(articleId, input.quantity, input.reason);
  }
  // StockService devuelve el Article "pelado" (sin include); volvemos a leerlo
  // con la relacion tipoProducto para mantener la misma forma que el resto de
  // los endpoints del modulo.
  return getArticle(articleId);
}

export function listMovements(articleId: string) {
  return prisma.stockMovement.findMany({
    where: { articleId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function uploadArticleImage(articleId: string, file: UploadableFile) {
  const article = await getArticle(articleId);
  const previousKey = article.imageUrl ? imageKeyFromUrl(article.imageUrl) : null;

  const { url } = await storageService.uploadImage(file);
  const updated = await prisma.article.update({
    where: { id: articleId },
    data: { imageUrl: url },
    include: ARTICLE_INCLUDE,
  });

  if (previousKey) {
    await storageService.deleteImage(previousKey);
  }

  return updated;
}
